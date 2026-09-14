import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import {
  getAdminAuth,
  getAdminDb,
  getAdminStorage,
  isFirebaseAdminConfigured,
} from '@/lib/firebaseAdmin';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_UPLOADS_PER_HOUR = 10;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing auth token.' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    let callerUid: string;

    if (isFirebaseAdminConfigured()) {
      try {
        const decoded = await getAdminAuth().verifyIdToken(idToken);
        callerUid = decoded.uid;
      } catch {
        return NextResponse.json(
          { error: 'Unauthorized: Invalid or expired token.' },
          { status: 401 }
        );
      }
    } else {
      // Dev mode token fallback
      callerUid = 'dev_caller_' + crypto.createHash('md5').update(idToken).digest('hex').slice(0, 8);
    }

    const body = await req.json();
    const { orderId, imageData } = body as { orderId?: string; imageData?: string };

    if (!orderId || typeof orderId !== 'string' || !imageData || typeof imageData !== 'string') {
      return NextResponse.json(
        { error: 'Missing required fields: orderId and imageData are required.' },
        { status: 400 }
      );
    }

    // Sanitize orderId to prevent path traversal
    const sanitizedOrderId = orderId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!sanitizedOrderId) {
      return NextResponse.json(
        { error: 'Invalid orderId format.' },
        { status: 400 }
      );
    }

    // Extract Base64 buffer
    let buffer: Buffer;
    let mimeType = 'image/jpeg';

    if (imageData.startsWith('data:')) {
      const matches = imageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return NextResponse.json(
          { error: 'Invalid image data URI format.' },
          { status: 400 }
        );
      }
      mimeType = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(imageData, 'base64');
    }

    // Size check (< 5MB)
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File's too large, try a smaller image (must be under 5MB)." },
        { status: 400 }
      );
    }

    // MIME type check
    if (!mimeType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file format. Only image files are permitted.' },
        { status: 400 }
      );
    }

    // Firestore-based Rate Limiter: max 10 uploads per hour per user account
    if (isFirebaseAdminConfigured()) {
      const adminDb = getAdminDb();
      const rateLimitRef = adminDb.collection('uploadRateLimits').doc(callerUid);
      const now = Date.now();

      const rateLimitPassed = await adminDb.runTransaction(async (transaction) => {
        const snap = await transaction.get(rateLimitRef);
        if (!snap.exists) {
          transaction.set(rateLimitRef, {
            count: 1,
            windowStart: now,
            updatedAt: now,
          });
          return true;
        }

        const data = snap.data();
        const windowStart = Number(data?.windowStart || 0);
        const count = Number(data?.count || 0);

        if (now - windowStart > RATE_LIMIT_WINDOW_MS) {
          // Reset window
          transaction.update(rateLimitRef, {
            count: 1,
            windowStart: now,
            updatedAt: now,
          });
          return true;
        }

        if (count >= MAX_UPLOADS_PER_HOUR) {
          return false;
        }

        transaction.update(rateLimitRef, {
          count: count + 1,
          updatedAt: now,
        });
        return true;
      });

      if (!rateLimitPassed) {
        return NextResponse.json(
          {
            error:
              'Too many upload attempts. Please wait a bit before uploading again or ask your kitchen admin for help.',
          },
          { status: 429 }
        );
      }

      // Write to Firebase Storage at fixed, deterministic location: paymentProofs/${sanitizedOrderId}.jpg
      const storage = getAdminStorage();
      const bucketName =
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
        (storage as unknown as { app?: { options?: { storageBucket?: string } } }).app?.options?.storageBucket ||
        'newtown-express.firebasestorage.app';

      const bucket = storage.bucket(bucketName);
      const filePath = `paymentProofs/${sanitizedOrderId}.jpg`;
      const file = bucket.file(filePath);

      const downloadToken = crypto.randomUUID();

      await file.save(buffer, {
        metadata: {
          contentType: 'image/jpeg',
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
            uploadedBy: callerUid,
            orderId: sanitizedOrderId,
            uploadedAt: String(now),
          },
        },
      });

      // Public Firebase Storage URL with permanent download token
      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
        filePath
      )}?alt=media&token=${downloadToken}`;

      // If the order already exists in Firestore, update it
      try {
        const adminDb = getAdminDb();
        const orderRef = adminDb.collection('orders').doc(sanitizedOrderId);
        const orderSnap = await orderRef.get();
        if (orderSnap.exists) {
          await orderRef.update({
            paymentProofUrl: downloadUrl,
            status: 'PAYMENT_VERIFYING',
            statusUpdatedAt: FieldValue.serverTimestamp(),
          });
        }
      } catch (orderUpdateErr) {
        console.warn('[UPLOAD-PROOF] Order doc update warning:', orderUpdateErr);
      }

      return NextResponse.json({
        success: true,
        downloadUrl,
        filePath,
      });
    }

    // Dev fallback if Firebase Admin is unconfigured
    return NextResponse.json({
      success: true,
      downloadUrl: imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}`,
      isDevFallback: true,
    });
  } catch (err: unknown) {
    console.error('[UPLOAD-PROOF-ERROR]:', err);
    return NextResponse.json(
      { error: (err as Error)?.message || 'Failed to upload payment proof.' },
      { status: 500 }
    );
  }
}

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

      // Attempt to write to Firebase Storage with candidate buckets
      let downloadUrl: string | null = null;
      let uploadedFilePath: string | null = null;

      try {
        const storage = getAdminStorage();
        const configuredBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || 'newtown-express';

        // Candidate buckets to try in priority order
        const candidateBuckets = Array.from(
          new Set(
            [
              configuredBucket,
              `${projectId}.firebasestorage.app`,
              `${projectId}.appspot.com`,
              'newtown-express.firebasestorage.app',
              'newtown-express.appspot.com',
            ].filter(Boolean) as string[]
          )
        );

        const targetFilePath = `paymentProofs/${sanitizedOrderId}.jpg`;
        const downloadToken = crypto.randomUUID();

        let lastBucketErr: unknown = null;
        for (const bucketName of candidateBuckets) {
          try {
            const bucket = storage.bucket(bucketName);
            const file = bucket.file(targetFilePath);

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

            downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
              targetFilePath
            )}?alt=media&token=${downloadToken}`;
            uploadedFilePath = targetFilePath;
            break;
          } catch (bErr) {
            lastBucketErr = bErr;
            // Try next candidate bucket
          }
        }

        if (!downloadUrl && lastBucketErr) {
          console.warn(
            '[UPLOAD-PROOF] Firebase Storage bucket unavailable or not found. Falling back to inline compressed receipt proof:',
            (lastBucketErr as Error)?.message || lastBucketErr
          );
        }
      } catch (storageErr) {
        console.warn(
          '[UPLOAD-PROOF] Firebase Storage initialization error, falling back to inline proof:',
          (storageErr as Error)?.message || storageErr
        );
      }

      // If remote Firebase Storage bucket wasn't accessible (e.g. Firebase Spark free tier or uncreated bucket),
      // gracefully fallback to standard base64 data URI proof (~50KB) so orders are never blocked
      const finalDownloadUrl =
        downloadUrl ||
        (imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}`);

      // If the order already exists in Firestore, update it
      try {
        const adminDb = getAdminDb();
        const orderRef = adminDb.collection('orders').doc(sanitizedOrderId);
        const orderSnap = await orderRef.get();
        if (orderSnap.exists) {
          await orderRef.update({
            paymentProofUrl: finalDownloadUrl,
            status: 'PAYMENT_VERIFYING',
            statusUpdatedAt: FieldValue.serverTimestamp(),
          });
        }
      } catch (orderUpdateErr) {
        console.warn('[UPLOAD-PROOF] Order doc update warning:', orderUpdateErr);
      }

      return NextResponse.json({
        success: true,
        downloadUrl: finalDownloadUrl,
        filePath: uploadedFilePath || undefined,
        isStorageFallback: !downloadUrl,
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

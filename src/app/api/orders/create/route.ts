import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { INITIAL_MENU_ITEMS } from '@/lib/seedData';
import { MenuItem, OrderItem, SelectedAddon, OrderStatus } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing auth token.' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const callerUid = decodedToken.uid;
    const callerEmail = decodedToken.email || '';

    const body = await req.json();
    const { items, paymentProofUrl, idempotencyKey, paymentAudit } = body as {
      items: {
        itemId: string;
        selectedAddons?: { groupName: string; optionName: string }[];
        quantity: number;
      }[];
      paymentProofUrl?: string;
      idempotencyKey?: string;
      paymentAudit?: any;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order must contain at least one item.' }, { status: 400 });
    }

    const adminDb = getAdminDb();

    // Check for duplicate payment screenshot hash
    let finalPaymentAudit = paymentAudit || null;
    if (finalPaymentAudit?.imageHash && typeof finalPaymentAudit.imageHash === 'string') {
      try {
        const dupSnap = await adminDb
          .collection('orders')
          .where('paymentAudit.imageHash', '==', finalPaymentAudit.imageHash)
          .limit(1)
          .get();
        if (!dupSnap.empty) {
          const matchedDoc = dupSnap.docs[0];
          finalPaymentAudit = {
            ...finalPaymentAudit,
            isDuplicate: true,
            duplicateOrderId: matchedDoc.id,
          };
        }
      } catch (err) {
        console.warn('[ORDER-CREATE] Duplicate hash check skipped:', err);
      }
    }

    // Fetch authoritative menu catalog (seedData + Firestore overrides)
    const menuMap = new Map<string, MenuItem>();
    for (const item of INITIAL_MENU_ITEMS) {
      menuMap.set(item.id, item);
    }
    try {
      const dbMenuSnaps = await adminDb.collection('menuItems').get();
      dbMenuSnaps.forEach((doc) => {
        menuMap.set(doc.id, { id: doc.id, ...doc.data() } as MenuItem);
      });
    } catch (err) {
      console.warn('[ORDER-CREATE] Could not read firestore menuItems, using seed data:', err);
    }

    // Recompute base prices & all addon price/calorie deltas from authoritative catalog
    const validatedItems: OrderItem[] = [];
    let calculatedTotalAmount = 0;
    let calculatedTotalCalories = 0;

    for (const requestedItem of items) {
      const catalogItem = menuMap.get(requestedItem.itemId);
      if (!catalogItem) {
        return NextResponse.json(
          { error: `Item with ID "${requestedItem.itemId}" does not exist in the menu.` },
          { status: 400 }
        );
      }

      if (catalogItem.isAvailable === false) {
        return NextResponse.json(
          { error: `"${catalogItem.name}" is currently sold out and unavailable.` },
          { status: 400 }
        );
      }

      const quantity = Math.max(1, Math.floor(Number(requestedItem.quantity) || 1));

      // Strictly recompute addons from catalog definition (never trust client deltas)
      const validatedAddons: SelectedAddon[] = [];
      let addonsPriceDelta = 0;
      let addonsCalorieDelta = 0;

      if (Array.isArray(requestedItem.selectedAddons) && catalogItem.addonGroups) {
        for (const reqAddon of requestedItem.selectedAddons) {
          const group = catalogItem.addonGroups.find((g) => g.groupName === reqAddon.groupName);
          if (group) {
            const option = group.options.find((o) => o.name === reqAddon.optionName);
            if (option) {
              validatedAddons.push({
                groupName: group.groupName,
                optionName: option.name,
                priceDelta: option.priceDelta,
                calorieDelta: option.calorieDelta || 0,
              });
              addonsPriceDelta += option.priceDelta;
              addonsCalorieDelta += (option.calorieDelta || 0);
            }
          }
        }
      }

      const unitPrice = catalogItem.price + addonsPriceDelta;
      const unitCalories = catalogItem.calories + addonsCalorieDelta;
      const lineTotal = unitPrice * quantity;
      const lineCalories = unitCalories * quantity;

      calculatedTotalAmount += lineTotal;
      calculatedTotalCalories += lineCalories;

      validatedItems.push({
        itemId: catalogItem.id,
        name: catalogItem.name,
        basePrice: catalogItem.price,
        baseCalories: catalogItem.calories,
        selectedAddons: validatedAddons,
        lineTotal,
        lineCalories,
        quantity,
      });
    }

    // Fetch user profile info
    const userSnap = await adminDb.collection('users').doc(callerUid).get();
    const userData = userSnap.exists ? userSnap.data() : null;
    const employeeName = userData?.displayName || decodedToken.name || callerEmail.split('@')[0] || 'Employee';
    const seatCode = userData?.seatCode || 'Desk N/A';

    const orderId = `order_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const initialStatus: OrderStatus = paymentProofUrl ? 'PAYMENT_VERIFYING' : 'PLACED';

    const kitchenRef = adminDb.collection('appConfig').doc('kitchenStatus');
    const orderRef = adminDb.collection('orders').doc(orderId);
    const safeKey = idempotencyKey ? crypto.createHash('sha256').update(`${callerUid}_${idempotencyKey}`).digest('hex') : null;
    const idempRef = safeKey ? adminDb.collection('idempotencyKeys').doc(safeKey) : null;

    // Execute atomic transaction for kitchen status check, idempotency check & order creation
    const txResult = await adminDb.runTransaction(async (transaction) => {
      // 1. Check idempotency
      if (idempRef) {
        const idempSnap = await transaction.get(idempRef);
        if (idempSnap.exists) {
          const prev = idempSnap.data()!;
          return {
            isDuplicate: true,
            orderId: prev.orderId as string,
            totalAmount: prev.totalAmount as number,
            totalCalories: prev.totalCalories as number,
            status: prev.status as OrderStatus,
          };
        }
      }

      // 2. Check kitchen status
      const kitchenSnap = await transaction.get(kitchenRef);
      if (kitchenSnap.exists) {
        const kitchenData = kitchenSnap.data();
        if (kitchenData?.isOpen === false) {
          const closedError = new Error('Kitchen is currently closed.');
          (closedError as any).statusCode = 409;
          (closedError as any).closedMessage = kitchenData.closedMessage || 'Kitchen is closed to new orders.';
          throw closedError;
        }
      }

      // 3. Write order document
      const now = Date.now();
      const orderDocData = {
        id: orderId,
        employeeId: callerUid,
        employeeName,
        seatCode,
        items: validatedItems,
        totalAmount: calculatedTotalAmount,
        totalCalories: calculatedTotalCalories,
        paymentProofUrl: paymentProofUrl || '',
        status: initialStatus,
        rejectionReason: null,
        createdAt: FieldValue.serverTimestamp(),
        statusUpdatedAt: FieldValue.serverTimestamp(),
        ringingSince: FieldValue.serverTimestamp(),
        queuedAt: null,
        statusHistory: [
          {
            status: initialStatus,
            timestamp: now,
            actorUid: callerUid,
          },
        ],
        idempotencyKey: idempotencyKey || null,
        paymentAudit: finalPaymentAudit,
      };

      transaction.set(orderRef, orderDocData);

      if (idempRef) {
        transaction.set(idempRef, {
          orderId,
          employeeId: callerUid,
          totalAmount: calculatedTotalAmount,
          totalCalories: calculatedTotalCalories,
          status: initialStatus,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      return {
        isDuplicate: false,
        orderId,
        totalAmount: calculatedTotalAmount,
        totalCalories: calculatedTotalCalories,
        status: initialStatus,
      };
    });

    // 4. Non-blocking fire-and-forget push notification
    try {
      const origin = req.nextUrl.origin;
      fetch(`${origin}/api/notify-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: txResult.orderId,
          seatCode,
          employeeName,
          totalAmount: txResult.totalAmount,
        }),
      }).catch((e) => console.warn('[NOTIFY-ADMIN] Fire-and-forget notice error:', e));
    } catch {}

    return NextResponse.json({
      success: true,
      orderId: txResult.orderId,
      totalAmount: txResult.totalAmount,
      totalCalories: txResult.totalCalories,
      status: txResult.status,
      isDuplicate: txResult.isDuplicate,
    });
  } catch (err: unknown) {
    console.error('[CREATE-ORDER] Error:', err);
    const anyErr = err as any;
    if (anyErr?.statusCode === 409) {
      return NextResponse.json(
        {
          error: anyErr.message || 'Kitchen is currently closed.',
          closedMessage: anyErr.closedMessage || 'Kitchen is closed to new orders.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: (err as Error).message || 'Failed to place order.' },
      { status: 500 }
    );
  }
}

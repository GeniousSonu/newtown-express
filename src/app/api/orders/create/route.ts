import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { INITIAL_MENU_ITEMS } from '@/lib/seedData';
import { MenuItem, OrderItem, SelectedAddon, OrderStatus } from '@/types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
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

    const adminDb = getAdminDb();

    // 1. Check appConfig/kitchenStatus.isOpen
    const kitchenSnap = await adminDb.collection('appConfig').doc('kitchenStatus').get();
    if (kitchenSnap.exists) {
      const kitchenData = kitchenSnap.data();
      if (kitchenData?.isOpen === false) {
        return NextResponse.json(
          {
            error: 'Kitchen is currently closed.',
            closedMessage: kitchenData.closedMessage || 'Kitchen is closed to new orders.',
          },
          { status: 409 }
        );
      }
    }

    const body = await req.json();
    const { items, paymentProofUrl, idempotencyKey } = body as {
      items: {
        itemId: string;
        selectedAddons?: { groupName: string; optionName: string }[];
        quantity: number;
      }[];
      paymentProofUrl?: string;
      idempotencyKey?: string;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order must contain at least one item.' }, { status: 400 });
    }

    // 2. Fetch authoritative menu catalog (seedData + Firestore overrides)
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

    // 3. Re-calculate authoritative prices and calories server-side
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

      if (!catalogItem.isAvailable) {
        return NextResponse.json(
          { error: `"${catalogItem.name}" is currently sold out or unavailable.` },
          { status: 400 }
        );
      }

      const quantity = Math.max(1, Math.floor(Number(requestedItem.quantity) || 1));

      // Validate addons against catalog
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
              addonsCalorieDelta += option.calorieDelta || 0;
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

    // 4. Fetch caller user document for seatCode and name
    const userSnap = await adminDb.collection('users').doc(callerUid).get();
    const userData = userSnap.exists ? userSnap.data() : null;
    const employeeName = userData?.displayName || decodedToken.name || callerEmail.split('@')[0] || 'Employee';
    const seatCode = userData?.seatCode || 'Desk N/A';

    const orderId = `order_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
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
      status: 'PAYMENT_VERIFYING' as OrderStatus,
      rejectionReason: null,
      createdAt: FieldValue.serverTimestamp(),
      statusUpdatedAt: FieldValue.serverTimestamp(),
      ringingSince: FieldValue.serverTimestamp(),
      queuedAt: null,
      statusHistory: [
        {
          status: 'PAYMENT_VERIFYING',
          timestamp: now,
          actorUid: callerUid,
        },
      ],
      idempotencyKey: idempotencyKey || null,
    };

    await adminDb.collection('orders').doc(orderId).set(orderDocData);

    // Trigger push notification to admins (non-blocking)
    try {
      const origin = req.nextUrl.origin;
      fetch(`${origin}/api/notify-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          seatCode,
          employeeName,
          totalAmount: calculatedTotalAmount,
        }),
      }).catch((e) => console.warn('[NOTIFY-ADMIN] Call error:', e));
    } catch {}

    return NextResponse.json({
      success: true,
      orderId,
      totalAmount: calculatedTotalAmount,
      totalCalories: calculatedTotalCalories,
      status: 'PAYMENT_VERIFYING',
    });
  } catch (err: unknown) {
    console.error('[CREATE-ORDER] Unexpected error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to place order.' },
      { status: 500 }
    );
  }
}

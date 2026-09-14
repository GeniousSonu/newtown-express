'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Order, OrderStatus, OrderItem, PaymentAuditInfo } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocsFromServer,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { formatInTimeZone } from 'date-fns-tz';
import { startLoudAlertLoop, stopLoudAlertLoop, playChimeTone } from '@/lib/sound';
import { toValidMillis } from '@/lib/utils';
import { setCachedData, getCachedData, CACHE_KEYS } from '@/lib/cache';
import { notifyOrderStatusChange } from '@/lib/orderNotifications';
import { useAuth } from './AuthContext';

function parseOrderDoc(id: string, raw: Record<string, unknown>): Order {
  return {
    ...raw,
    id,
    createdAt: toValidMillis(raw?.createdAt),
    statusUpdatedAt: raw?.statusUpdatedAt ? toValidMillis(raw.statusUpdatedAt) : toValidMillis(raw?.createdAt),
    queuedAt: raw?.queuedAt ? toValidMillis(raw.queuedAt) : null,
    ringingSince: raw?.ringingSince ? toValidMillis(raw.ringingSince) : null,
  } as Order;
}

interface OrderContextType {
  orders: Order[];
  activeAlertOrder: Order | null;
  dismissAlert: () => void;
  forceResyncQueue: () => Promise<void>;
  dismissStaleAlert: (orderId: string) => Promise<void>;
  placeOrder: (
    items: OrderItem[],
    totalAmount: number,
    paymentProofUrl: string,
    idempotencyKey: string,
    paymentAudit?: PaymentAuditInfo
  ) => Promise<string>;
  updateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    rejectionReason?: string
  ) => Promise<void>;
  confirmDelivery: (orderId: string) => Promise<void>;
  reportMissingDelivery: (orderId: string) => Promise<void>;
  cancelOrder: (orderId: string, reason?: string) => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const { user, getIdToken } = useAuth();
  const [orders, setOrders] = useState<Order[]>(() => {
    if (typeof window !== 'undefined' && user?.uid) {
      const cached = getCachedData<Order[]>(CACHE_KEYS.ORDERS(user.uid));
      if (cached?.data && Array.isArray(cached.data)) {
        return cached.data;
      }
    }
    return [];
  });
  const [activeAlertOrder, setActiveAlertOrder] = useState<Order | null>(null);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const prevStatusMapRef = useRef<Map<string, OrderStatus>>(new Map());
  const isInitialLoadRef = useRef(true);

  // Load orders strictly from Firestore
  useEffect(() => {
    if (!db || !user) {
      queueMicrotask(() => {
        setOrders([]);
      });
      isInitialLoadRef.current = false;
      return;
    }

    try {
      // Kitchen staff (admin & kitchenManager) listen to all orders; Employees query their own
      const isStaff = user.role === 'admin' || user.role === 'kitchenManager';
      const ordersQuery = isStaff
        ? query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
        : query(
            collection(db, 'orders'),
            where('employeeId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );

      let fallbackUnsubscribe: (() => void) | null = null;

      const unsubscribe = onSnapshot(
        ordersQuery,
        (snapshot) => {
          // 1. Inspect docChanges specifically for removals, additions, or status transitions
          snapshot.docChanges().forEach((change) => {
            const orderData = parseOrderDoc(change.doc.id, change.doc.data() as Record<string, unknown>);

            if (change.type === 'removed') {
              knownOrderIdsRef.current.delete(orderData.id);
              prevStatusMapRef.current.delete(orderData.id);
              // If this removed order is the active alert, immediately clear it and stop siren!
              setActiveAlertOrder((prev) => {
                if (prev?.id === orderData.id) {
                  stopLoudAlertLoop();
                  return null;
                }
                return prev;
              });
            } else if (change.type === 'added') {
              // Populate status history
              if (isInitialLoadRef.current) {
                prevStatusMapRef.current.set(orderData.id, orderData.status);
              } else {
                prevStatusMapRef.current.set(orderData.id, orderData.status);

                // Trigger kitchen alarm if a new order is received for staff
                if (
                  !knownOrderIdsRef.current.has(orderData.id) &&
                  isStaff &&
                  ['PLACED', 'PAYMENT_VERIFYING', 'PAYMENT_VERIFIED'].includes(orderData.status)
                ) {
                  setActiveAlertOrder(orderData);
                  startLoudAlertLoop();

                  if (
                    typeof window !== 'undefined' &&
                    'Notification' in window &&
                    Notification.permission === 'granted'
                  ) {
                    const unhandledCount = snapshot.docs.filter((d) => {
                      const s = d.data()?.status;
                      return ['PLACED', 'PAYMENT_VERIFYING', 'PAYMENT_VERIFIED'].includes(s);
                    }).length;

                    const notifTitle =
                      unhandledCount > 1
                        ? `🚨 ${unhandledCount} Orders Waiting!`
                        : `🚨 New Order #${orderData.id.slice(-4)} (${orderData.seatCode})`;

                    const notifBody =
                      unhandledCount > 1
                        ? `${unhandledCount} orders waiting — tap to view`
                        : `${orderData.employeeName} ordered ${orderData.items.length} item(s) • Desk ${orderData.seatCode}`;

                    new Notification(notifTitle, {
                      body: notifBody,
                      icon: '/icon-192.png',
                      tag: `kitchen_order_${orderData.id}`,
                    });
                  }
                }
              }
              knownOrderIdsRef.current.add(orderData.id);
            } else if (change.type === 'modified') {
              const oldStatus = prevStatusMapRef.current.get(orderData.id) || null;

              if (oldStatus && oldStatus !== orderData.status) {
                // Deliver step-by-step real-time notification to the employee who placed the order
                if (orderData.employeeId === user.uid) {
                  notifyOrderStatusChange(orderData, oldStatus);
                }
                prevStatusMapRef.current.set(orderData.id, orderData.status);
              } else if (!oldStatus) {
                prevStatusMapRef.current.set(orderData.id, orderData.status);
              }

              // If status moved to non-alerting state (ACCEPTED, COOKING, READY, SERVED, COMPLETED, REJECTED, CANCELLED), clear active alert immediately!
              const ALERTING_STATUSES: OrderStatus[] = ['PLACED', 'PAYMENT_VERIFYING', 'PAYMENT_VERIFIED'];
              if (!ALERTING_STATUSES.includes(orderData.status)) {
                setActiveAlertOrder((prev) => {
                  if (prev?.id === orderData.id) {
                    return null;
                  }
                  return prev;
                });
              }
            }
          });

          // 2. Pure, full replacement of current orders snapshot
          const loadedOrders: Order[] = snapshot.docs.map((docSnap) =>
            parseOrderDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
          );
          setOrders(loadedOrders);

          // Populate tracking maps on initial load
          if (isInitialLoadRef.current) {
            loadedOrders.forEach((o) => {
              prevStatusMapRef.current.set(o.id, o.status);
              knownOrderIdsRef.current.add(o.id);
            });
            isInitialLoadRef.current = false;
          }

          // Cache in client storage
          if (user?.uid) {
            setCachedData(CACHE_KEYS.ORDERS(user.uid), loadedOrders, 10 * 60 * 1000);
          }

          // 3. Post-snapshot reconciliation (runs on EVERY snapshot and reconnect):
          // Check whether loadedOrders contains ANY unhandled orders requiring an alarm siren
          const ALERTING_STATUSES: OrderStatus[] = ['PLACED', 'PAYMENT_VERIFYING', 'PAYMENT_VERIFIED'];
          const nowTime = Date.now();
          const hasAnyAlerting = isStaff && loadedOrders.some((o) => {
            if (o.dismissedAsStale) return false;
            if (ALERTING_STATUSES.includes(o.status)) return true;
            if (o.status === 'QUEUED' && (nowTime - (o.queuedAt || o.createdAt || 0) > 3 * 60 * 1000)) return true;
            return false;
          });

          if (!hasAnyAlerting) {
            stopLoudAlertLoop();
            setActiveAlertOrder(null);
          } else {
            setActiveAlertOrder((prev) => {
              if (!prev) return null;
              const liveMatch = loadedOrders.find((o) => o.id === prev.id);
              const isStillAlerting = liveMatch && !liveMatch.dismissedAsStale && (
                ALERTING_STATUSES.includes(liveMatch.status) ||
                (liveMatch.status === 'QUEUED' && (nowTime - (liveMatch.queuedAt || liveMatch.createdAt || 0) > 3 * 60 * 1000))
              );
              if (!isStillAlerting) {
                return null;
              }
              return liveMatch;
            });
          }

          isInitialLoadRef.current = false;
        },
        (error: unknown) => {
          console.warn('[ORDERS] Firestore subscription error:', error);
          const firestoreErr = error as { code?: string };
          // If composite index is building or missing, fallback to where without orderBy and sort in memory
          if (!isStaff && firestoreErr?.code === 'failed-precondition' && db) {
            console.info('[ORDERS] Using in-memory sort fallback while composite index builds...');
            const fallbackQuery = query(
              collection(db, 'orders'),
              where('employeeId', '==', user.uid)
            );
            fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              (snap) => {
                const list: Order[] = [];
                snap.forEach((d) => list.push(parseOrderDoc(d.id, d.data() as Record<string, unknown>)));
                list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                setOrders(list);
                if (user?.uid) {
                  setCachedData(CACHE_KEYS.ORDERS(user.uid), list, 10 * 60 * 1000);
                }
                isInitialLoadRef.current = false;
              },
              (err2) => {
                console.error('[ORDERS] Fallback listener error:', err2);
                isInitialLoadRef.current = false;
              }
            );
          } else {
            isInitialLoadRef.current = false;
          }
        }
      );

      return () => {
        unsubscribe();
        if (fallbackUnsubscribe) {
          fallbackUnsubscribe();
        }
      };
    } catch (err) {
      console.error('[ORDERS] Could not initialize Firestore listener:', err);
      isInitialLoadRef.current = false;
    }
  }, [user]);

  // Request Notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const dismissAlert = useCallback(() => {
    stopLoudAlertLoop();
    setActiveAlertOrder(null);
  }, []);

  const placeOrder = async (
    items: OrderItem[],
    totalAmount: number,
    paymentProofUrl: string,
    idempotencyKey: string,
    paymentAudit?: PaymentAuditInfo
  ): Promise<string> => {
    if (!user) throw new Error('User must be logged in to place order');

    const token = await getIdToken(true);

    // Pre-allocate client order ID so upload and creation correlate deterministically
    const preOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    let finalProofUrl = paymentProofUrl;

    // If paymentProofUrl is a base64 image data URI, attempt server-side upload to Storage
    if (paymentProofUrl && paymentProofUrl.startsWith('data:image/')) {
      try {
        const uploadRes = await fetch('/api/orders/upload-proof', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            orderId: preOrderId,
            imageData: paymentProofUrl,
          }),
        });

        const uploadJson = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) {
          if (uploadRes.status === 429) {
            throw new Error('Too many upload attempts. Please wait a bit before uploading again or ask your kitchen admin for help.');
          }
          console.warn('[ORDER-PLACE] Payment proof upload endpoint notice:', uploadJson?.error);
          // Fall back to client canvas-compressed data URI so order creation succeeds
          finalProofUrl = paymentProofUrl;
        } else if (uploadJson?.downloadUrl) {
          finalProofUrl = uploadJson.downloadUrl;
        }
      } catch (uploadErr) {
        if ((uploadErr as Error)?.message?.includes('Too many upload attempts')) {
          throw uploadErr;
        }
        console.warn('[ORDER-PLACE] Upload-proof non-fatal error, proceeding with inline receipt proof:', uploadErr);
        finalProofUrl = paymentProofUrl;
      }
    }

    const res = await fetch('/api/orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        orderId: preOrderId,
        items: items.map((it) => ({
          itemId: it.itemId,
          quantity: it.quantity,
          selectedAddons: it.selectedAddons.map((a) => ({
            groupName: a.groupName,
            optionName: a.optionName,
          })),
        })),
        paymentProofUrl: finalProofUrl,
        idempotencyKey,
        paymentAudit,
      }),
    });

    const text = await res.text();
    let data: { error?: string; closedMessage?: string; orderId?: string } | null = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {}

    if (!res.ok) {
      if (res.status === 409) {
        throw new Error(data?.closedMessage || data?.error || 'Kitchen is currently closed to new orders.');
      }
      throw new Error(data?.error || `Failed to place order (${res.status})`);
    }

    playChimeTone();
    return data?.orderId || '';
  };

  const recordOrderCalories = useCallback(
    async (orderId: string, employeeId: string, calories: number) => {
      if (!db || !employeeId || calories <= 0) return;
      try {
        const todayIST = formatInTimeZone(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
        const intakeRef = doc(db, 'dailyIntake', `${employeeId}_${todayIST}`);
        const userRef = doc(db, 'users', employeeId);

        const intakeSnap = await getDoc(intakeRef);
        const existingOrderIds = (intakeSnap.data()?.orderIds as string[]) || [];

        if (!existingOrderIds.includes(orderId)) {
          await setDoc(
            intakeRef,
            {
              uid: employeeId,
              date: todayIST,
              totalCalories: increment(calories),
              orderIds: arrayUnion(orderId),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          await setDoc(
            userRef,
            {
              totalCaloriesConsumed: increment(calories),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
      } catch (err) {
        console.warn('[CALORIES] Calorie recording warning:', err);
      }
    },
    []
  );

  const updateOrderStatus = async (
    orderId: string,
    status: OrderStatus,
    rejectionReason?: string
  ) => {
    if (!user) {
      throw new Error('Authentication required to update order status');
    }

    const targetOrder = orders.find((o) => o.id === orderId);
    const token = await getIdToken(true);
    const res = await fetch('/api/orders/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        orderId,
        status,
        rejectionReason,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 409 && data.code === 'ALREADY_HANDLED') {
        const err = new Error(data.error || 'This order was already accepted by another staff member.');
        (err as unknown as { code: string }).code = 'ALREADY_HANDLED';
        throw err;
      }
      throw new Error(data.error || 'Failed to update order status');
    }

    // Client fallback & optimistic sync when dev fallback is returned
    if (db && data.isDevFallback) {
      try {
        const orderRef = doc(db, 'orders', orderId);
        const patch: Record<string, unknown> = {
          status,
          statusUpdatedAt: serverTimestamp(),
          deliveryReportedMissing: false,
        };
        if (rejectionReason) patch.rejectionReason = rejectionReason;
        if (status === 'SERVED') {
          patch.deliveryConfirmed = true;
          patch.deliveryConfirmedAt = Date.now();
        }
        await updateDoc(orderRef, patch);
      } catch (clientErr) {
        console.warn('[ORDERS] Client fallback update notice:', clientErr);
      }
    }

    // Credit calories immediately when transitioning to SERVED or COMPLETED
    if (status === 'SERVED' || status === 'COMPLETED') {
      const empId = targetOrder?.employeeId || user.uid;
      const cals = targetOrder?.totalCalories || 0;
      if (cals > 0) {
        await recordOrderCalories(orderId, empId, cals);
      }
    }
  };

  const confirmDelivery = async (orderId: string) => {
    if (!user) {
      throw new Error('Authentication required to confirm delivery');
    }

    const targetOrder = orders.find((o) => o.id === orderId);
    const token = await getIdToken(true);
    const res = await fetch('/api/orders/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        orderId,
        status: 'SERVED',
        isConfirmDelivery: true,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to confirm delivery');
    }

    // Immediately update order doc client-side
    if (db) {
      try {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
          status: 'SERVED',
          deliveryConfirmed: true,
          deliveryConfirmedAt: Date.now(),
          deliveryReportedMissing: false,
          statusUpdatedAt: serverTimestamp(),
        });
      } catch (clientErr) {
        console.warn('[ORDERS] Client delivery confirmation notice:', clientErr);
      }
    }

    // Guarantee calories are recorded in dailyIntake & user profile
    const empId = targetOrder?.employeeId || user.uid;
    const cals = targetOrder?.totalCalories || 0;
    if (cals > 0) {
      await recordOrderCalories(orderId, empId, cals);
    }
  };

  const reportMissingDelivery = async (orderId: string) => {
    if (!user) {
      throw new Error('Authentication required to report delivery issue');
    }

    const token = await getIdToken(true);
    const res = await fetch('/api/orders/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        orderId,
        isReportMissing: true,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to report delivery issue');
    }
  };

  const cancelOrder = async (orderId: string, reason?: string) => {
    if (!user) {
      throw new Error('Authentication required to cancel order');
    }

    const token = await getIdToken(true);
    const res = await fetch('/api/orders/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        orderId,
        reason,
      }),
    });

    const text = await res.text();
    let data: { error?: string } | null = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {}

    if (!res.ok) {
      throw new Error(data?.error || `Failed to cancel order (${res.status})`);
    }
  };

  const getOrderById = (orderId: string) => {
    return orders.find((o) => o.id === orderId);
  };

  const forceResyncQueue = useCallback(async () => {
    if (!db || !user) return;
    try {
      const isStaff = user.role === 'admin' || user.role === 'kitchenManager';
      const ordersQuery = isStaff
        ? query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
        : query(
            collection(db, 'orders'),
            where('employeeId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );

      // Explicitly fetch fresh data from server to bypass local IndexedDB cache!
      const snap = await getDocsFromServer(ordersQuery);
      const freshOrders = snap.docs.map((d) =>
        parseOrderDoc(d.id, d.data() as Record<string, unknown>)
      );
      setOrders(freshOrders);

      // If fresh result set has no unhandled orders, explicitly stop alarm sound
      const unhandled = freshOrders.filter((o) =>
        ['PLACED', 'PAYMENT_VERIFYING', 'PAYMENT_VERIFIED'].includes(o.status)
      );
      if (unhandled.length === 0) {
        stopLoudAlertLoop();
        setActiveAlertOrder(null);
      }
    } catch (err) {
      console.warn('[ORDERS] forceResyncQueue error:', err);
    }
  }, [user]);

  const dismissStaleAlert = useCallback(async (orderId: string) => {
    if (!user) {
      throw new Error('Authentication required to dismiss stale alarm');
    }

    const token = await getIdToken();
    const res = await fetch('/api/orders/dismiss-stale', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to dismiss stale alarm.');
    }

    // Server confirmed order is terminal and marked dismissed: clear locally and halt sound
    setActiveAlertOrder((prev) => (prev?.id === orderId ? null : prev));
    stopLoudAlertLoop();
  }, [user, getIdToken]);

  return (
    <OrderContext.Provider
      value={{
        orders,
        activeAlertOrder,
        dismissAlert,
        forceResyncQueue,
        dismissStaleAlert,
        placeOrder,
        updateOrderStatus,
        confirmDelivery,
        reportMissingDelivery,
        cancelOrder,
        getOrderById,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
}

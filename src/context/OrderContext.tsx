'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Order, OrderStatus, OrderItem, PaymentAuditInfo } from '@/types';
import { auth, db } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  where,
  getDocsFromServer,
} from 'firebase/firestore';
import { startLoudAlertLoop, stopLoudAlertLoop, playChimeTone } from '@/lib/sound';
import { generateId } from '@/lib/utils';
import { useAuth } from './AuthContext';

const TERMINAL_STATUSES: OrderStatus[] = ['SERVED', 'COMPLETED', 'REJECTED', 'CANCELLED'];

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
  cancelOrder: (orderId: string, reason?: string) => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeAlertOrder, setActiveAlertOrder] = useState<Order | null>(null);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  // Load orders strictly from Firestore
  useEffect(() => {
    if (!db || !user) {
      setOrders([]);
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
          // 1. Inspect docChanges specifically for removals or terminal status transitions
          snapshot.docChanges().forEach((change) => {
            const orderData = { id: change.doc.id, ...change.doc.data() } as Order;

            if (change.type === 'removed') {
              knownOrderIdsRef.current.delete(orderData.id);
              // If this removed order is the active alert, immediately clear it and stop siren!
              setActiveAlertOrder((prev) => {
                if (prev?.id === orderData.id) {
                  stopLoudAlertLoop();
                  return null;
                }
                return prev;
              });
            } else if (change.type === 'added') {
              // Trigger kitchen alarm if a new order is received for staff
              if (
                !isInitialLoadRef.current &&
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
                  new Notification(`🚨 New Order #${orderData.id.slice(-4)} (${orderData.seatCode})`, {
                    body: `${orderData.employeeName} ordered ${orderData.items.length} item(s) • Desk ${orderData.seatCode}`,
                    icon: '/icon-192.png',
                    tag: orderData.id,
                  });
                }
              }
              knownOrderIdsRef.current.add(orderData.id);
            } else if (change.type === 'modified') {
              // Defensive self-healing: if status reached terminal state, clear it immediately
              if (TERMINAL_STATUSES.includes(orderData.status)) {
                setActiveAlertOrder((prev) => {
                  if (prev?.id === orderData.id) {
                    stopLoudAlertLoop();
                    return null;
                  }
                  return prev;
                });
              }
            }
          });

          // 2. Pure, full replacement of current orders snapshot
          const loadedOrders: Order[] = snapshot.docs.map(
            (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Order)
          );
          setOrders(loadedOrders);

          // 3. Post-snapshot reconciliation: if currently displayed activeAlertOrder is no longer
          // in an active ringing state in the fresh query result, immediately clear it and stop sound!
          setActiveAlertOrder((prev) => {
            if (!prev) return null;
            const liveMatch = loadedOrders.find((o) => o.id === prev.id);
            if (!liveMatch || TERMINAL_STATUSES.includes(liveMatch.status)) {
              stopLoudAlertLoop();
              return null;
            }
            return liveMatch;
          });

          isInitialLoadRef.current = false;
        },
        (error: any) => {
          console.warn('[ORDERS] Firestore subscription error:', error);
          // If composite index is building or missing, fallback to where without orderBy and sort in memory
          if (!isStaff && error?.code === 'failed-precondition' && db) {
            console.info('[ORDERS] Using in-memory sort fallback while composite index builds...');
            const fallbackQuery = query(
              collection(db, 'orders'),
              where('employeeId', '==', user.uid)
            );
            fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              (snap) => {
                const list: Order[] = [];
                snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Order));
                list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                setOrders(list);
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
    if (!auth?.currentUser) throw new Error('Authentication required to place order');

    const token = await auth.currentUser.getIdToken(true);

    // Pre-allocate client order ID so upload and creation correlate deterministically
    const preOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    let finalProofUrl = paymentProofUrl;

    // If paymentProofUrl is a base64 image data URI, route upload strictly through server-side /api/orders/upload-proof
    if (paymentProofUrl && paymentProofUrl.startsWith('data:image/')) {
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
        throw new Error(uploadJson?.error || 'Failed to upload payment proof to server.');
      }

      if (uploadJson.downloadUrl) {
        finalProofUrl = uploadJson.downloadUrl;
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
    let data: any = null;
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
    return data.orderId;
  };

  const updateOrderStatus = async (
    orderId: string,
    status: OrderStatus,
    rejectionReason?: string
  ) => {
    if (!auth?.currentUser) {
      throw new Error('Authentication required to update order status');
    }

    const token = await auth.currentUser.getIdToken(true);
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

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update order status');
    }
  };

  const cancelOrder = async (orderId: string, reason?: string) => {
    if (!auth?.currentUser) {
      throw new Error('Authentication required to cancel order');
    }

    const token = await auth.currentUser.getIdToken(true);
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
    let data: any = null;
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
      const freshOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
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
    if (!auth?.currentUser) {
      throw new Error('Authentication required to dismiss stale alarm');
    }

    const token = await auth.currentUser.getIdToken();
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
  }, []);

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

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Order, OrderStatus, OrderItem } from '@/types';
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
} from 'firebase/firestore';
import { startLoudAlertLoop, stopLoudAlertLoop, playChimeTone } from '@/lib/sound';
import { generateId } from '@/lib/utils';
import { useAuth } from './AuthContext';

interface OrderContextType {
  orders: Order[];
  activeAlertOrder: Order | null;
  dismissAlert: () => void;
  placeOrder: (
    items: OrderItem[],
    totalAmount: number,
    paymentProofUrl: string,
    idempotencyKey: string
  ) => Promise<string>;
  updateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    rejectionReason?: string
  ) => Promise<void>;
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
      // Kitchen Admins listen to all orders; Employees query only their own orders
      const ordersQuery =
        user.role === 'admin'
          ? query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
          : query(
              collection(db, 'orders'),
              where('employeeId', '==', user.uid),
              orderBy('createdAt', 'desc')
            );

      const unsubscribe = onSnapshot(
        ordersQuery,
        (snapshot) => {
          const loadedOrders: Order[] = [];

          snapshot.docChanges().forEach((change) => {
            const orderData = { id: change.doc.id, ...change.doc.data() } as Order;

            // Trigger kitchen alarm if a new order is received
            if (
              change.type === 'added' &&
              !isInitialLoadRef.current &&
              !knownOrderIdsRef.current.has(orderData.id) &&
              user.role === 'admin'
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
          });

          snapshot.forEach((docSnap) => {
            loadedOrders.push({ id: docSnap.id, ...docSnap.data() } as Order);
          });

          setOrders(loadedOrders);
          isInitialLoadRef.current = false;
        },
        (error) => {
          console.error('[ORDERS] Firestore subscription error:', error);
          isInitialLoadRef.current = false;
        }
      );

      return () => unsubscribe();
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
    idempotencyKey: string
  ): Promise<string> => {
    if (!user) throw new Error('User must be logged in to place order');
    if (!db) throw new Error('Firestore is not initialized');

    const orderId = generateId('order');
    const now = Date.now();
    const totalCalories = items.reduce((sum, item) => sum + (item.lineCalories || 0), 0);

    const newOrder: Order = {
      id: orderId,
      employeeId: user.uid,
      employeeName: user.displayName || 'Employee',
      seatCode: user.seatCode || 'Desk N/A',
      items,
      totalAmount,
      totalCalories,
      paymentProofUrl,
      status: 'PAYMENT_VERIFYING',
      rejectionReason: null,
      createdAt: now,
      statusUpdatedAt: now,
      statusHistory: [{ status: 'PAYMENT_VERIFYING', timestamp: now }],
      idempotencyKey,
    };

    playChimeTone();

    const orderRef = doc(db, 'orders', orderId);
    await setDoc(orderRef, {
      ...newOrder,
      createdAt: serverTimestamp(),
      statusUpdatedAt: serverTimestamp(),
    });

    // Notify kitchen staff
    try {
      await fetch('/api/notify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          seatCode: newOrder.seatCode,
          employeeName: newOrder.employeeName,
          totalAmount: newOrder.totalAmount,
        }),
      });
    } catch (err) {
      console.warn('[NOTIFY-ADMIN] Failed to trigger push notification (non-blocking):', err);
    }

    return orderId;
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

  const getOrderById = (orderId: string) => {
    return orders.find((o) => o.id === orderId);
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        activeAlertOrder,
        dismissAlert,
        placeOrder,
        updateOrderStatus,
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

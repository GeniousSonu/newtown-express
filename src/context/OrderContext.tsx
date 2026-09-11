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
    if (!auth?.currentUser) throw new Error('Authentication required to place order');

    const token = await auth.currentUser.getIdToken(true);
    const res = await fetch('/api/orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        items: items.map((it) => ({
          itemId: it.itemId,
          quantity: it.quantity,
          selectedAddons: it.selectedAddons.map((a) => ({
            groupName: a.groupName,
            optionName: a.optionName,
          })),
        })),
        paymentProofUrl,
        idempotencyKey,
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

  return (
    <OrderContext.Provider
      value={{
        orders,
        activeAlertOrder,
        dismissAlert,
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

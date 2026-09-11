'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Order, OrderStatus, OrderItem } from '@/types';
import { db, isMockMode } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
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

const MOCK_ORDERS_STORAGE_KEY = 'newtown_mock_orders_v1';

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeAlertOrder, setActiveAlertOrder] = useState<Order | null>(null);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  // Load orders (Mock or Firestore)
  useEffect(() => {
    // Always load existing cached orders first so UI is instant
    const saved = typeof window !== 'undefined' ? localStorage.getItem(MOCK_ORDERS_STORAGE_KEY) : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setOrders(parsed);
        parsed.forEach((o: Order) => knownOrderIdsRef.current.add(o.id));
      } catch {
        // Ignore
      }
    }

    if (isMockMode || !db || !user) {
      isInitialLoadRef.current = false;
      return;
    }

    // Real Firestore Listener with graceful fallback error handler
    try {
      const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(
        ordersQuery,
        (snapshot) => {
          const loadedOrders: Order[] = [];

          snapshot.docChanges().forEach((change) => {
            const orderData = { id: change.doc.id, ...change.doc.data() } as Order;

            // If new order was added after initial load and user is Admin
            if (
              change.type === 'added' &&
              !isInitialLoadRef.current &&
              !knownOrderIdsRef.current.has(orderData.id) &&
              user.role === 'admin'
            ) {
              setActiveAlertOrder(orderData);
              startLoudAlertLoop();

              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification(`🚨 New Order #${orderData.id.slice(-4)} (${orderData.seatCode})`, {
                  body: `${orderData.employeeName} ordered ${orderData.items.length} item(s) • Desk ${orderData.seatCode}`,
                  icon: '/icon-192.svg',
                  tag: orderData.id,
                });
              }
            }
            knownOrderIdsRef.current.add(orderData.id);
          });

          snapshot.forEach((docSnap) => {
            loadedOrders.push({ id: docSnap.id, ...docSnap.data() } as Order);
          });

          if (loadedOrders.length > 0) {
            setOrders(loadedOrders);
            if (typeof window !== 'undefined') {
              localStorage.setItem(MOCK_ORDERS_STORAGE_KEY, JSON.stringify(loadedOrders));
            }
          }
          isInitialLoadRef.current = false;
        },
        (error) => {
          console.warn('Firestore orders sync notice (using local storage fallback):', error.message);
          isInitialLoadRef.current = false;
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Could not initialize Firestore listener:', err);
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

    const orderId = generateId('order');
    const now = Date.now();

    const newOrder: Order = {
      id: orderId,
      employeeId: user.uid,
      employeeName: user.displayName || 'Employee',
      seatCode: user.seatCode || 'Desk N/A',
      items,
      totalAmount,
      paymentProofUrl,
      status: 'PAYMENT_VERIFYING',
      rejectionReason: null,
      createdAt: now,
      statusUpdatedAt: now,
      statusHistory: [{ status: 'PAYMENT_VERIFYING', timestamp: now }],
      idempotencyKey,
    };

    // Always update local state immediately so user sees their order instantly
    setOrders((prev) => {
      const updated = [newOrder, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem(MOCK_ORDERS_STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    });
    knownOrderIdsRef.current.add(newOrder.id);
    playChimeTone();

    // Sync to Firestore if configured
    if (db) {
      try {
        const orderRef = doc(db, 'orders', orderId);
        await setDoc(orderRef, {
          ...newOrder,
          createdAt: serverTimestamp(),
          statusUpdatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Firestore setDoc notice (saved locally):', err);
      }

      // Free-tier Next.js API route notification trigger
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
        console.warn('Failed to call /api/notify-admin (non-blocking):', err);
      }
    }

    return orderId;
  };

  const updateOrderStatus = async (
    orderId: string,
    status: OrderStatus,
    rejectionReason?: string
  ) => {
    const now = Date.now();

    // Always update local state immediately
    setOrders((prev) => {
      const updated = prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        return {
          ...ord,
          status,
          rejectionReason: rejectionReason || ord.rejectionReason,
          statusUpdatedAt: now,
          statusHistory: [...ord.statusHistory, { status, timestamp: now }],
        };
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem(MOCK_ORDERS_STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    });

    // Sync to Firestore if available
    if (db) {
      try {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
          status,
          rejectionReason: rejectionReason || null,
          statusUpdatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Firestore status update notice (saved locally):', err);
      }
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

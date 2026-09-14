'use client';

import { Order, OrderStatus } from '@/types';
import { toast } from 'sonner';
import { playNotificationChime } from './sound';

export interface NotificationContent {
  title: string;
  emoji: string;
  description: string;
  variant: 'info' | 'success' | 'warning' | 'error';
}

export function getStatusNotificationContent(status: OrderStatus, order: Order): NotificationContent {
  const shortId = order.id.slice(-4);
  const seat = order.seatCode ? `Desk ${order.seatCode}` : 'Your Desk';

  switch (status) {
    case 'PAYMENT_VERIFYING':
      return {
        title: 'Payment Verification',
        emoji: '🔍',
        description: `Order #${shortId}: Payment screenshot is being checked by kitchen staff.`,
        variant: 'info',
      };
    case 'PAYMENT_VERIFIED':
      return {
        title: 'Payment Verified',
        emoji: '💳',
        description: `Order #${shortId}: Payment approved! Moving into the prep line.`,
        variant: 'success',
      };
    case 'QUEUED':
      return {
        title: 'Order Queued',
        emoji: '⏳',
        description: `Order #${shortId}: Kitchen is busy; your order is held in line.`,
        variant: 'info',
      };
    case 'ACCEPTED':
      return {
        title: 'Order Accepted!',
        emoji: '👨‍🍳',
        description: `Order #${shortId}: Kitchen accepted your order! Cooking starts shortly.`,
        variant: 'success',
      };
    case 'COOKING':
      return {
        title: 'Food is Cooking!',
        emoji: '🍳',
        description: `Order #${shortId}: Chef is now preparing your delicious meal.`,
        variant: 'info',
      };
    case 'READY':
      return {
        title: 'Order Ready!',
        emoji: '🍽️',
        description: `Order #${shortId}: Freshly prepared and ready for pickup/serving!`,
        variant: 'success',
      };
    case 'SERVED':
      return {
        title: 'Served to Desk!',
        emoji: '🛵',
        description: `Order #${shortId}: Delivered to ${seat}. Enjoy your meal!`,
        variant: 'success',
      };
    case 'COMPLETED':
      return {
        title: 'Order Completed',
        emoji: '✨',
        description: `Order #${shortId}: Plate collected. Thanks for ordering with Newtown Express!`,
        variant: 'info',
      };
    case 'REJECTED':
      return {
        title: 'Order Declined',
        emoji: '❌',
        description: order.rejectionReason
          ? `Order #${shortId}: ${order.rejectionReason}`
          : `Order #${shortId}: The kitchen was unable to fulfill your order.`,
        variant: 'error',
      };
    case 'CANCELLED':
      return {
        title: 'Order Cancelled',
        emoji: '🚫',
        description: `Order #${shortId} was cancelled.`,
        variant: 'warning',
      };
    default:
      return {
        title: 'Order Update',
        emoji: '🔔',
        description: `Order #${shortId} status updated to ${status}.`,
        variant: 'info',
      };
  }
}

/**
 * Dispatches multi-channel notification: audible chime, Sonner toast, and Web Notification
 */
export function notifyOrderStatusChange(
  order: Order,
  oldStatus: OrderStatus | null,
  onNavigate?: (url: string) => void
): void {
  if (typeof window === 'undefined') return;
  if (!order || !order.status || order.status === oldStatus) return;

  const content = getStatusNotificationContent(order.status, order);

  // 1. Play audible harmonic chime
  playNotificationChime();

  // 2. Trigger rich Sonner toast with action link
  const toastMessage = `${content.emoji} ${content.title}`;
  const toastOptions = {
    description: content.description,
    duration: 6000,
    action: {
      label: 'View Order',
      onClick: () => {
        if (onNavigate) {
          onNavigate(`/orders/${order.id}`);
        } else if (typeof window !== 'undefined') {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign(`/orders/${order.id}`);
        }
      },
    },
  };

  switch (content.variant) {
    case 'success':
      toast.success(toastMessage, toastOptions);
      break;
    case 'error':
      toast.error(toastMessage, toastOptions);
      break;
    case 'warning':
      toast.warning(toastMessage, toastOptions);
      break;
    case 'info':
    default:
      toast.info(toastMessage, toastOptions);
      break;
  }

  // 3. Trigger Web / PWA Push Notification if permission granted
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const title = `${content.emoji} ${content.title}`;
      const notifOptions: NotificationOptions = {
        body: content.description,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: `order_${order.id}_${order.status}`,
      };

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready
          .then((registration) => {
            registration.showNotification(title, notifOptions);
          })
          .catch(() => {
            new Notification(title, notifOptions);
          });
      } else {
        new Notification(title, notifOptions);
      }
    } catch (notifErr) {
      console.warn('[NOTIF] Web Notification failed:', notifErr);
    }
  }
}

'use client';

import { useEffect, useState, useRef } from 'react';
import { useOrders } from '@/context/OrderContext';
import { RefreshCw, X } from 'lucide-react';

export function ServiceWorkerRegister() {
  const { orders } = useOrders();
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const activeOrdersRinging = orders.some((o) => o.status === 'PLACED');
  const activeOrdersRef = useRef(activeOrdersRinging);

  useEffect(() => {
    activeOrdersRef.current = activeOrdersRinging;
  }, [activeOrdersRinging]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Check if there's already an updated worker waiting
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          if (!activeOrdersRef.current) {
            setShowUpdateToast(true);
          }
        }

        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (
                installingWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                // New update available! Only show if not actively ringing
                setWaitingWorker(installingWorker);
                if (!activeOrdersRef.current) {
                  setShowUpdateToast(true);
                }
              }
            };
          }
        };
      })
      .catch((err) => {
        console.warn('PWA Service Worker registration failed:', err);
      });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const handleUpdate = () => {
    if (activeOrdersRef.current) {
      // Never reload if alarms/orders are ringing
      return;
    }
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowUpdateToast(false);
  };

  // If active orders are ringing, suppress update toast completely
  if (activeOrdersRinging || !showUpdateToast) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className="tactile-card p-3.5 bg-[#111111] text-white border-2 border-[#111111] shadow-[0_4px_0_#10B981] flex items-center gap-3">
        <RefreshCw className="w-4 h-4 text-[#10B981] shrink-0 animate-spin" />
        <div className="text-xs">
          <p className="font-black text-white">App update ready</p>
          <p className="text-[10px] text-stone-400 font-bold">New features are available</p>
        </div>
        <button
          type="button"
          onClick={handleUpdate}
          className="px-2.5 py-1 bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-black rounded-lg transition-colors ml-1"
        >
          Update
        </button>
        <button
          type="button"
          onClick={() => setShowUpdateToast(false)}
          className="w-6 h-6 rounded-md text-stone-400 hover:text-white flex items-center justify-center"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

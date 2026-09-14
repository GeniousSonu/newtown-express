'use client';

import React, { useState, useEffect } from 'react';
import { Download, Share2, PlusSquare, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosPrompt, setShowIosPrompt] = useState(false);
  const [showPromptBanner, setShowPromptBanner] = useState(false);

  useEffect(() => {
    // Check if already in standalone PWA mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return;
    }

    // Check if user dismissed prompt in this session
    const isDismissed = sessionStorage.getItem('ntx_pwa_dismissed');
    if (isDismissed) {
      return;
    }

    // Android / Chrome beforeinstallprompt handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPromptBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isSafari =
      isIos &&
      userAgent.includes('safari') &&
      !userAgent.includes('crios') &&
      !userAgent.includes('fxios');

    if (isIos && isSafari) {
      // Delay showing iOS prompt slightly to not interrupt initial render
      const timer = setTimeout(() => {
        setShowIosPrompt(true);
      }, 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setShowPromptBanner(false);
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPromptBanner(false);
    setShowIosPrompt(false);
    sessionStorage.setItem('ntx_pwa_dismissed', 'true');
  };

  if (showPromptBanner && deferredPrompt) {
    return (
      <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in slide-in-from-bottom-3 duration-300">
        <div className="tactile-card p-4 bg-white border-2 border-[#111111] shadow-[0_6px_0_#111111] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF3B30] text-white flex items-center justify-center shrink-0 border border-[#111111] shadow-[0_2px_0_#111111]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-[#111111]">Install Newtown Express</p>
              <p className="text-[10px] text-stone-500 font-bold leading-tight">
                Add to home screen for instant desk alerts & faster ordering
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="tactile-btn px-3 py-1.5 text-xs bg-[#FFD166] text-[#111111]"
            >
              Install
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="w-8 h-8 rounded-full border border-stone-300 flex items-center justify-center text-stone-500 hover:bg-stone-100"
              aria-label="Dismiss install prompt"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showIosPrompt) {
    return (
      <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-40 animate-in slide-in-from-bottom-3 duration-300">
        <div className="tactile-card p-4 bg-[#FFF8F2] border-2 border-[#111111] shadow-[0_6px_0_#111111] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">📱</span>
              <p className="text-xs font-black text-[#111111]">Install on your iPhone</p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="w-7 h-7 rounded-full border border-stone-300 flex items-center justify-center text-stone-500 hover:bg-white"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[11px] font-bold text-stone-600 space-y-1.5 bg-white p-2.5 rounded-xl border border-stone-200">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-stone-100 flex items-center justify-center font-black text-stone-700">
                1
              </span>
              <span>
                Tap the <Share2 className="inline w-3.5 h-3.5 text-blue-600 stroke-[2.5]" /> Share
                button below in Safari
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-stone-100 flex items-center justify-center font-black text-stone-700">
                2
              </span>
              <span>
                Scroll down and select{' '}
                <strong className="text-[#111111] font-black">
                  Add to Home Screen <PlusSquare className="inline w-3.5 h-3.5" />
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

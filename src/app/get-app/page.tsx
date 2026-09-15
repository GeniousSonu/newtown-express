'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Download,
  Share2,
  PlusSquare,
  ShieldAlert,
  CheckCircle2,
  ArrowLeft,
  Smartphone,
  Laptop,
  Sparkles,
  Info,
} from 'lucide-react';

type Platform = 'android' | 'ios' | 'desktop';

function getInitialPlatform(): Platform {
  if (typeof window === 'undefined') return 'android';
  const userAgent = window.navigator.userAgent.toLowerCase();
  if (/android/.test(userAgent)) return 'android';
  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
  return 'desktop';
}

export default function GetAppPage() {
  const [platform, setPlatform] = useState<Platform>(getInitialPlatform);
  const [apkUrl, setApkUrl] = useState<string>('/newtown-express.apk');

  useEffect(() => {

    // Attempt to read remote apkUrl from appConfig in Firestore if available
    const fetchRemoteConfig = async () => {
      try {
        const { db } = await import('@/lib/firebase');
        if (db) {
          const { doc, getDoc } = await import('firebase/firestore');
          const snap = await getDoc(doc(db, 'appConfig', 'androidApp'));
          if (snap.exists() && snap.data()?.apkUrl) {
            setApkUrl(snap.data().apkUrl);
          }
        }
      } catch {
        // Fallback to default local/static path
      }
    };
    fetchRemoteConfig();
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#FFF8F2] text-[#111111] flex flex-col">
      {/* Top App Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b-2 border-[#111111] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="tactile-btn p-2 bg-white text-[#111111] rounded-xl border-2 border-[#111111] shadow-xs flex items-center gap-1.5 text-xs font-black"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Back to Pantry</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white border border-[#111111] p-0.5 flex items-center justify-center shadow-xs">
              <Image
                src="/ibarts-logo.png"
                alt="Newtown Express Logo"
                width={24}
                height={24}
                className="object-contain"
              />
            </div>
            <span className="text-xs font-black tracking-tight">Newtown Express</span>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Hero Section */}
        <div className="tactile-card p-6 sm:p-8 bg-white border-2 border-[#111111] shadow-[0_6px_0_#111111] text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-[#FFD166] border-2 border-[#111111] shadow-[0_3px_0_#111111] flex items-center justify-center text-3xl">
            📱
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-[#FF3B30] bg-[#FF3B30]/10 px-2.5 py-0.5 rounded-full border border-[#FF3B30]/20">
              Official Pantry App
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111111] mt-2">
              Install Newtown Express
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 font-bold max-w-md mx-auto mt-1">
              Order your tea, coffee, and snacks straight to your desk with loud delivery alerts and zero browser address bar.
            </p>
          </div>

          {/* Platform Switcher Tabs */}
          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPlatform('android')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border-2 ${
                platform === 'android'
                  ? 'bg-[#111111] text-white border-[#111111] shadow-xs'
                  : 'bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android APK</span>
            </button>
            <button
              type="button"
              onClick={() => setPlatform('ios')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border-2 ${
                platform === 'ios'
                  ? 'bg-[#111111] text-white border-[#111111] shadow-xs'
                  : 'bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-200'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>iPhone (iOS)</span>
            </button>
            <button
              type="button"
              onClick={() => setPlatform('desktop')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border-2 ${
                platform === 'desktop'
                  ? 'bg-[#111111] text-white border-[#111111] shadow-xs'
                  : 'bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-200'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Computer</span>
            </button>
          </div>
        </div>

        {/* ═══ ANDROID INSTRUCTIONS VIEW ═══ */}
        {platform === 'android' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Primary Download CTA Card */}
            <div className="tactile-card p-5 sm:p-6 bg-[#FFF8F2] border-2 border-[#111111] shadow-[0_4px_0_#111111] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                      Signed Release APK Ready
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-[#111111] mt-0.5">
                    Download for Android
                  </h2>
                  <p className="text-xs text-stone-600 font-bold">
                    Pure standalone window · Full background sirens · Version 1.0.0
                  </p>
                </div>

                <a
                  href={apkUrl}
                  download="newtown-express.apk"
                  className="tactile-btn px-6 py-3.5 bg-[#FF3B30] hover:bg-[#E03025] text-white rounded-2xl border-2 border-[#111111] shadow-[0_4px_0_#111111] active:translate-y-0.5 text-sm font-black flex items-center justify-center gap-2 shrink-0 transition-all"
                >
                  <Download className="w-5 h-5 stroke-[2.5]" />
                  <span>Download App (.apk)</span>
                </a>
              </div>
            </div>

            {/* Reassurance Notice Banner */}
            <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-400 text-amber-950 space-y-1.5 shadow-xs">
              <div className="flex items-center gap-2 font-black text-xs text-amber-900">
                <Info className="w-4 h-4 text-amber-800 shrink-0" />
                <span>Internal Company App Notice</span>
              </div>
              <p className="text-xs font-bold leading-relaxed text-amber-900">
                You will see standard Android &amp; Google Play Protect warnings during install. This is normal and expected for an internal company app distributed directly to staff rather than published publicly on the Play Store. It is 100% verified, safe, and built by Newtown Express.
              </p>
            </div>

            {/* Step-by-Step Installation Flow */}
            <div className="tactile-card p-5 sm:p-6 bg-white border-2 border-[#111111] shadow-[0_4px_0_#111111] space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#111111]">
                How to Install (Takes 30 Seconds)
              </h3>

              {/* Gate 1: Browser Permission */}
              <div className="space-y-3">
                <div className="text-xs font-black text-stone-500 uppercase tracking-wider border-b border-stone-200 pb-1">
                  Gate 1 — Browser Permission (Chrome)
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-[#FFD166] text-[#111111] font-black text-xs flex items-center justify-center shrink-0 border border-[#111111] shadow-xs">
                    1
                  </span>
                  <div className="text-xs font-bold text-stone-700 leading-snug">
                    Tap <strong className="text-[#111111] font-black">Download App</strong> above. When the file finishes downloading, tap <strong className="text-[#111111] font-black">Open</strong> (or open it from your phone’s notification bar / Downloads folder).
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-[#FFD166] text-[#111111] font-black text-xs flex items-center justify-center shrink-0 border border-[#111111] shadow-xs">
                    2
                  </span>
                  <div className="text-xs font-bold text-stone-700 leading-snug">
                    If Chrome displays <em>&quot;For your security, your phone is not allowed to install unknown apps from this source&quot;</em>, tap <strong className="text-[#111111] font-black">Settings</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-[#FFD166] text-[#111111] font-black text-xs flex items-center justify-center shrink-0 border border-[#111111] shadow-xs">
                    3
                  </span>
                  <div className="text-xs font-bold text-stone-700 leading-snug">
                    Turn ON the switch labeled <strong className="text-[#111111] font-black">&quot;Allow from this source&quot;</strong>, then press your phone’s Back button and tap <strong className="text-[#111111] font-black">Install</strong>.
                  </div>
                </div>
              </div>

              {/* Gate 2: Google Play Protect */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-black text-stone-500 uppercase tracking-wider border-b border-stone-200 pb-1 flex items-center justify-between">
                  <span>Gate 2 — Google Play Protect Prompt</span>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                </div>

                {/* Simulated Play Protect Dialog Card */}
                <div className="p-3.5 bg-stone-50 rounded-2xl border-2 border-stone-300 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🛡️</span>
                    <span className="text-xs font-black text-[#111111]">
                      Google Play Protect Dialog
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-stone-600 leading-relaxed">
                    Google Play Protect may show a prompt saying <em>&quot;Unsafe app blocked&quot;</em> or <em>&quot;Play Protect doesn&apos;t recognize this app&apos;s developer&quot;</em>.
                  </p>

                  <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-2 text-xs font-bold text-stone-800">
                    <div className="flex items-center gap-2 text-amber-900 font-black">
                      <span className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center text-xs">
                        A
                      </span>
                      <span>
                        Tap <strong className="underline text-blue-600">More details</strong> (small text link on the dialog).
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-900 font-black">
                      <span className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center text-xs">
                        B
                      </span>
                      <span>
                        Tap <strong className="bg-emerald-600 text-white px-2 py-0.5 rounded-md">Install anyway</strong> to complete setup.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Success Result */}
              <div className="p-3.5 bg-emerald-50 rounded-2xl border-2 border-emerald-300 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-xs font-bold text-emerald-950 leading-tight">
                  Done! Launch Newtown Express from your home screen. It will open without an address bar as a genuine native app.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ IOS INSTRUCTIONS VIEW ═══ */}
        {platform === 'ios' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="tactile-card p-5 sm:p-6 bg-white border-2 border-[#111111] shadow-[0_4px_0_#111111] space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF8F2] border-2 border-[#111111] flex items-center justify-center text-lg shadow-xs">
                  🍎
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-[#111111]">
                    Add to iPhone Home Screen
                  </h2>
                  <p className="text-xs text-stone-500 font-bold">
                    Fastest experience with no App Store download required
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs font-bold text-stone-700">
                <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="w-6 h-6 rounded-lg bg-[#FFD166] text-[#111111] font-black text-xs flex items-center justify-center shrink-0 border border-[#111111] shadow-xs">
                    1
                  </span>
                  <div>
                    Open Newtown Express in <strong className="text-[#111111] font-black">Safari</strong> on your iPhone.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="w-6 h-6 rounded-lg bg-[#FFD166] text-[#111111] font-black text-xs flex items-center justify-center shrink-0 border border-[#111111] shadow-xs">
                    2
                  </span>
                  <div>
                    Tap the <strong className="text-[#111111] font-black">Share button</strong> <Share2 className="inline w-3.5 h-3.5 text-blue-600 stroke-[2.5]" /> at the bottom toolbar of Safari.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="w-6 h-6 rounded-lg bg-[#FFD166] text-[#111111] font-black text-xs flex items-center justify-center shrink-0 border border-[#111111] shadow-xs">
                    3
                  </span>
                  <div>
                    Scroll down the share sheet and tap <strong className="text-[#111111] font-black">Add to Home Screen</strong> <PlusSquare className="inline w-3.5 h-3.5 stroke-[2.5]" />.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="w-6 h-6 rounded-lg bg-[#FFD166] text-[#111111] font-black text-xs flex items-center justify-center shrink-0 border border-[#111111] shadow-xs">
                    4
                  </span>
                  <div>
                    Tap <strong className="text-[#111111] font-black">Add</strong> in the top-right corner. The app icon will appear instantly on your home screen!
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50 text-blue-950 rounded-xl border border-blue-200 text-xs font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Supports order status push alerts and instant desk delivery notifications.</span>
              </div>
            </div>
          </div>
        )}

        {/* ═══ DESKTOP INSTRUCTIONS VIEW ═══ */}
        {platform === 'desktop' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="tactile-card p-5 sm:p-6 bg-white border-2 border-[#111111] shadow-[0_4px_0_#111111] space-y-4 text-center">
              <div className="max-w-sm mx-auto space-y-3">
                <h2 className="text-base sm:text-lg font-black text-[#111111]">
                  Best Experienced on Your Phone
                </h2>
                <p className="text-xs text-stone-600 font-bold">
                  Scan this QR code with your phone camera or visit <strong className="text-[#FF3B30] font-mono">newtown-express.firebaseapp.com/get-app</strong> to download the mobile app.
                </p>

                <div className="w-44 h-44 mx-auto p-3 bg-white rounded-2xl border-2 border-[#111111] shadow-[0_3px_0_#111111] flex items-center justify-center">
                  <Image
                    src="/qr-placeholder.svg"
                    alt="Scan to open on phone"
                    width={150}
                    height={150}
                    className="object-contain"
                  />
                </div>

                <div className="pt-2">
                  <span className="text-[11px] font-bold text-stone-500 block">
                    Or on this computer: click the <strong>Install</strong> icon on the right side of Chrome or Edge address bar to install as a desktop desktop app.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Support Info */}
        <div className="text-center pt-2 pb-6 text-stone-500 text-xs font-bold space-y-1">
          <p>Need help installing or have questions?</p>
          <p className="text-[#111111] font-black">
            Visit the pantry counter or ask your kitchen team at desk delivery.
          </p>
        </div>
      </main>
    </div>
  );
}

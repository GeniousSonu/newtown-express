import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BackHeader } from '@/components/BackHeader';
import { APP_INFO } from '@/lib/config/appInfo';
import {
  Zap,
  ShieldCheck,
  BellRing,
  Feather,
  Smartphone,
  ExternalLink,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'How Newtown Express Works — Engineering & Architecture',
  description: 'A behind-the-scenes look at the real-time engineering and zero-cost architecture underneath Newtown Express.',
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-[100dvh] bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col transition-colors">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b-2 border-[#111111]/20 px-3 sm:px-4 py-2">
        <div className="max-w-3xl mx-auto">
          <BackHeader
            fallbackHref="/settings/profile"
            title="How Newtown Express Works"
            subtitle="Engineering & Architecture"
          />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6">
        {/* Hero Card */}
        <div className="tactile-card p-6 sm:p-8 bg-white border-2 border-[#111111] shadow-[0_6px_0_#111111] space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD166] text-[#111111] text-xs font-black border border-[#111111] shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#111111]" />
            <span>Architecture Breakdown</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111111] leading-tight">
            How Newtown Express Works
          </h1>
          <p className="text-sm sm:text-base font-bold text-stone-600 leading-relaxed">
            A behind-the-scenes look at the engineering underneath this app.
          </p>
        </div>

        {/* Section 1: The Problem It Solves */}
        <div className="tactile-card p-5 sm:p-7 bg-white border-2 border-[#111111] shadow-[0_4px_0_#111111] space-y-2.5">
          <div className="flex items-center gap-2.5 text-[#FF3B30]">
            <HelpCircle className="w-5 h-5 stroke-[2.5]" />
            <h2 className="text-base sm:text-lg font-black text-[#111111]">
              The Problem It Solves
            </h2>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-stone-700 leading-relaxed">
            What started as a paper order sheet and a shouting match across a kitchen window is now a real-time ordering system — built from scratch as an internal pilot, architected to run at zero infrastructure cost.
          </p>
        </div>

        {/* Section 2: Real-Time by Design */}
        <div className="tactile-card p-5 sm:p-7 bg-white border-2 border-[#111111] shadow-[0_4px_0_#111111] space-y-2.5">
          <div className="flex items-center gap-2.5 text-[#0F766E]">
            <Zap className="w-5 h-5 stroke-[2.5]" />
            <h2 className="text-base sm:text-lg font-black text-[#111111]">
              Real-Time by Design
            </h2>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-stone-700 leading-relaxed">
            Every screen in this app — the kitchen&apos;s order queue, your live order tracker, the office seat map, even menu availability — updates within a fraction of a second across every connected device, with no refresh button anywhere. This isn&apos;t polling or periodic syncing; it&apos;s built on persistent live data streams, so the moment the kitchen accepts your order, your phone knows before you&apos;ve even looked up.
          </p>
        </div>

        {/* Section 3: Nothing Is Trusted Blindly */}
        <div className="tactile-card p-5 sm:p-7 bg-white border-2 border-[#111111] shadow-[0_4px_0_#111111] space-y-2.5">
          <div className="flex items-center gap-2.5 text-blue-600">
            <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            <h2 className="text-base sm:text-lg font-black text-[#111111]">
              Nothing Is Trusted Blindly
            </h2>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-stone-700 leading-relaxed">
            Every meaningful action — placing an order, changing its status, claiming a desk, uploading payment proof — is independently re-verified on the server, never taken at face value from a device. Prices and calorie counts are recalculated from the real menu at the moment of order creation, not trusted from whatever a phone sends. Every account&apos;s permissions are enforced twice: once by what the interface shows, and independently again by the database itself, so what you <em>can</em> do and what you&apos;re <em>allowed</em> to do are never just the same rule enforced once.
          </p>
        </div>

        {/* Section 4: The Alarm That Can't Be Missed */}
        <div className="tactile-card p-5 sm:p-7 bg-white border-2 border-[#111111] shadow-[0_4px_0_#111111] space-y-2.5">
          <div className="flex items-center gap-2.5 text-amber-700">
            <BellRing className="w-5 h-5 stroke-[2.5]" />
            <h2 className="text-base sm:text-lg font-black text-[#111111]">
              The Alarm That Can&apos;t Be Missed
            </h2>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-stone-700 leading-relaxed">
            When an order lands, the kitchen doesn&apos;t just get a notification — it gets a full-screen, continuously ringing alert that only stops once every waiting order has genuinely been handled, with a live queue underneath it so nothing gets lost during a rush. Getting this right meant working around real constraints most apps never touch: browsers refusing to play audio without a direct tap first, phones aggressively killing background apps to save battery, and keeping a screen awake through nothing but web-standard APIs.
          </p>
        </div>

        {/* Section 5: Built to Run on Nothing */}
        <div className="tactile-card p-5 sm:p-7 bg-white border-2 border-[#111111] shadow-[0_4px_0_#111111] space-y-2.5">
          <div className="flex items-center gap-2.5 text-emerald-700">
            <Feather className="w-5 h-5 stroke-[2.5]" />
            <h2 className="text-base sm:text-lg font-black text-[#111111]">
              Built to Run on Nothing
            </h2>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-stone-700 leading-relaxed">
            Every piece of this system — the database, the login system, image storage, push notifications, hosting — runs on genuinely free infrastructure, by deliberate design, not as a limitation. That meant solving problems most apps solve by throwing money at them (background job processing, server functions, paid messaging services) using nothing but the free tools already available, engineered carefully enough that the constraint never shows up in what you actually experience using it.
          </p>
        </div>

        {/* Section 6: Installable, Not Just a Website */}
        <div className="tactile-card p-5 sm:p-7 bg-white border-2 border-[#111111] shadow-[0_4px_0_#111111] space-y-2.5">
          <div className="flex items-center gap-2.5 text-purple-700">
            <Smartphone className="w-5 h-5 stroke-[2.5]" />
            <h2 className="text-base sm:text-lg font-black text-[#111111]">
              Installable, Not Just a Website
            </h2>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-stone-700 leading-relaxed">
            This runs as a real installable app on your phone — home screen icon, full-screen, works offline for its core shell — updating itself silently in the background every time something changes, with no app store, no update prompts, no waiting for approval.
          </p>
        </div>

        {/* Metadata & Credits Card */}
        <div className="tactile-card p-5 sm:p-6 bg-[#FFF8F2] border-2 border-[#111111] shadow-[0_4px_0_#111111] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold text-stone-700 border-b border-[#111111]/15 pb-3">
            <div>
              <span className="text-[10px] font-black uppercase text-stone-500 block">
                Version
              </span>
              <span className="font-mono text-[#111111] font-black text-sm">
                v{APP_INFO.version}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-stone-500 block">
                Last updated
              </span>
              <span className="text-[#111111] font-black text-sm">
                {APP_INFO.lastUpdated}
              </span>
            </div>
          </div>

          <div className="pt-1 text-xs font-bold text-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>Originally architected and built by:</span>
            <Link
              href={APP_INFO.architect.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border-2 border-[#111111] text-[#111111] font-black text-xs shadow-xs hover:bg-[#FFD166] active:translate-y-0.5 transition-all w-fit"
            >
              <span>{APP_INFO.architect.name}</span>
              <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

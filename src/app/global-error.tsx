'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      Sentry.captureException(error);
    } catch {
      // ignore
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FFF8F2] flex items-center justify-center p-4 font-sans antialiased text-[#111111]">
        <div className="max-w-md w-full bg-white border-2 border-[#111111] rounded-3xl p-8 sm:p-10 text-center space-y-4 shadow-[0_4px_0_#111111]">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FFD166] border-2 border-[#111111] shadow-[0_3px_0_#111111] flex items-center justify-center text-3xl">
            🥣
          </div>
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
              A Hiccup in the Kitchen
            </h1>
            <p className="text-xs sm:text-sm font-bold text-[#6B6B6B] leading-relaxed">
              We encountered an unexpected error loading the application shell. Tap below to reload fresh.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="px-6 py-3 rounded-2xl bg-[#FF3B30] text-white font-black text-xs border-2 border-[#111111] shadow-[0_4px_0_#111111] hover:-translate-y-0.5 active:translate-y-1 transition-all"
            >
              Reload Newtown Express
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

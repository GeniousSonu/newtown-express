'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Wrench } from 'lucide-react';

interface ConfigStatus {
  checked: boolean;
  ok: boolean;
  missingKeys: string[];
}

export function ConfigGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConfigStatus>({
    checked: false,
    ok: true,
    missingKeys: [],
  });

  useEffect(() => {
    async function verifyConfig() {
      const clientMissing: string[] = [];

      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        clientMissing.push('NEXT_PUBLIC_FIREBASE_API_KEY');
      }
      if (!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) {
        clientMissing.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
      }
      if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
        clientMissing.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
      }

      let serverMissing: string[] = [];
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        if (!data.ok && Array.isArray(data.missing)) {
          serverMissing = data.missing;
        }
      } catch (err) {
        serverMissing.push('Server Health Check Unreachable');
      }

      const allMissing = [...clientMissing, ...serverMissing];

      if (allMissing.length > 0) {
        setStatus({
          checked: true,
          ok: false,
          missingKeys: allMissing,
        });
      } else {
        setStatus({
          checked: true,
          ok: true,
          missingKeys: [],
        });
      }
    }

    verifyConfig();
  }, []);

  if (!status.checked) {
    return <>{children}</>;
  }

  if (!status.ok) {
    return (
      <div className="min-h-screen bg-[#FFF8F2] flex items-center justify-center p-4">
        <div className="max-w-md w-full tactile-card p-8 bg-white text-center space-y-5">
          <div className="w-16 h-16 mx-auto bg-red-100 border-2 border-[#111111] rounded-2xl flex items-center justify-center shadow-[0_3px_0_#111111]">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-[#111111] tracking-tight">
              App Misconfigured
            </h1>
            <p className="text-xs sm:text-sm font-bold text-[#6B6B6B]">
              Newtown Express requires real production credentials to run. Please contact your system administrator or configure the required environment variables.
            </p>
          </div>

          <div className="bg-[#FFF8F2] border-2 border-[#111111] rounded-2xl p-4 text-left space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#111111] flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" />
              Missing Environment Variables
            </span>
            <ul className="space-y-1 text-xs font-mono font-bold text-red-700 list-disc list-inside">
              {status.missingKeys.map((key) => (
                <li key={key}>{key}</li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] text-[#6B6B6B] font-semibold">
            See <code className="bg-stone-100 px-1 py-0.5 rounded border text-[#111111]">.env.example</code> in the repository root for the required configuration template.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

'use client';

import React, { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { EmptyState } from '@/components/EmptyState';
import { RefreshCw, Home } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const isStaff = pathname?.startsWith('/admin') || pathname?.startsWith('/kitchen');

  useEffect(() => {
    try {
      Sentry.captureException(error);
    } catch {
      // ignore in local/offline
    }
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <EmptyState
        icon="⚠️"
        title="Something went unexpected"
        description="The system hit a momentary snag loading this view. You can reload or return home safely."
        variant={isStaff ? 'admin' : 'buyer'}
        action={{
          label: 'Reload Screen',
          onClick: () => reset(),
          icon: <RefreshCw className="w-4 h-4" />,
        }}
        secondaryAction={{
          label: isStaff ? 'Station Home' : 'Pantry Menu',
          href: isStaff ? (pathname?.startsWith('/admin') ? '/admin' : '/kitchen') : '/',
          icon: <Home className="w-3.5 h-3.5" />,
        }}
      />
    </div>
  );
}

'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { EmptyState } from '@/components/EmptyState';
import { ArrowLeft, Compass, Home, ShieldAlert } from 'lucide-react';

export default function NotFound() {
  const pathname = usePathname() || '';
  const { user } = useAuth();

  const isStaffPath =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/kitchen') ||
    user?.role === 'admin' ||
    user?.role === 'kitchenManager';

  const role = user?.role;

  let homeHref = '/';
  let homeLabel = 'Go to Newtown Express';
  let homeIcon = <Home className="w-4 h-4" />;

  if (role === 'admin') {
    homeHref = '/admin';
    homeLabel = 'Return to Control Room';
    homeIcon = <ShieldAlert className="w-4 h-4" />;
  } else if (role === 'kitchenManager') {
    homeHref = '/kitchen';
    homeLabel = 'Return to Kitchen Station';
    homeIcon = <Home className="w-4 h-4" />;
  } else if (user) {
    homeHref = '/';
    homeLabel = 'Return to Pantry Menu';
    homeIcon = <ArrowLeft className="w-4 h-4 stroke-[2.5]" />;
  }

  return (
    <div className="min-h-[65vh] flex items-center justify-center p-4">
      <EmptyState
        id="not-found-container"
        icon={isStaffPath ? '📡' : '🧭'}
        title={isStaffPath ? 'Station Not Found' : "This Pantry Page Doesn't Exist"}
        description={
          isStaffPath
            ? "The administrative screen or resource you attempted to reach isn't mapped to this station."
            : "We couldn't find the page or item you were looking for. Let's get you back to today's hot meals."
        }
        variant={isStaffPath ? 'admin' : 'buyer'}
        action={{
          label: homeLabel,
          href: homeHref,
          icon: homeIcon,
        }}
        secondaryAction={
          user && role === 'employee'
            ? {
                label: 'Track Orders',
                href: '/orders',
                icon: <Compass className="w-3.5 h-3.5" />,
              }
            : undefined
        }
      />
    </div>
  );
}

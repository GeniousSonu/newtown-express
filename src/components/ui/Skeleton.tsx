'use client';

import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'buyer' | 'control';
}

export function Skeleton({
  className = '',
  variant = 'buyer',
  ...props
}: SkeletonProps) {
  const baseBg =
    variant === 'control'
      ? 'bg-stone-800/80 border border-stone-700/60'
      : 'bg-stone-200/80 border border-stone-300/60';

  return (
    <div
      className={`animate-pulse rounded-2xl ${baseBg} ${className}`}
      {...props}
    />
  );
}

export function MenuCardSkeleton() {
  return (
    <div className="tactile-card overflow-hidden bg-white p-0 flex flex-col justify-between">
      <Skeleton className="aspect-[16/10] w-full rounded-none border-b-2 border-[#111111]" />
      <div className="p-4 sm:p-5 space-y-3 flex-1">
        <Skeleton className="h-5 w-3/4 rounded-xl" />
        <Skeleton className="h-3.5 w-full rounded-lg" />
        <Skeleton className="h-3.5 w-2/3 rounded-lg" />
        <div className="pt-3 border-t-2 border-stone-100 flex items-center justify-between">
          <Skeleton className="h-6 w-16 rounded-xl" />
          <Skeleton className="h-9 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function OrderRowSkeleton() {
  return (
    <div className="tactile-card p-4 bg-white space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32 rounded-xl" />
        <Skeleton className="h-6 w-20 rounded-xl" />
      </div>
      <Skeleton className="h-4 w-48 rounded-lg" />
      <div className="pt-2 flex items-center justify-between">
        <Skeleton className="h-5 w-16 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
    </div>
  );
}

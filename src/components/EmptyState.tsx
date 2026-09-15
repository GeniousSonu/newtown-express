'use client';

import React from 'react';
import Link from 'next/link';

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'admin';
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  variant?: 'buyer' | 'admin' | 'neutral';
  compact?: boolean;
  className?: string;
  id?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'buyer',
  compact = false,
  className = '',
  id,
}: EmptyStateProps) {
  const isAdmin = variant === 'admin';

  const renderAction = (act: EmptyStateAction, isSecondary = false) => {
    const isActAdmin = act.variant === 'admin' || (isAdmin && act.variant !== 'secondary');

    let btnClasses = '';
    if (isSecondary) {
      btnClasses =
        'px-4 py-2.5 rounded-xl border-2 border-[#111111] bg-white text-[#111111] font-bold text-xs shadow-[0_2px_0_#111111] hover:bg-stone-50 active:translate-y-0.5 transition-all inline-flex items-center justify-center gap-1.5';
    } else if (isActAdmin) {
      btnClasses =
        'px-5 py-3 rounded-2xl border-2 border-[#134E4A] bg-[#0F766E] text-white font-black text-xs shadow-[0_3px_0_#134E4A] hover:bg-[#115E59] hover:-translate-y-0.5 active:translate-y-0.5 transition-all inline-flex items-center justify-center gap-2';
    } else {
      btnClasses =
        'tactile-btn inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-black';
    }

    if (act.href) {
      return (
        <Link key={act.label} href={act.href} className={btnClasses}>
          {act.icon}
          <span>{act.label}</span>
        </Link>
      );
    }

    return (
      <button key={act.label} type="button" onClick={act.onClick} className={btnClasses}>
        {act.icon}
        <span>{act.label}</span>
      </button>
    );
  };

  return (
    <div
      id={id}
      className={`text-center transition-all ${
        compact
          ? 'p-6 space-y-2.5 rounded-2xl'
          : 'p-8 sm:p-12 space-y-4 rounded-3xl max-w-md mx-auto my-6'
      } ${
        isAdmin
          ? 'bg-white border-2 border-[#134E4A]/30 text-[#0F172A] shadow-[0_4px_0_#0F766E]'
          : 'tactile-card bg-white border-2 border-[#111111] shadow-[0_4px_0_#111111]'
      } ${className}`}
    >
      {icon && (
        <div
          className={`${
            compact ? 'w-12 h-12 text-2xl' : 'w-16 h-16 text-3xl'
          } mx-auto rounded-2xl border-2 flex items-center justify-center shrink-0 transition-transform ${
            isAdmin
              ? 'bg-teal-50 border-[#0F766E] text-[#0F766E] shadow-[0_3px_0_#0F766E]'
              : 'bg-[#FFD166] border-[#111111] text-[#111111] shadow-[0_3px_0_#111111]'
          }`}
        >
          {typeof icon === 'string' ? <span>{icon}</span> : icon}
        </div>
      )}

      <div className="space-y-1">
        <h3
          className={`font-black tracking-tight leading-snug ${
            compact ? 'text-sm sm:text-base text-[#111111]' : 'text-lg sm:text-xl text-[#111111]'
          } ${isAdmin ? 'text-[#0F172A]' : 'text-[#111111]'}`}
        >
          {title}
        </h3>
        <p
          className={`font-bold leading-relaxed max-w-sm mx-auto ${
            compact ? 'text-xs text-[#6B6B6B]' : 'text-xs sm:text-sm text-[#6B6B6B]'
          } ${isAdmin ? 'text-[#475569]' : 'text-[#6B6B6B]'}`}
        >
          {description}
        </p>
      </div>

      {(action || secondaryAction) && (
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          {action && renderAction(action)}
          {secondaryAction && renderAction(secondaryAction, true)}
        </div>
      )}
    </div>
  );
}

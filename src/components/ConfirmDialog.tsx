'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus the confirm button when opened (accessibility)
  useEffect(() => {
    if (open) {
      // Small delay to let animation start
      const timer = setTimeout(() => confirmRef.current?.focus(), 80);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  const isDanger = variant === 'danger';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-sm bg-white rounded-[28px] border-3 border-[#111111] shadow-[0_8px_0_#111111] overflow-hidden animate-in slide-in-from-bottom-2">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <h2
              id="confirm-dialog-title"
              className="text-lg font-black text-[#111111] tracking-tight"
            >
              {title}
            </h2>
            <p className="text-sm font-bold text-[#6B6B6B] leading-relaxed">
              {message}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center text-stone-400 hover:text-[#111111] rounded-xl hover:bg-stone-100 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex items-center gap-3">
          <button
            onClick={onCancel}
            className="min-h-[44px] flex-1 py-3 px-4 bg-white border-2 border-[#111111] rounded-2xl text-sm font-black text-[#111111] shadow-[0_3px_0_#111111] hover:bg-stone-50 active:translate-y-0.5 active:shadow-[0_1px_0_#111111] transition-all"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`min-h-[44px] flex-1 py-3 px-4 border-2 border-[#111111] rounded-2xl text-sm font-black shadow-[0_3px_0_#111111] active:translate-y-0.5 active:shadow-[0_1px_0_#111111] transition-all ${
              isDanger
                ? 'bg-[#FF3B30] text-white hover:bg-red-600'
                : 'bg-[#111111] text-white hover:bg-stone-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

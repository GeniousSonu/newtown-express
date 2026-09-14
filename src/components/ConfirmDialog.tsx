'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

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
  const isDanger = variant === 'danger';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent size="sm" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-row sm:justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] flex-1 py-3 px-4 bg-white border-2 border-[#111111] rounded-2xl text-sm font-black text-[#111111] shadow-[0_3px_0_#111111] hover:bg-stone-50 active:translate-y-0.5 active:shadow-[0_1px_0_#111111] transition-all"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-[44px] flex-1 py-3 px-4 border-2 border-[#111111] rounded-2xl text-sm font-black shadow-[0_3px_0_#111111] active:translate-y-0.5 active:shadow-[0_1px_0_#111111] transition-all ${
              isDanger
                ? 'bg-[#FF3B30] text-white hover:bg-red-600'
                : 'bg-[#111111] text-white hover:bg-stone-800'
            }`}
          >
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

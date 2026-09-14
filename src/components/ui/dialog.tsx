'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className = '', ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={`fixed inset-0 z-[100] bg-black/65 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className}`}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[96vw] sm:max-w-5xl',
};

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  size?: keyof typeof sizeStyles;
  variant?: 'dialog' | 'sheet';
  dismissable?: boolean;
  showCloseButton?: boolean;
}

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(
  (
    {
      className = '',
      children,
      size = 'md',
      variant = 'dialog',
      dismissable = true,
      showCloseButton = true,
      onPointerDownOutside,
      onEscapeKeyDown,
      ...props
    },
    ref
  ) => {
    const isSheet = variant === 'sheet';

    return (
      <DialogPortal>
        <DialogOverlay />
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
          <DialogPrimitive.Content
            ref={ref}
            onPointerDownOutside={(e) => {
              if (!dismissable) {
                e.preventDefault();
              } else {
                onPointerDownOutside?.(e);
              }
            }}
            onEscapeKeyDown={(e) => {
              if (!dismissable) {
                e.preventDefault();
              } else {
                onEscapeKeyDown?.(e);
              }
            }}
            className={`pointer-events-auto relative w-full bg-white flex flex-col max-h-[92dvh] overflow-hidden transition-all duration-200 ${
              isSheet
                ? 'rounded-t-[32px] sm:rounded-[28px] border-t-3 sm:border-3 border-x-3 border-b-0 sm:border-b-3 border-[#111111] shadow-[0_-8px_0_#111111] sm:shadow-[0_8px_0_#111111] pb-safe sm:pb-0 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom'
                : 'rounded-[28px] border-3 border-[#111111] shadow-[0_8px_0_#111111] m-3 sm:m-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
            } ${sizeStyles[size]} ${className}`}
            {...props}
          >
            {isSheet && (
              <div className="sm:hidden w-12 h-1.5 bg-stone-300 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />
            )}

            {children}

            {dismissable && showCloseButton && (
              <DialogPrimitive.Close
                aria-label="Close dialog"
                className="absolute right-4 top-4 min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center text-stone-400 hover:text-[#111111] hover:bg-stone-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#111111] z-20"
              >
                <X className="w-5 h-5" />
              </DialogPrimitive.Close>
            )}
          </DialogPrimitive.Content>
        </div>
      </DialogPortal>
    );
  }
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`flex flex-col space-y-1.5 p-5 sm:p-6 pb-2 text-left shrink-0 ${className}`}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-5 sm:p-6 pt-2 shrink-0 ${className}`}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className = '', ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={`text-lg font-black text-[#111111] tracking-tight leading-tight ${className}`}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className = '', ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={`text-sm font-bold text-[#6B6B6B] leading-relaxed ${className}`}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};

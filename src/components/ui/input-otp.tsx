'use client';

import * as React from 'react';
import { OTPInput, OTPInputContext } from 'input-otp';
import { Dot } from 'lucide-react';

const InputOTP = React.forwardRef<
  React.ComponentRef<typeof OTPInput>,
  React.ComponentPropsWithoutRef<typeof OTPInput>
>(({ className = '', containerClassName = '', ...props }, ref) => (
  <OTPInput
    ref={ref}
    containerClassName={`flex items-center justify-center gap-2 has-disabled:opacity-50 ${containerClassName}`}
    className={`disabled:cursor-not-allowed ${className}`}
    {...props}
  />
));
InputOTP.displayName = 'InputOTP';

const InputOTPGroup = React.forwardRef<
  React.ComponentRef<'div'>,
  React.ComponentPropsWithoutRef<'div'>
>(({ className = '', ...props }, ref) => (
  <div ref={ref} className={`flex items-center gap-2 ${className}`} {...props} />
));
InputOTPGroup.displayName = 'InputOTPGroup';

const InputOTPSlot = React.forwardRef<
  React.ComponentRef<'div'>,
  React.ComponentPropsWithoutRef<'div'> & { index: number }
>(({ index, className = '', ...props }, ref) => {
  const inputOTPContext = React.useContext(OTPInputContext);
  const slot = inputOTPContext.slots[index];
  const { char, hasFakeCaret, isActive } = slot || {};

  return (
    <div
      ref={ref}
      className={`relative flex w-12 h-14 sm:w-14 sm:h-16 items-center justify-center text-xl sm:text-2xl font-mono font-black bg-[#FFF8F2] border-2 border-[#111111] rounded-2xl shadow-[0_3px_0_#111111] transition-all ${
        isActive ? 'border-[#FF3B30] shadow-[0_4px_0_#111111] ring-2 ring-[#FF3B30]/30 -translate-y-0.5' : ''
      } ${className}`}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-6 w-0.5 animate-caret-blink bg-[#111111] duration-1000" />
        </div>
      )}
    </div>
  );
});
InputOTPSlot.displayName = 'InputOTPSlot';

const InputOTPSeparator = React.forwardRef<
  React.ComponentRef<'div'>,
  React.ComponentPropsWithoutRef<'div'>
>(({ ...props }, ref) => (
  <div ref={ref} role="separator" {...props}>
    <Dot className="w-4 h-4 text-stone-400" />
  </div>
));
InputOTPSeparator.displayName = 'InputOTPSeparator';

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };

'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useOrders } from '@/context/OrderContext';
import { formatINR, generateId } from '@/lib/utils';
import { AuthGate } from '@/components/AuthGate';
import { useKitchenStatus } from '@/context/KitchenStatusContext';
import { buildUpiIntentUrl, buildUpiQrCodeUrl, UPI_CONFIG } from '@/lib/upi';
import { auditScreenshotFile } from '@/lib/screenshotAudit';
import { PaymentAuditInfo } from '@/types';
import {
  Trash2,
  Plus,
  Minus,
  MapPin,
  QrCode,
  Copy,
  Check,
  UploadCloud,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Smartphone,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CartPage() {
  const router = useRouter();
  const { user, canOrderForSelf } = useAuth();
  const { items, removeFromCart, updateQuantity, clearCart, totalAmount, totalCalories } = useCart();
  const { placeOrder } = useOrders();
  const { isOpen, closedMessage } = useKitchenStatus();

  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [proofFileName, setProofFileName] = useState<string | null>(null);
  const [paymentAudit, setPaymentAudit] = useState<PaymentAuditInfo | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [showQrFallback, setShowQrFallback] = useState(false);
  const [hasTappedPay, setHasTappedPay] = useState(false);
  const [showReturnPrompt, setShowReturnPrompt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const idempotencyKeyRef = useRef<string>(generateId('idem'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate a concise human-readable reference note, e.g. NTX-84B9E1
  const transactionNote = useMemo(() => {
    const suffix = idempotencyKeyRef.current.replace(/^idem_/, '').slice(-6).toUpperCase();
    return `NTX-${suffix}`;
  }, []);

  // UPI deep link for one-tap payment
  const upiIntentUrl = useMemo(() => {
    return buildUpiIntentUrl({
      amount: totalAmount,
      transactionNote,
    });
  }, [totalAmount, transactionNote]);

  // Dynamic QR code fallback
  const fallbackQrUrl = useMemo(() => {
    return buildUpiQrCodeUrl(upiIntentUrl, 260);
  }, [upiIntentUrl]);

  // Auto-advance listener: When user returns after tapping "Pay via UPI App"
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (hasTappedPay && document.visibilityState === 'visible') {
        setShowReturnPrompt(true);
        if (!proofImage) {
          setTimeout(() => {
            fileInputRef.current?.click();
          }, 500);
        }
      }
    };

    const handleWindowFocus = () => {
      if (hasTappedPay) {
        setShowReturnPrompt(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [hasTappedPay, proofImage]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(UPI_CONFIG.vpa);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyNote = () => {
    navigator.clipboard.writeText(transactionNote);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Payment screenshot must be under 5MB.');
      return;
    }

    const fileName = file.name.toLowerCase();
    const isHeic =
      fileName.endsWith('.heic') ||
      fileName.endsWith('.heif') ||
      file.type === 'image/heic' ||
      file.type === 'image/heif';

    if (!file.type.startsWith('image/') && !isHeic) {
      setErrorMessage('Please upload a valid image file (PNG, JPG, WebP, HEIC).');
      return;
    }

    setProofFileName(file.name);

    let fileToProcess: Blob = file;
    if (isHeic) {
      setIsAuditing(true);
      try {
        const heic2any = (await import('heic2any')).default;
        const converted = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.8,
        });
        fileToProcess = Array.isArray(converted) ? converted[0] : converted;
      } catch (heicErr) {
        console.error('HEIC conversion failed:', heicErr);
        setErrorMessage('Could not process HEIC image. Please upload a standard JPG or PNG screenshot.');
        setIsAuditing(false);
        return;
      }
    }

    // Read & downsample image (1200px max width, JPEG quality 0.8)
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          setProofImage(compressed);
        } else {
          setProofImage(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(fileToProcess);

    // Run free on-device heuristic audit
    setIsAuditing(true);
    try {
      const auditFile =
        fileToProcess instanceof File
          ? fileToProcess
          : new File([fileToProcess], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
              type: 'image/jpeg',
            });
      const audit = await auditScreenshotFile(auditFile, totalAmount, transactionNote);
      setPaymentAudit(audit);
    } catch (auditErr) {
      console.warn('Screenshot heuristic audit encountered error:', auditErr);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleUseMockProof = () => {
    setProofImage('/qr-placeholder.svg');
    setProofFileName('upi-payment-receipt.png');
    setPaymentAudit({
      imageHash: `pilot_demo_${Date.now()}`,
      fileAgeMinutes: 0,
      isStale: false,
      detectedAmount: totalAmount,
      amountMatches: true,
      refNoteMatched: true,
      extractedSnippet: `Paid ₹${totalAmount} to ${UPI_CONFIG.payeeName} note ${transactionNote}`,
    });
    setErrorMessage(null);
  };

  const handlePlaceOrder = async () => {
    if (isSubmitting) return;
    if (!canOrderForSelf) {
      setErrorMessage('Kitchen staff and admin accounts cannot place food orders. Only master admin can place test orders.');
      return;
    }
    if (!isOpen) {
      setErrorMessage(closedMessage || 'Kitchen is currently closed to new orders.');
      return;
    }
    if (!user) {
      setErrorMessage('Please sign in with your @ibarts.in account to order.');
      return;
    }
    if (!user.seatCode) {
      setErrorMessage('Please pick your desk code in onboarding first.');
      router.push('/onboarding');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('Your cart is empty.');
      return;
    }
    if (!proofImage) {
      setErrorMessage('Please upload or attach your UPI payment screenshot proof before placing order.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const orderId = await placeOrder(
        items,
        totalAmount,
        proofImage,
        idempotencyKeyRef.current,
        paymentAudit || undefined
      );

      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.7 },
        });
      } catch {
        // Ignore
      }

      clearCart();
      router.push(`/orders/${orderId}`);
    } catch (err: unknown) {
      console.error('Order placement failed:', err);
      setErrorMessage((err as Error).message || 'Failed to place order. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <AuthGate>
        <div className="max-w-md mx-auto my-12 tactile-card p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-[#FFD166] border-2 border-[#111111] rounded-2xl flex items-center justify-center text-3xl shadow-[0_3px_0_#111111]">
            🛒
          </div>
          <h2 className="text-2xl font-black text-[#111111] tracking-tight">
            Your Cart is Empty
          </h2>
          <p className="text-sm text-[#6B6B6B] font-bold">
            Explore the pantry menu to add fresh snacks, Maggi, or drinks!
          </p>
          <Link
            href="/"
            className="tactile-btn inline-flex items-center gap-2 px-6 py-3.5 text-xs"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            <span>Browse Pantry Menu</span>
          </Link>
        </div>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <div className="max-w-xl mx-auto space-y-6 pb-12">
        {/* Header Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
              Review & Pay
            </h1>
            <p className="text-xs font-bold text-[#6B6B6B]">
              Verify your order items and complete UPI payment
            </p>
          </div>
          <span className="text-xs font-black px-2.5 py-1 bg-white border-2 border-[#111111] rounded-xl shadow-[0_2px_0_#111111]">
            {items.length} item(s)
          </span>
        </div>

        {/* Desk Delivery Banner */}
        <div className="tactile-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF3B30] border-2 border-[#111111] flex items-center justify-center text-white shadow-[0_2px_0_#111111]">
              <MapPin className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-black text-[#6B6B6B] uppercase tracking-wider block">
                Delivering To
              </span>
              <span className="text-lg font-black text-[#111111]">
                {user?.seatCode || 'Desk Not Picked'}
              </span>
            </div>
          </div>

          <Link
            href="/onboarding"
            className="text-xs font-black text-[#111111] bg-[#FFD166] px-3 py-1.5 rounded-xl border-2 border-[#111111] shadow-[0_2px_0_#111111] hover:bg-yellow-400 active:translate-y-0.5 active:shadow-none transition-all"
          >
            Change Desk
          </Link>
        </div>

        {/* Cart Items List */}
        <div className="tactile-card p-5 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#6B6B6B]">
            Order Breakdown
          </h3>

          <div className="divide-y-2 divide-stone-100">
            {items.map((item, index) => (
              <div key={index} className="py-3.5 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h4 className="text-base font-black text-[#111111] leading-snug">
                    {item.name}
                  </h4>

                  {/* Addon Pills */}
                  {item.selectedAddons.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {item.selectedAddons.map((addon, aIdx) => (
                        <span
                          key={aIdx}
                          className="text-[10px] font-black px-2 py-0.5 bg-[#FFF8F2] text-[#111111] border border-[#111111] rounded-md"
                        >
                          +{addon.optionName} {addon.priceDelta > 0 && `(₹${addon.priceDelta})`}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-sm font-black text-[#FF3B30]">
                      {formatINR(item.lineTotal)}
                    </span>
                    {item.lineCalories !== undefined && (
                      <span className="text-[11px] font-bold text-[#6B6B6B]">
                        • approx. {item.lineCalories} kcal
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantity Adjusters */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center bg-[#FFF8F2] p-0.5 rounded-2xl border-2 border-[#111111]">
                    <button
                      onClick={() => updateQuantity(index, item.quantity - 1)}
                      className="min-w-[44px] min-h-[44px] rounded-xl bg-white border border-[#111111] flex items-center justify-center text-[#111111] hover:bg-stone-100 font-black text-xs transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-4 h-4 stroke-[2.5]" />
                    </button>
                    <span className="text-sm font-black min-w-[28px] text-center text-[#111111]">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(index, item.quantity + 1)}
                      className="min-w-[44px] min-h-[44px] rounded-xl bg-white border border-[#111111] flex items-center justify-center text-[#111111] hover:bg-stone-100 font-black text-xs transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(index)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#475569] hover:text-[#B91C1C] rounded-xl hover:bg-stone-100 transition-colors"
                    title="Remove item"
                    aria-label="Remove item from cart"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Subtotal & Total */}
          <div className="pt-3 border-t-2 border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-sm font-black text-[#6B6B6B] block">Total Amount</span>
              <span className="text-xs font-bold text-stone-500">
                Total Calories: approx. {totalCalories} kcal
              </span>
            </div>
            <span className="text-2xl font-black text-[#111111]">
              {formatINR(totalAmount)}
            </span>
          </div>
        </div>

        {/* UPI Payment Instructions & QR */}
        {canOrderForSelf && (
          <div className="tactile-card p-5 sm:p-6 space-y-5 bg-gradient-to-b from-white to-orange-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FFD166] border-2 border-[#111111] flex items-center justify-center text-[#111111]">
                <Smartphone className="w-4 h-4 stroke-[2.5]" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-[#111111]">
                UPI Instant Checkout
              </h3>
            </div>
            <span className="text-xs font-black text-[#111111] bg-[#22C55E]/20 border border-[#22C55E] px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" /> Direct UPI
            </span>
          </div>

          {/* Primary Action: Direct UPI Intent Deep Link */}
          <div className="space-y-2">
            <a
              href={upiIntentUrl}
              onClick={() => setHasTappedPay(true)}
              className="tactile-btn w-full py-4 px-4 bg-[#FF3B30] text-white flex items-center justify-between rounded-2xl shadow-[0_4px_0_#111111] hover:bg-red-600 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/40 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 stroke-[2.5] text-white" />
                </div>
                <div>
                  <span className="text-sm sm:text-base font-black text-white block leading-tight">
                    Pay via UPI App
                  </span>
                  <span className="text-[11px] text-white/90 font-bold block">
                    GPay • PhonePe • Paytm • BHIM
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-black/25 px-3 py-1.5 rounded-xl border border-white/30 text-xs font-black shrink-0">
                <span>{formatINR(totalAmount)}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </a>

            <div className="flex items-center justify-between text-[11px] text-[#6B6B6B] font-bold px-1">
              <span>Pre-fills amount & ref note</span>
              <span className="font-mono text-[#111111] font-black">{transactionNote}</span>
            </div>
          </div>

          {/* Auto-advance Return Reminder */}
          {showReturnPrompt && (
            <div className="p-3.5 bg-blue-50 border-2 border-blue-500 rounded-2xl flex items-start gap-3 animate-in fade-in">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-xs space-y-0.5">
                <span className="font-black text-blue-950 block">
                  Completed your payment in the UPI app?
                </span>
                <span className="font-bold text-blue-800 block">
                  Attach your payment screenshot below so Newtown staff can verify and cook your order.
                </span>
              </div>
            </div>
          )}

          {/* Collapsible Fallback QR Code for 2nd Device / Webview */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowQrFallback((prev) => !prev)}
              className="w-full py-2.5 px-3 bg-white hover:bg-stone-50 border-2 border-[#111111] rounded-xl flex items-center justify-between text-xs font-black transition-colors shadow-[0_2px_0_#111111]"
            >
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#111111]" />
                <span>
                  {showQrFallback ? 'Hide QR Code' : 'Or scan with another phone / fallback QR'}
                </span>
              </div>
              {showQrFallback ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showQrFallback && (
              <div className="mt-3 flex flex-col items-center justify-center p-4 bg-white rounded-2xl border-2 border-[#111111] shadow-[0_3px_0_#111111] space-y-3 animate-in fade-in">
                <div className="w-44 h-44 bg-white p-2 rounded-2xl border-2 border-[#111111] flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fallbackQrUrl}
                    alt="Dynamic Newtown Express UPI QR"
                    className="w-full h-full object-contain"
                  />
                </div>

                <p className="text-[11px] text-[#6B6B6B] font-bold text-center">
                  Scan using Google Pay, PhonePe, Paytm, or BHIM
                </p>

                {/* UPI ID Copy Pill */}
                <div className="flex items-center justify-between w-full max-w-sm bg-[#FFF8F2] p-2.5 rounded-xl border border-[#111111]">
                  <div className="text-left pl-1">
                    <span className="text-[9px] text-[#6B6B6B] font-black uppercase block">
                      Payee VPA
                    </span>
                    <span className="text-xs font-black text-[#111111] font-mono">
                      {UPI_CONFIG.vpa}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="tactile-btn px-2.5 py-1 text-xs flex items-center gap-1 bg-white"
                  >
                    {copiedUpi ? (
                      <>
                        <Check className="w-3 h-3 stroke-[3] text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 stroke-[2.5]" />
                        <span>Copy VPA</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Reference Note Copy Pill */}
                <div className="flex items-center justify-between w-full max-w-sm bg-[#FFF8F2] p-2.5 rounded-xl border border-[#111111]">
                  <div className="text-left pl-1">
                    <span className="text-[9px] text-[#6B6B6B] font-black uppercase block">
                      Reference Note
                    </span>
                    <span className="text-xs font-black text-[#111111] font-mono">
                      {transactionNote}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyNote}
                    className="tactile-btn px-2.5 py-1 text-xs flex items-center gap-1 bg-white"
                  >
                    {copiedNote ? (
                      <>
                        <Check className="w-3 h-3 stroke-[3] text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 stroke-[2.5]" />
                        <span>Copy Note</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Screenshot Proof Upload */}
          <div className="space-y-3 pt-2 border-t-2 border-[#111111]/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-[#111111]">
                Upload Payment Screenshot
              </label>
              <span className="text-[11px] font-black text-[#FF3B30]">
                *Required for verification
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,.heic,.heif"
              className="hidden"
            />

            {!proofImage ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 px-4 border-2 border-dashed border-[#111111] hover:border-[#FF3B30] bg-[#FFF8F2] hover:bg-orange-50 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#111111] shadow-[0_2px_0_#111111] flex items-center justify-center text-[#111111] group-hover:bg-[#FF3B30] group-hover:text-white transition-colors">
                    <UploadCloud className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-black text-[#111111] block">
                      Tap to Choose or Snap Screenshot
                    </span>
                    <span className="text-[11px] font-bold text-[#6B6B6B]">
                      PNG, JPG, WebP (Max 5MB)
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleUseMockProof}
                  className="w-full text-center text-xs font-black text-[#FF3B30] hover:underline py-1"
                >
                  ⚡ Fast Pilot Demo: Attach Sample Payment Proof
                </button>
              </div>
            ) : (
              <div className="p-3 bg-white rounded-2xl border-2 border-[#111111] shadow-[0_3px_0_#111111] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={proofImage}
                      alt="Proof Preview"
                      className="w-12 h-12 rounded-xl object-cover border-2 border-[#111111]"
                    />
                    <div>
                      <span className="text-xs font-black text-[#22C55E] block flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        Proof Attached
                      </span>
                      <span className="text-[11px] font-bold text-[#6B6B6B] truncate max-w-[180px] block">
                        {proofFileName || 'payment_proof.png'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setProofImage(null);
                      setProofFileName(null);
                      setPaymentAudit(null);
                    }}
                    className="text-xs font-black text-[#FF3B30] hover:underline px-2 py-1"
                  >
                    Change
                  </button>
                </div>

                {/* On-device OCR / Audit Live Feedback */}
                {isAuditing && (
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-500 pt-1 border-t border-stone-100">
                    <Loader2 className="w-3 h-3 animate-spin text-stone-600" />
                    <span>Analyzing screenshot details...</span>
                  </div>
                )}

                {paymentAudit && !isAuditing && (
                  <div className="pt-1.5 border-t border-stone-100 flex flex-wrap gap-1.5 text-[10px]">
                    {paymentAudit.amountMatches === true && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold">
                        ✅ ₹{paymentAudit.detectedAmount} verified
                      </span>
                    )}
                    {paymentAudit.refNoteMatched && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold">
                        ✅ Ref note detected
                      </span>
                    )}
                    {paymentAudit.isStale && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Screenshot is {paymentAudit.fileAgeMinutes}m old
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

        {/* Error Message */}
        {errorMessage && (
          <div className="p-3.5 bg-red-100 text-red-800 rounded-2xl text-xs font-black border-2 border-red-400">
            {errorMessage}
          </div>
        )}

        {/* Place Order Button with Idempotency Guard OR Kitchen Closed Banner OR Staff View */}
        {!canOrderForSelf ? (
          <div className="tactile-card p-6 bg-amber-50 text-[#111111] border-2 border-[#111111] shadow-[0_4px_0_#111111] text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FFD166] text-[#111111] flex items-center justify-center text-2xl border-2 border-[#111111]">
              👨‍🍳
            </div>
            <h3 className="text-base font-black text-[#111111]">
              Staff View Only
            </h3>
            <p className="text-xs text-stone-600 font-bold max-w-sm mx-auto">
              Kitchen staff and admin accounts cannot place food orders for themselves. Only the master admin can place test orders.
            </p>
            <div className="pt-2">
              <Link href="/kitchen" className="tactile-btn inline-block px-4 py-2 text-xs">
                Go to Kitchen Queue
              </Link>
            </div>
          </div>
        ) : !isOpen ? (
          <div className="tactile-card p-6 bg-[#111111] text-white border-2 border-[#111111] shadow-[0_4px_0_#FF3B30] text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FF3B30] text-white flex items-center justify-center text-2xl shadow-xs">
              🔒
            </div>
            <h3 className="text-base font-black text-white">
              Kitchen is Closed Right Now
            </h3>
            <p className="text-xs text-stone-300 font-bold max-w-sm mx-auto">
              {closedMessage || 'We are currently not accepting new orders. Please check back soon!'}
            </p>
            <div className="pt-1">
              <span className="inline-block px-3 py-1 bg-stone-800 text-amber-300 text-[11px] font-black rounded-lg border border-stone-700">
                ✨ Your cart items are saved and ready for when we reopen
              </span>
            </div>
          </div>
        ) : (
          <button
            onClick={handlePlaceOrder}
            disabled={isSubmitting || !proofImage}
            className="tactile-btn w-full flex items-center justify-between py-4 px-6 text-base disabled:opacity-50 disabled:pointer-events-none"
          >
            <span>
              {isSubmitting ? 'Placing Order & Notifying Kitchen...' : "I've Paid — Place Order"}
            </span>
            <div className="flex items-center gap-2">
              <span className="bg-white text-[#111111] px-3 py-1 rounded-xl text-sm font-black border border-[#111111]">
                {formatINR(totalAmount)}
              </span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </div>
          </button>
        )}

        <p className="text-center text-[11px] font-bold text-[#6B6B6B]">
          🔒 Newtown kitchen staff verifies UPI reference before preparing food.
        </p>
      </div>
    </AuthGate>
  );
}

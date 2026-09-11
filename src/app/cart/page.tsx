'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useOrders } from '@/context/OrderContext';
import { formatINR, generateId } from '@/lib/utils';
import { DEFAULT_PAYMENT_CONFIG } from '@/lib/seedData';
import { AuthGate } from '@/components/AuthGate';
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
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, removeFromCart, updateQuantity, clearCart, totalAmount, totalCalories } = useCart();
  const { placeOrder } = useOrders();

  const [copiedUpi, setCopiedUpi] = useState(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [proofFileName, setProofFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const idempotencyKeyRef = useRef<string>(generateId('idem'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(DEFAULT_PAYMENT_CONFIG.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Payment screenshot must be under 5MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    setProofFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.65);
          setProofImage(compressed);
        } else {
          setProofImage(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUseMockProof = () => {
    setProofImage('/qr-placeholder.svg');
    setProofFileName('upi-payment-receipt.png');
    setErrorMessage(null);
  };

  const handlePlaceOrder = async () => {
    if (isSubmitting) return;
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
        idempotencyKeyRef.current
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
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-[#FFF8F2] p-1 rounded-xl border-2 border-[#111111]">
                    <button
                      onClick={() => updateQuantity(index, item.quantity - 1)}
                      className="w-6 h-6 rounded-lg bg-white border border-[#111111] flex items-center justify-center text-[#111111] hover:bg-stone-100 font-black text-xs"
                    >
                      <Minus className="w-3 h-3 stroke-[2.5]" />
                    </button>
                    <span className="text-xs font-black w-4 text-center text-[#111111]">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(index, item.quantity + 1)}
                      className="w-6 h-6 rounded-lg bg-white border border-[#111111] flex items-center justify-center text-[#111111] hover:bg-stone-100 font-black text-xs"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(index)}
                    className="p-2 text-[#6B6B6B] hover:text-[#FF3B30] rounded-xl hover:bg-stone-100 transition-colors"
                    title="Remove item"
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
        <div className="tactile-card p-5 sm:p-6 space-y-5 bg-gradient-to-b from-white to-orange-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FFD166] border-2 border-[#111111] flex items-center justify-center text-[#111111]">
                <QrCode className="w-4 h-4 stroke-[2.5]" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-[#111111]">
                Scan & Pay via UPI
              </h3>
            </div>
            <span className="text-xs font-black text-[#111111] bg-[#22C55E]/20 border border-[#22C55E] px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" /> Direct UPI
            </span>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-5 bg-white rounded-2xl border-2 border-[#111111] shadow-[0_3px_0_#111111]">
            <div className="w-44 h-44 bg-white p-2 rounded-2xl border-2 border-[#111111] shadow-[0_2px_0_#111111] mb-3 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/qr-placeholder.svg"
                alt="Newtown Express UPI QR"
                className="w-full h-full object-contain"
              />
            </div>

            <p className="text-xs text-[#6B6B6B] font-bold text-center mb-3">
              Scan with Google Pay, PhonePe, Paytm, or BHIM
            </p>

            {/* UPI ID Copy Pill */}
            <div className="flex items-center justify-between w-full max-w-sm bg-[#FFF8F2] p-2.5 rounded-xl border-2 border-[#111111]">
              <div className="text-left pl-1">
                <span className="text-[10px] text-[#6B6B6B] font-black uppercase block">
                  UPI ID
                </span>
                <span className="text-xs font-black text-[#111111] font-mono">
                  {DEFAULT_PAYMENT_CONFIG.upiId}
                </span>
              </div>
              <button
                onClick={handleCopyUpi}
                className="tactile-btn px-3 py-1.5 text-xs flex items-center gap-1"
              >
                {copiedUpi ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Screenshot Proof Upload */}
          <div className="space-y-3">
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
              accept="image/*"
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
              <div className="p-3 bg-white rounded-2xl border-2 border-[#111111] shadow-[0_3px_0_#111111] flex items-center justify-between">
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
                  }}
                  className="text-xs font-black text-[#FF3B30] hover:underline px-2 py-1"
                >
                  Change
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="p-3.5 bg-red-100 text-red-800 rounded-2xl text-xs font-black border-2 border-red-400">
            {errorMessage}
          </div>
        )}

        {/* Place Order Button with Idempotency Guard */}
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

        <p className="text-center text-[11px] font-bold text-[#6B6B6B]">
          🔒 Newtown kitchen staff verifies UPI reference before preparing food.
        </p>
      </div>
    </AuthGate>
  );
}

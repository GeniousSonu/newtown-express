'use client';

import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface PaymentProofModalProps {
  imageUrl: string | null;
  onClose: () => void;
  title?: string;
}

export function PaymentProofModal({ imageUrl, onClose, title = 'Payment Screenshot' }: PaymentProofModalProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.5, 1));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <Dialog open={Boolean(imageUrl)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        size="lg"
        showCloseButton={true}
        className="p-0 overflow-hidden bg-white border-3 border-[#111111] shadow-[0_8px_0_#111111]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#F4FBF7] border-b-2 border-[#134E4A]/20 flex items-center justify-between pr-14">
          <div>
            <DialogTitle className="text-base font-black text-[#0F172A]">
              {title}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#475569] font-bold mt-0.5">
              Verify transaction amount, timestamp & reference
            </DialogDescription>
          </div>

          {imageUrl && (
            <div className="flex items-center gap-2">
              <a
                href={imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[36px] px-3 bg-white hover:bg-stone-100 text-[#0F766E] border-2 border-[#0F766E]/40 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors shadow-xs"
                title="Open screenshot directly in new tab"
              >
                <span>Open in tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2 bg-stone-100 border-b border-stone-200 flex items-center justify-between text-xs">
          <span className="font-bold text-[#475569]">
            Scale: <span className="font-black text-[#0F172A]">{Math.round(zoomLevel * 100)}%</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1}
              className="min-h-[36px] min-w-[36px] rounded-lg bg-white border border-stone-300 flex items-center justify-center text-[#0F172A] hover:bg-stone-50 disabled:opacity-40 disabled:pointer-events-none"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3}
              className="min-h-[36px] min-w-[36px] rounded-lg bg-white border border-stone-300 flex items-center justify-center text-[#0F172A] hover:bg-stone-50 disabled:opacity-40 disabled:pointer-events-none"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {zoomLevel > 1 && (
              <button
                type="button"
                onClick={handleResetZoom}
                className="min-h-[36px] px-2.5 rounded-lg bg-white border border-stone-300 flex items-center gap-1 text-[#0F172A] hover:bg-stone-50 text-xs font-bold"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Viewer area */}
        <div className="relative flex-1 overflow-auto bg-stone-900/95 flex items-center justify-center min-h-[300px] p-4 select-none">
          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-stone-900/80 text-white z-10">
              <Loader2 className="w-8 h-8 animate-spin text-[#14B8A6]" />
              <span className="text-xs font-bold">Loading screenshot...</span>
            </div>
          )}

          {error ? (
            <div className="p-6 text-center max-w-sm space-y-3 bg-white rounded-2xl border-2 border-red-300">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-[#0F172A]">Failed to display preview</h4>
              <p className="text-xs text-[#475569]">
                The image format could not be rendered inline or the network timed out.
              </p>
              {imageUrl && (
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-black shadow-xs hover:bg-[#115E59]"
                >
                  <span>Open in new tab ↗</span>
                </a>
              )}
            </div>
          ) : imageUrl ? (
            <div
              className="transition-transform duration-150 ease-out origin-center flex items-center justify-center w-full"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Payment proof screenshot"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setError(true);
                }}
                className="max-h-[68dvh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

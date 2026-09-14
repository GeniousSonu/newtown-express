'use client';

import React, { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Check, ZoomIn, ZoomOut } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface AvatarCropModalProps {
  imageSrc: string;
  onConfirm: (croppedAreaPixels: Area) => void;
  onCancel: () => void;
}

export function AvatarCropModal({
  imageSrc,
  onConfirm,
  onCancel,
}: AvatarCropModalProps) {
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback(
    (_croppedArea: Area, currentCroppedAreaPixels: Area) => {
      setCroppedAreaPixels(currentCroppedAreaPixels);
    },
    []
  );

  const handleApplyCrop = () => {
    if (croppedAreaPixels) {
      onConfirm(croppedAreaPixels);
    }
  };

  return (
    <Dialog open={Boolean(imageSrc)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent size="md" className="p-0 overflow-hidden select-none">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b-2 border-[#111111] bg-[#FFF8F2] flex items-center justify-between pr-14">
          <div>
            <DialogTitle className="text-base sm:text-lg font-black text-[#111111] tracking-tight">
              Crop Profile Photo
            </DialogTitle>
            <DialogDescription className="text-xs text-[#475569] font-bold">
              Drag to position and zoom to fit your face
            </DialogDescription>
          </div>
        </div>

        {/* Cropper Work Area */}
        <div className="relative w-full h-72 sm:h-80 bg-stone-950 overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={true}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Zoom Controls */}
        <div className="p-4 sm:p-5 space-y-4 bg-white border-t-2 border-[#111111]/10">
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-[#475569] shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-[#FF3B30] h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
              aria-label="Zoom photo"
            />
            <ZoomIn className="w-4 h-4 text-[#475569] shrink-0" />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 min-h-[44px] py-2.5 px-4 text-xs font-black text-[#475569] hover:bg-stone-100 rounded-xl border-2 border-stone-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyCrop}
              className="tactile-btn flex-1 min-h-[44px] py-2.5 px-4 text-xs font-black bg-[#FF3B30] text-white flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Use Photo</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

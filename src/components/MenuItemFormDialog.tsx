'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  menuItemSchema,
  MenuItemFormData,
} from '@/lib/validations/schemas';
import { MenuItem } from '@/types';
import { db, storage } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { CategoryCombobox } from '@/components/CategoryCombobox';
import { AddonGroupFieldArray } from '@/components/AddonGroupFieldArray';
import { FoodPlaceholder } from '@/lib/menuPlaceholder';
import {
  UploadCloud,
  Sparkles,
  Flame,
  AlertTriangle,
  Loader2,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface MenuItemFormDialogProps {
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  itemToEdit?: MenuItem | null;
  existingCategories?: string[];
  onSaved?: (savedItem: MenuItem) => void;
}

const DEFAULT_FORM_VALUES: MenuItemFormData = {
  name: '',
  price: 0,
  category: '',
  description: '',
  imageUrl: '',
  calories: null,
  healthTag: 'balanced',
  isAvailable: true,
  addonGroups: [],
};

import { useMenu } from '@/context/MenuContext';

export function MenuItemFormDialog({
  isOpen,
  open,
  onClose,
  onOpenChange,
  itemToEdit,
  existingCategories = [],
  onSaved,
}: MenuItemFormDialogProps) {
  const { categories: menuCategories } = useMenu();
  const distinctCategories = Array.from(new Set([...existingCategories, ...menuCategories])).filter(Boolean);

  const isDialogOpen = open !== undefined ? open : (isOpen ?? false);
  const handleClose = () => {
    onClose?.();
    onOpenChange?.(false);
  };

  const isEditMode = Boolean(itemToEdit?.id);
  const [isMobile, setIsMobile] = useState(false);
  const [showOptionalDetails, setShowOptionalDetails] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Photo state
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [isPhotoRemoved, setIsPhotoRemoved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  // Re-populate form whenever dialog opens or itemToEdit changes
  useEffect(() => {
    if (isDialogOpen) {
      if (itemToEdit) {
        reset({
          name: itemToEdit.name || '',
          price: itemToEdit.price || 0,
          category: itemToEdit.category || '',
          description: itemToEdit.description || '',
          imageUrl: itemToEdit.imageUrl || '',
          calories: typeof itemToEdit.calories === 'number' ? itemToEdit.calories : null,
          healthTag: itemToEdit.healthTag || 'balanced',
          isAvailable: itemToEdit.isAvailable !== false,
          addonGroups: itemToEdit.addonGroups ? JSON.parse(JSON.stringify(itemToEdit.addonGroups)) : [],
        });
        setPhotoPreviewUrl(itemToEdit.imageUrl || null);
        setSelectedPhotoFile(null);
        setIsPhotoRemoved(false);
      } else {
        reset(DEFAULT_FORM_VALUES);
        setPhotoPreviewUrl(null);
        setSelectedPhotoFile(null);
        setIsPhotoRemoved(false);
      }
      setShowDiscardConfirm(false);
    }
  }, [isDialogOpen, itemToEdit, reset]);

  // Watch calories to auto-suggest health tag
  const watchedCalories = watch('calories');
  const watchedName = watch('name');
  const watchedCategory = watch('category');
  const [hasManuallyChangedHealthTag, setHasManuallyChangedHealthTag] = useState(false);

  useEffect(() => {
    if (!hasManuallyChangedHealthTag && watchedCalories !== null && watchedCalories !== undefined) {
      const cals = Number(watchedCalories);
      if (!isNaN(cals) && cals >= 0) {
        if (cals < 300) {
          setValue('healthTag', 'light', { shouldDirty: true });
        } else if (cals <= 600) {
          setValue('healthTag', 'balanced', { shouldDirty: true });
        } else {
          setValue('healthTag', 'indulgent', { shouldDirty: true });
        }
      }
    }
  }, [watchedCalories, hasManuallyChangedHealthTag, setValue]);

  // Photo selection handler
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a valid image file (JPG, PNG, WebP).');
      return;
    }

    // Max 15MB initial selection before compression
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Image file size exceeds 15MB. Please choose a smaller image.');
      return;
    }

    setSelectedPhotoFile(file);
    setIsPhotoRemoved(false);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreviewUrl(objectUrl);
  };

  const handleRemovePhoto = () => {
    setSelectedPhotoFile(null);
    setPhotoPreviewUrl(null);
    setIsPhotoRemoved(true);
    setValue('imageUrl', '', { shouldDirty: true });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Safe close request with dirty check
  const handleRequestClose = () => {
    if (isDirty || selectedPhotoFile || isPhotoRemoved) {
      setShowDiscardConfirm(true);
    } else {
      handleClose();
    }
  };

  // Submit handler: Upload to Storage -> Write Firestore -> Clean up on failure
  const onSubmit = async (data: MenuItemFormData) => {
    if (!db) {
      toast.error('Database connection unavailable.');
      return;
    }

    setIsSubmitting(true);
    const itemId = itemToEdit?.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const previousImageUrl = itemToEdit?.imageUrl || null;
    let newDownloadUrl = data.imageUrl || (isPhotoRemoved ? '' : previousImageUrl || '');
    let uploadedStorageRef: ReturnType<typeof ref> | null = null;

    try {
      // 1. If user selected a new photo file, compress and upload to Firebase Storage FIRST
      if (selectedPhotoFile && storage) {
        try {
          // Client-side image compression: target max 1200px and ~400KB
          const compressedFile = await imageCompression(selectedPhotoFile, {
            maxSizeMB: 0.4,
            maxWidthOrHeight: 1200,
            useWebWorker: true,
            fileType: 'image/jpeg',
          });

          const timestamp = Date.now();
          const storagePath = `menuItems/${itemId}/${timestamp}.jpg`;
          uploadedStorageRef = ref(storage, storagePath);

          await uploadBytes(uploadedStorageRef, compressedFile, {
            contentType: 'image/jpeg',
          });

          newDownloadUrl = await getDownloadURL(uploadedStorageRef);
        } catch (uploadErr) {
          console.error('[MENU-ITEM] Photo upload failed:', uploadErr);
          toast.error('Failed to upload menu photo. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Prepare payload for Firestore
      const sanitizedAddonGroups =
        data.addonGroups?.map((group) => ({
          groupName: group.groupName.trim(),
          required: Boolean(group.required),
          multiSelect: Boolean(group.multiSelect),
          options: group.options.map((opt) => ({
            name: opt.name.trim(),
            priceDelta: Number(opt.priceDelta),
            ...(typeof opt.calorieDelta === 'number' && !isNaN(opt.calorieDelta)
              ? { calorieDelta: Number(opt.calorieDelta) }
              : {}),
          })),
        })) || [];

      const payload: Partial<MenuItem> = {
        name: data.name.trim(),
        price: Number(data.price),
        category: data.category.trim().toUpperCase(),
        description: data.description ? data.description.trim() : '',
        calories: typeof data.calories === 'number' && data.calories >= 0 ? Number(data.calories) : 0,
        healthTag: data.healthTag,
        isAvailable: data.isAvailable,
        addonGroups: sanitizedAddonGroups,
        imageUrl: newDownloadUrl,
        updatedAt: Date.now(),
      };

      if (!isEditMode) {
        payload.id = itemId;
        payload.sortOrder = itemToEdit?.sortOrder ?? 999;
      }

      // 3. Write/Update Firestore document
      try {
        await setDoc(doc(db, 'menuItems', itemId), payload, { merge: true });
      } catch (firestoreErr) {
        console.error('[MENU-ITEM] Firestore write failed:', firestoreErr);
        // Error handling: if Firestore write fails after a new upload, clean up orphaned Storage file!
        if (uploadedStorageRef) {
          try {
            await deleteObject(uploadedStorageRef);
          } catch (delCleanupErr) {
            console.warn('[MENU-ITEM] Failed to delete orphaned storage image:', delCleanupErr);
          }
        }
        throw firestoreErr;
      }

      // 4. In EDIT mode: if previous photo was replaced, delete old image from Storage ONLY AFTER write succeeded
      if (
        isEditMode &&
        storage &&
        previousImageUrl &&
        previousImageUrl !== newDownloadUrl &&
        previousImageUrl.includes('firebasestorage')
      ) {
        try {
          const oldStorageRef = ref(storage, previousImageUrl);
          await deleteObject(oldStorageRef);
        } catch (cleanupOldErr) {
          console.warn('[MENU-ITEM] Previous image cleanup notice:', cleanupOldErr);
        }
      }

      const fullSavedItem: MenuItem = {
        id: itemId,
        name: payload.name!,
        price: payload.price!,
        category: payload.category!,
        description: payload.description || '',
        calories: payload.calories || 0,
        healthTag: payload.healthTag || 'balanced',
        isAvailable: payload.isAvailable ?? true,
        addonGroups: sanitizedAddonGroups,
        imageUrl: newDownloadUrl,
        sortOrder: itemToEdit?.sortOrder ?? 999,
      };

      toast.success(
        isEditMode
          ? `Updated "${fullSavedItem.name}" successfully!`
          : `Added "${fullSavedItem.name}" to menu!`
      );

      onSaved?.(fullSavedItem);
      handleClose();
    } catch (saveErr) {
      console.error('[MENU-ITEM] Save failed:', saveErr);
      toast.error('Failed to save menu item. Please check your network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog
        open={isDialogOpen}
        onOpenChange={(next) => {
          if (!next) {
            handleRequestClose();
          }
        }}
      >
        <DialogContent
          size="lg"
          variant={isMobile ? 'sheet' : 'dialog'}
          dismissable={!isSubmitting}
          showCloseButton={!isSubmitting}
          onPointerDownOutside={(e) => {
            e.preventDefault();
            handleRequestClose();
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            handleRequestClose();
          }}
          className="p-0 max-h-[90dvh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <DialogHeader className="p-5 sm:p-6 pb-4 border-b-2 border-[#111111] bg-[#FFF8F2]">
            <DialogTitle className="text-lg sm:text-xl font-black text-[#111111] flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#FFD166] border-2 border-[#111111] flex items-center justify-center text-sm">
                🍽️
              </span>
              <span>{isEditMode ? `Edit "${itemToEdit?.name}"` : 'Add New Menu Item'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs font-bold text-[#475569]">
              {isEditMode
                ? 'Update dish pricing, details, photo, or customer add-ons.'
                : 'Create a new pantry dish with live pricing and customizations.'}
            </DialogDescription>
          </DialogHeader>

          {/* Form Body - Scrollable */}
          <form
            id="menu-item-form"
            onSubmit={handleSubmit(onSubmit)}
            className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-left"
          >
            {/* SECTION 1: REQUIRED FIELDS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-[#111111]/10 pb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#FF3B30] flex items-center gap-1.5">
                  <span>Required Information</span>
                  <span className="text-xs">*</span>
                </h3>
                <span className="text-[10px] font-bold text-stone-400">
                  Must be filled to publish
                </span>
              </div>

              {/* Item Name */}
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-[#111111] flex items-center gap-1">
                  <span>Dish / Item Name</span>
                  <span className="text-[#FF3B30]">*</span>
                </label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  placeholder="e.g. Classic Cheese Maggi, Paneer Tikka Sandwich"
                  {...register('name')}
                  className={`w-full min-h-[46px] px-3.5 py-2.5 bg-white border-2 rounded-2xl text-xs sm:text-sm font-bold text-[#111111] placeholder:text-stone-400 focus:outline-none shadow-[0_2px_0_#111111] ${
                    errors.name ? 'border-red-500' : 'border-[#111111] focus:border-[#FF3B30]'
                  }`}
                />
                {errors.name && (
                  <p className="text-[11px] font-bold text-red-600 px-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Price & Category Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Price Input */}
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-[#111111] flex items-center gap-1">
                    <span>Base Price (₹)</span>
                    <span className="text-[#FF3B30]">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-stone-600">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      disabled={isSubmitting}
                      placeholder="0.00"
                      {...register('price', { valueAsNumber: true })}
                      className={`w-full min-h-[46px] pl-8 pr-3.5 py-2.5 bg-white border-2 rounded-2xl text-xs sm:text-sm font-black text-[#111111] placeholder:text-stone-400 focus:outline-none shadow-[0_2px_0_#111111] ${
                        errors.price ? 'border-red-500' : 'border-[#111111] focus:border-[#FF3B30]'
                      }`}
                    />
                  </div>
                  {errors.price && (
                    <p className="text-[11px] font-bold text-red-600 px-1">
                      {errors.price.message}
                    </p>
                  )}
                </div>

                {/* Searchable Category Combobox */}
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-[#111111] flex items-center gap-1">
                    <span>Category</span>
                    <span className="text-[#FF3B30]">*</span>
                  </label>
                  <Controller
                    control={control}
                    name="category"
                    render={({ field }) => (
                      <CategoryCombobox
                        value={field.value}
                        onChange={field.onChange}
                        existingCategories={distinctCategories}
                        error={errors.category?.message}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: OPTIONAL DETAILS (Collapsible / Visually Secondary) */}
            <div className="space-y-4 pt-2">
              <button
                type="button"
                onClick={() => setShowOptionalDetails((prev) => !prev)}
                className="w-full flex items-center justify-between py-2 border-b-2 border-stone-200 text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 stroke-[2.5]" />
                  <span className="text-xs font-black uppercase tracking-wider text-[#111111] group-hover:text-[#FF3B30] transition-colors">
                    Optional Details & Photo
                  </span>
                </div>
                <span className="text-stone-400 group-hover:text-[#111111]">
                  {showOptionalDetails ? (
                    <ChevronUp className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 stroke-[3]" />
                  )}
                </span>
              </button>

              {showOptionalDetails && (
                <div className="space-y-4 animate-in fade-in">
                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase text-[#6B6B6B]">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      disabled={isSubmitting}
                      placeholder="Short appetizing description of the dish..."
                      {...register('description')}
                      className="w-full p-3 bg-white border-2 border-[#111111] rounded-2xl text-xs sm:text-sm font-bold text-[#111111] placeholder:text-stone-400 focus:outline-none focus:border-[#FF3B30] shadow-[0_2px_0_#111111]"
                    />
                  </div>

                  {/* Photo Upload with Live Preview & Deterministic Placeholder */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-[#6B6B6B] block">
                      Dish Photo
                    </label>

                    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-stone-50 border-2 border-[#111111] rounded-2xl shadow-[0_2px_0_#111111]">
                      {/* Image Preview Box */}
                      <div className="w-28 h-20 sm:w-32 sm:h-24 rounded-xl border-2 border-[#111111] overflow-hidden bg-white shrink-0 shadow-xs relative">
                        {photoPreviewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photoPreviewUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FoodPlaceholder
                            item={{
                              name: watchedName || 'Preview',
                              category: watchedCategory || 'Special',
                            }}
                          />
                        )}
                      </div>

                      {/* Upload Controls & Notice */}
                      <div className="flex-1 space-y-2 text-center sm:text-left">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoSelect}
                            className="hidden"
                            id="menu-photo-file-input"
                            disabled={isSubmitting}
                          />
                          <label
                            htmlFor="menu-photo-file-input"
                            className="tactile-btn inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-xs font-black text-[#111111] border border-[#111111] rounded-xl hover:bg-stone-100 cursor-pointer shadow-xs"
                          >
                            <UploadCloud className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>{photoPreviewUrl ? 'Change Photo' : 'Upload Photo'}</span>
                          </label>

                          {photoPreviewUrl && (
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              disabled={isSubmitting}
                              className="px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <p className="text-[10px] font-bold text-stone-500">
                          {photoPreviewUrl
                            ? 'Selected photo will be compressed (< 500KB) before saving.'
                            : 'If omitted, an appetizing deterministic placeholder icon is generated.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Calories and Health Tag Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Calories Input */}
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase text-[#6B6B6B] flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-[#FF3B30]" />
                        <span>Approx. Calories (kcal)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        disabled={isSubmitting}
                        placeholder="e.g. 350"
                        {...register('calories', {
                          setValueAs: (v) => (v === '' || v === null || isNaN(Number(v)) ? null : Number(v)),
                        })}
                        className="w-full min-h-[46px] px-3.5 py-2.5 bg-white border-2 border-[#111111] rounded-2xl text-xs sm:text-sm font-bold text-[#111111] placeholder:text-stone-400 focus:outline-none focus:border-[#FF3B30] shadow-[0_2px_0_#111111]"
                      />
                      {errors.calories && (
                        <p className="text-[11px] font-bold text-red-600 px-1">
                          {errors.calories.message}
                        </p>
                      )}
                    </div>

                    {/* Health Tag Dropdown */}
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase text-[#6B6B6B]">
                        Health Tag (Auto-suggested)
                      </label>
                      <select
                        disabled={isSubmitting}
                        {...register('healthTag', {
                          onChange: () => setHasManuallyChangedHealthTag(true),
                        })}
                        className="w-full min-h-[46px] px-3 py-2 bg-white border-2 border-[#111111] rounded-2xl text-xs sm:text-sm font-black text-[#111111] focus:outline-none focus:border-[#FF3B30] shadow-[0_2px_0_#111111] cursor-pointer"
                      >
                        <option value="light">🥗 Light (&lt; 300 kcal)</option>
                        <option value="balanced">🥪 Balanced (300 - 600 kcal)</option>
                        <option value="indulgent">🍔 Indulgent (&gt; 600 kcal)</option>
                      </select>
                    </div>
                  </div>

                  {/* Immediate Stock Availability Toggle */}
                  <div className="p-3.5 bg-white border-2 border-[#111111] rounded-2xl shadow-[0_2px_0_#111111] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-[#111111] block">
                        Available in Stock
                      </span>
                      <span className="text-[10px] font-bold text-stone-500">
                        When toggled off, customers see this marked as &quot;Sold Out&quot;.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={isSubmitting}
                        {...register('isAvailable')}
                        className="w-5 h-5 rounded-md accent-[#22C55E] cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: ADDON GROUPS (Dynamic Array) */}
            <div className="pt-2 border-t-2 border-stone-200">
              <AddonGroupFieldArray
                control={control}
                register={register}
                errors={errors}
                disabled={isSubmitting}
              />
            </div>
          </form>

          {/* Footer Actions */}
          <DialogFooter className="p-4 sm:p-5 border-t-2 border-[#111111] bg-[#FAFAF9] flex flex-row items-center justify-between sm:justify-end gap-2.5 pb-safe">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleRequestClose}
              className="tactile-btn min-h-[44px] px-4 py-2 text-xs font-black bg-white text-[#111111] border-2 border-[#111111] rounded-xl hover:bg-stone-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="menu-item-form"
              disabled={isSubmitting}
              className="tactile-btn min-h-[44px] px-6 py-2 text-xs font-black bg-[#FF3B30] text-white border-2 border-[#111111] rounded-xl shadow-[0_3px_0_#111111] flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isEditMode ? 'Save Changes' : 'Create Item'}</span>
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard Confirmation Nested Dialog */}
      <Dialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <DialogContent size="sm" className="p-5 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border-2 border-amber-600 flex items-center justify-center text-amber-600 mx-auto shadow-xs">
            <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-base font-black text-[#111111]">
              Discard unsaved changes?
            </DialogTitle>
            <DialogDescription className="text-xs font-bold text-stone-600">
              You have unsaved edits in this form. Closing will lose any changes you have made.
            </DialogDescription>
          </div>
          <div className="flex gap-2 justify-center pt-2">
            <button
              type="button"
              onClick={() => setShowDiscardConfirm(false)}
              className="tactile-btn flex-1 py-2 px-3 text-xs font-black bg-white border-2 border-[#111111] rounded-xl"
            >
              Keep Editing
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDiscardConfirm(false);
                handleClose();
              }}
              className="tactile-btn flex-1 py-2 px-3 text-xs font-black bg-[#FF3B30] text-white border-2 border-[#111111] rounded-xl shadow-[0_2px_0_#111111]"
            >
              Discard
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

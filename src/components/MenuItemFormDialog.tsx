'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
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
import { useMenu } from '@/context/MenuContext';
import {
  UploadCloud,
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

// helper functions component er baire rakhlam react compiler purity issue solve korar jonno
function generateMenuItemId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function getCurrentTimestamp(): number {
  return Date.now();
}

interface MenuItemFormModalContentProps {
  itemToEdit?: MenuItem | null;
  existingCategories: string[];
  onSaved?: (savedItem: MenuItem) => void;
  onClose: () => void;
}

function MenuItemFormModalContent({
  itemToEdit,
  existingCategories,
  onSaved,
  onClose,
}: MenuItemFormModalContentProps) {
  const isEditMode = Boolean(itemToEdit?.id);
  const [isMobile, setIsMobile] = useState(false);
  const [showOptionalDetails, setShowOptionalDetails] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // photo preview state
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(itemToEdit?.imageUrl || null);
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
    setValue,
    formState: { errors, isDirty },
  } = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: itemToEdit
      ? {
          name: itemToEdit.name,
          price: itemToEdit.price,
          category: itemToEdit.category,
          description: itemToEdit.description || '',
          imageUrl: itemToEdit.imageUrl || '',
          calories: itemToEdit.calories || null,
          healthTag: itemToEdit.healthTag || 'balanced',
          isAvailable: itemToEdit.isAvailable !== false,
          addonGroups: itemToEdit.addonGroups ? JSON.parse(JSON.stringify(itemToEdit.addonGroups)) : [],
        }
      : DEFAULT_FORM_VALUES,
  });

  // calorie onujayi health tag auto suggest koro
  const watchedCalories = useWatch({ control, name: 'calories' });
  const watchedName = useWatch({ control, name: 'name' });
  const watchedCategory = useWatch({ control, name: 'category' });
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

  // photo select korle preview update koro
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a valid image file (JPG, PNG, WebP).');
      return;
    }

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

  const handleRequestClose = () => {
    if (isDirty || selectedPhotoFile || isPhotoRemoved) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  // photo upload kore firestore update koro
  const onSubmit = async (data: MenuItemFormData) => {
    if (!db) {
      toast.error('Database connection unavailable.');
      return;
    }

    setIsSubmitting(true);
    const itemId = itemToEdit?.id || generateMenuItemId();
    const previousImageUrl = itemToEdit?.imageUrl || null;
    let newDownloadUrl = data.imageUrl || (isPhotoRemoved ? '' : previousImageUrl || '');
    let uploadedStorageRef: ReturnType<typeof ref> | null = null;

    try {
      if (selectedPhotoFile && storage) {
        try {
          const compressedFile = await imageCompression(selectedPhotoFile, {
            maxSizeMB: 0.4,
            maxWidthOrHeight: 1200,
            useWebWorker: true,
            fileType: 'image/jpeg',
          });

          const timestamp = getCurrentTimestamp();
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
        updatedAt: getCurrentTimestamp(),
      };

      if (!isEditMode) {
        payload.id = itemId;
        payload.sortOrder = itemToEdit?.sortOrder ?? 999;
      }

      try {
        await setDoc(doc(db, 'menuItems', itemId), payload, { merge: true });
      } catch (firestoreErr) {
        console.error('[MENU-ITEM] Firestore write failed:', firestoreErr);
        if (uploadedStorageRef) {
          try {
            await deleteObject(uploadedStorageRef);
          } catch (delCleanupErr) {
            console.warn('[MENU-ITEM] Failed to delete orphaned storage image:', delCleanupErr);
          }
        }
        throw firestoreErr;
      }

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
      onClose();
    } catch (saveErr) {
      console.error('[MENU-ITEM] Save failed:', saveErr);
      toast.error('Failed to save menu item. Please check your network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
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
              {/* Price */}
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-[#111111] flex items-center gap-1">
                  <span>Price (₹)</span>
                  <span className="text-[#FF3B30]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-sm text-stone-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    disabled={isSubmitting}
                    placeholder="50"
                    {...register('price', { valueAsNumber: true })}
                    className={`w-full min-h-[46px] pl-8 pr-3.5 py-2.5 bg-white border-2 rounded-2xl text-xs sm:text-sm font-bold text-[#111111] placeholder:text-stone-400 focus:outline-none shadow-[0_2px_0_#111111] ${
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

              {/* Category Combobox */}
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-[#111111] flex items-center gap-1">
                  <span>Category</span>
                  <span className="text-[#FF3B30]">*</span>
                </label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <CategoryCombobox
                      value={field.value}
                      onChange={field.onChange}
                      existingCategories={existingCategories}
                      error={errors.category?.message}
                      disabled={isSubmitting}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: OPTIONAL DETAILS (Collapsible) */}
          <div className="space-y-3 pt-2 border-t-2 border-stone-200">
            <button
              type="button"
              onClick={() => setShowOptionalDetails(!showOptionalDetails)}
              className="w-full flex items-center justify-between py-2 text-left text-xs font-black uppercase tracking-wider text-[#111111] hover:text-[#FF3B30] transition-colors"
            >
              <span className="flex items-center gap-2">
                <span>Optional Details & Photo</span>
                <span className="text-[10px] font-bold text-stone-400 normal-case">
                  (Description, Photo, Calories, Health Tag)
                </span>
              </span>
              {showOptionalDetails ? (
                <ChevronUp className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <ChevronDown className="w-4 h-4 stroke-[2.5]" />
              )}
            </button>

            {showOptionalDetails && (
              <div className="space-y-4 pt-1">
                {/* Description */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase text-[#6B6B6B]">
                      Description
                    </label>
                    <span className="text-[10px] font-bold text-stone-400">
                      Optional, max 300 chars
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={300}
                    disabled={isSubmitting}
                    placeholder="Short description displayed on customer cards..."
                    {...register('description')}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-[#111111] rounded-2xl text-xs sm:text-sm font-bold text-[#111111] placeholder:text-stone-400 focus:outline-none focus:border-[#FF3B30] shadow-[0_2px_0_#111111] resize-none"
                  />
                  {errors.description && (
                    <p className="text-[11px] font-bold text-red-600 px-1">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                {/* Photo Upload Section */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-[#6B6B6B] block">
                    Dish Photo
                  </label>

                  <div className="p-4 bg-[#F8FAFC] border-2 border-dashed border-[#111111]/30 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                    {/* Thumbnail / Placeholder */}
                    <div className="w-24 h-24 rounded-2xl border-2 border-[#111111] overflow-hidden bg-white shrink-0 relative shadow-xs flex items-center justify-center">
                      {photoPreviewUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={photoPreviewUrl}
                          alt="Dish Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full scale-125 flex items-center justify-center">
                          <FoodPlaceholder
                            item={{
                              name: watchedName || 'Preview',
                              category: watchedCategory || 'Special',
                            }}
                            className="w-full h-full"
                          />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex-1 space-y-2 text-center sm:text-left">
                      <p className="text-xs font-bold text-[#111111]">
                        {selectedPhotoFile
                          ? `Selected: ${selectedPhotoFile.name}`
                          : photoPreviewUrl
                          ? 'Current photo loaded'
                          : 'No photo selected (shows illustrated card)'}
                      </p>
                      <p className="text-[10px] font-bold text-stone-500">
                        Uploads are automatically compressed to ~400KB WebP/JPEG for instant delivery.
                      </p>

                      <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start pt-1">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={isSubmitting}
                          onChange={handlePhotoSelect}
                          className="hidden"
                          id="menu-photo-input"
                        />
                        <label
                          htmlFor="menu-photo-input"
                          className="tactile-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black bg-white border-2 border-[#111111] rounded-xl cursor-pointer hover:bg-stone-50 shadow-xs"
                        >
                          <UploadCloud className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>{photoPreviewUrl ? 'Change Photo' : 'Upload Photo'}</span>
                        </label>

                        {photoPreviewUrl && (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={handleRemovePhoto}
                            className="tactile-btn px-3 py-1.5 text-xs font-black bg-white text-red-600 border-2 border-red-600 rounded-xl hover:bg-red-50 shadow-xs"
                          >
                            Remove Photo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Calories & Health Tag Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Calories */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase text-[#6B6B6B] flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        <span>Calories (kcal)</span>
                      </label>
                      <span className="text-[10px] font-bold text-stone-400">
                        Optional
                      </span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      disabled={isSubmitting}
                      placeholder="e.g. 350"
                      {...register('calories', {
                        setValueAs: (v) => (v === '' || v === null || isNaN(v) ? null : Number(v)),
                      })}
                      className={`w-full min-h-[46px] px-3.5 py-2.5 bg-white border-2 rounded-2xl text-xs sm:text-sm font-bold text-[#111111] placeholder:text-stone-400 focus:outline-none shadow-[0_2px_0_#111111] ${
                        errors.calories ? 'border-red-500' : 'border-[#111111] focus:border-[#FF3B30]'
                      }`}
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

                {/* Stock Availability Toggle */}
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

          {/* SECTION 3: ADDON GROUPS */}
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

      {/* Discard Confirmation Dialog */}
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
                onClose();
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

  return (
    <Dialog
      open={isDialogOpen}
      onOpenChange={(next) => {
        if (!next) {
          handleClose();
        }
      }}
    >
      {isDialogOpen && (
        <MenuItemFormModalContent
          key={itemToEdit?.id ?? 'create-new-item'}
          itemToEdit={itemToEdit}
          existingCategories={distinctCategories}
          onSaved={onSaved}
          onClose={handleClose}
        />
      )}
    </Dialog>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { INITIAL_SEAT_MAP, DEFAULT_DEPARTMENTS } from '@/lib/seedData';
import {
  User,
  Building2,
  MapPin,
  Camera,
  Check,
  Loader2,
  Trash2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface ProfileFormProps {
  mode: 'onboarding' | 'settings';
  onComplete?: () => void;
}

export function ProfileForm({ mode, onComplete }: ProfileFormProps) {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse initial first and last name
  const [firstName, setFirstName] = useState(
    user?.firstName || user?.displayName?.split(/\s+/)[0] || ''
  );
  const [lastName, setLastName] = useState(
    user?.lastName || user?.displayName?.split(/\s+/).slice(1).join(' ') || ''
  );

  // Departments list & selection
  const [departments, setDepartments] = useState<string[]>(DEFAULT_DEPARTMENTS);
  const [selectedDept, setSelectedDept] = useState(user?.department || 'Engineering');
  const [customDept, setCustomDept] = useState('');

  // Profile photo state
  const [photoURL, setPhotoURL] = useState<string | null>(user?.photoURL || null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Seat / Desk picker state
  const [selectedZone, setSelectedZone] = useState<'A' | 'B' | 'C' | 'D'>('B');
  const [selectedSeat, setSelectedSeat] = useState<string>(user?.seatCode || 'B-04');

  // Submission & status
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch departments from appConfig/departments doc (with default fallback)
  useEffect(() => {
    async function loadDepartments() {
      if (!db) return;
      try {
        const snap = await getDoc(doc(db, 'appConfig', 'departments'));
        if (snap.exists()) {
          const list = snap.data()?.list;
          if (Array.isArray(list) && list.length > 0) {
            setDepartments(list);
          }
        }
      } catch (err) {
        console.warn('[PROFILE-FORM] Could not load departments config:', err);
      }
    }
    loadDepartments();
  }, []);

  // Update form fields if user doc updates in background
  useEffect(() => {
    if (!user) return;
    if (user.firstName && !firstName) setFirstName(user.firstName);
    if (user.lastName && !lastName) setLastName(user.lastName);
    if (user.photoURL && !photoURL) setPhotoURL(user.photoURL);
    if (user.seatCode && !selectedSeat) setSelectedSeat(user.seatCode);
    if (user.department) {
      if (departments.includes(user.department)) {
        setSelectedDept(user.department);
      } else {
        setSelectedDept('Other');
        setCustomDept(user.department);
      }
    }
  }, [user, departments]);

  // Compute initials for fallback avatar
  const initials = (() => {
    const f = (firstName || user?.displayName || user?.email || 'N').trim().charAt(0);
    const l = (lastName || '').trim().charAt(0);
    return `${f}${l}`.toUpperCase();
  })();

  // Client-side canvas resize & upload to Firebase Storage at profile-pictures/{uid}.jpg
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (!user?.uid || !storage) {
      setError('Storage service unavailable. Please check your connection.');
      return;
    }

    setIsUploadingPhoto(true);

    try {
      // 1. Off-screen canvas resize to max 512x512
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      const resizedBlob: Blob = await new Promise((resolve, reject) => {
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          const maxDim = 512;
          let w = img.width;
          let h = img.height;

          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas 2D context not available'));
            return;
          }

          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Failed to compress image'));
            },
            'image/jpeg',
            0.82
          );
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to load selected image'));
        };
        img.src = objectUrl;
      });

      // 2. Upload to predictable path: profile-pictures/{uid}.jpg
      const storageRef = ref(storage, `profile-pictures/${user.uid}.jpg`);
      await uploadBytes(storageRef, resizedBlob, {
        contentType: 'image/jpeg',
      });

      // 3. Obtain permanent download URL
      const downloadUrl = await getDownloadURL(storageRef);
      setPhotoURL(downloadUrl);
    } catch (uploadErr: unknown) {
      console.error('[PROFILE-FORM] Photo upload failed:', uploadErr);
      setError((uploadErr as Error).message || 'Failed to upload photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoURL(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const fName = firstName.trim();
    const lName = lastName.trim();

    if (!fName) {
      setError('Please provide your first name.');
      return;
    }
    if (!lName) {
      setError('Please provide your last name.');
      return;
    }

    const finalDept =
      selectedDept === 'Other'
        ? customDept.trim() || 'Other'
        : selectedDept.trim();

    if (!finalDept) {
      setError('Please select or specify your department.');
      return;
    }

    if (!selectedSeat) {
      setError('Please choose your office desk code.');
      return;
    }

    setSaving(true);
    try {
      const combinedDisplayName = `${fName} ${lName}`;
      await updateProfile({
        firstName: fName,
        lastName: lName,
        displayName: combinedDisplayName,
        department: finalDept,
        photoURL: photoURL || null,
        seatCode: selectedSeat,
        profileComplete: true,
      });

      if (mode === 'onboarding') {
        if (onComplete) {
          onComplete();
        }
      } else {
        setSuccessMessage('Profile details updated successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (saveErr: unknown) {
      console.error('[PROFILE-FORM] Save failed:', saveErr);
      setError((saveErr as Error).message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const zoneDesks = INITIAL_SEAT_MAP.filter((s) => s.zone === selectedZone);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Photo Picker Avatar */}
      <div className="flex flex-col items-center justify-center space-y-2">
        <div className="relative group">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-[#FFD166] border-4 border-[#111111] shadow-[0_4px_0_#111111] flex items-center justify-center overflow-hidden">
            {photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoURL}
                alt="Profile Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl sm:text-4xl font-black text-[#111111]">
                {initials}
              </span>
            )}

            {isUploadingPhoto && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </div>

          {/* Camera Upload Trigger */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className="absolute -bottom-2 -right-2 min-w-[44px] min-h-[44px] rounded-xl bg-white border-2 border-[#111111] shadow-[0_2px_0_#111111] flex items-center justify-center text-[#111111] hover:bg-[#FF3B30] hover:text-white transition-colors cursor-pointer"
            title="Upload photo"
            aria-label="Upload photo"
          >
            <Camera className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelect}
          className="hidden"
        />

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] px-2 text-xs font-black text-[#FF3B30] hover:underline"
          >
            {photoURL ? 'Change Photo' : 'Add Photo (Optional)'}
          </button>
          {photoURL && (
            <>
              <span className="text-stone-300">•</span>
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="min-h-[44px] px-2 text-xs font-bold text-stone-500 hover:text-red-600 flex items-center gap-0.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Name Fields: First Name & Last Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-wider text-[#111111]">
            First Name <span className="text-[#FF3B30]">*</span>
          </label>
          <input
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="e.g. Rahul"
            className="w-full min-h-[44px] p-3 bg-[#FFF8F2] border-2 border-[#111111] rounded-2xl text-[16px] sm:text-sm font-bold text-[#111111] placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF3B30] transition-all"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-wider text-[#111111]">
            Last Name <span className="text-[#FF3B30]">*</span>
          </label>
          <input
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="e.g. Sharma"
            className="w-full min-h-[44px] p-3 bg-[#FFF8F2] border-2 border-[#111111] rounded-2xl text-[16px] sm:text-sm font-bold text-[#111111] placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF3B30] transition-all"
          />
        </div>
      </div>

      {/* Department Dropdown */}
      <div className="space-y-1">
        <label className="text-xs font-black uppercase tracking-wider text-[#111111] flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-[#FF3B30]" />
          <span>Department</span> <span className="text-[#FF3B30]">*</span>
        </label>
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="w-full min-h-[44px] p-3 bg-[#FFF8F2] border-2 border-[#111111] rounded-2xl text-[16px] sm:text-sm font-bold text-[#111111] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF3B30] transition-all cursor-pointer"
        >
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
          {!departments.includes('Other') && <option value="Other">Other</option>}
        </select>

        {/* Fallback Custom Department Text Input */}
        {selectedDept === 'Other' && (
          <div className="pt-2">
            <input
              type="text"
              required
              value={customDept}
              onChange={(e) => setCustomDept(e.target.value)}
              placeholder="Enter your department name..."
              className="w-full min-h-[44px] p-3 bg-white border-2 border-[#111111] rounded-2xl text-[16px] sm:text-sm font-bold text-[#111111] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#FF3B30] animate-in fade-in"
            />
          </div>
        )}
      </div>

      {/* Office Desk Selection */}
      <div className="space-y-3 pt-2 border-t-2 border-[#111111]/10">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-[#111111] flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#FF3B30]" />
            <span>Delivery Desk Code</span> <span className="text-[#FF3B30]">*</span>
          </label>
          <span className="text-xs font-mono font-black text-[#111111] bg-[#FFD166] px-2.5 py-0.5 rounded-lg border border-[#111111]">
            {selectedSeat}
          </span>
        </div>

        {/* Zone Selector Tabs */}
        <div className="flex gap-1.5 p-1 bg-[#FFF8F2] rounded-2xl border-2 border-[#111111]">
          {(['A', 'B', 'C', 'D'] as const).map((zone) => (
            <button
              key={zone}
              type="button"
              onClick={() => setSelectedZone(zone)}
              className={`min-h-[44px] flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                selectedZone === zone
                  ? 'bg-[#111111] text-white shadow-xs -translate-y-0.5'
                  : 'text-[#111111] hover:bg-stone-200/50'
              }`}
            >
              Zone {zone}
            </button>
          ))}
        </div>

        {/* Desks Grid */}
        <div className="grid grid-cols-4 gap-2 max-h-52 overflow-y-auto p-1">
          {zoneDesks.map((desk) => {
            const isSelected = selectedSeat === desk.seatCode;
            return (
              <button
                key={desk.seatCode}
                type="button"
                onClick={() => setSelectedSeat(desk.seatCode)}
                className={`min-h-[44px] flex items-center justify-center py-2 px-1 text-center rounded-xl font-mono text-xs font-black border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#111111] bg-[#FF3B30] text-white shadow-[0_2px_0_#111111] -translate-y-0.5'
                    : 'border-stone-200 bg-white text-[#111111] hover:border-[#111111]'
                }`}
              >
                {desk.seatCode}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border-2 border-red-500 rounded-2xl text-xs font-black text-red-900 animate-in fade-in">
          {error}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border-2 border-emerald-500 rounded-2xl text-xs font-black text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Submit CTA */}
      <button
        type="submit"
        disabled={saving || isUploadingPhoto}
        className="tactile-btn min-h-[48px] w-full py-3.5 px-6 text-sm sm:text-base font-black bg-[#FF3B30] text-white flex items-center justify-between rounded-2xl shadow-[0_4px_0_#111111] disabled:opacity-50"
      >
        <span>
          {saving
            ? 'Saving Details...'
            : mode === 'onboarding'
            ? 'Confirm Profile & Enter Newtown'
            : 'Save Profile Changes'}
        </span>
        <ArrowRight className="w-5 h-5 stroke-[2.5]" />
      </button>
    </form>
  );
}

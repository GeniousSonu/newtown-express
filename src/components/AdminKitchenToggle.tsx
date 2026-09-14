'use client';

import React, { useState, useEffect } from 'react';
import { useKitchenStatus } from '@/context/KitchenStatusContext';
import { Power, AlertTriangle, X, Check, Edit2 } from 'lucide-react';

export function AdminKitchenToggle() {
  const { isOpen, closedMessage, lastToggledAt, toggleKitchenStatus, loading } = useKitchenStatus();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [customMsg, setCustomMsg] = useState(closedMessage || '');
  const [submitting, setSubmitting] = useState(false);
  const [showEditMsgModal, setShowEditMsgModal] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Check 12h stale closed reminder with safe null and positive number check
  const isStaleClosed =
    !isOpen &&
    typeof lastToggledAt === 'number' &&
    lastToggledAt > 0 &&
    !isNaN(lastToggledAt) &&
    now - lastToggledAt > 12 * 60 * 60 * 1000;

  const formattedClosedSince =
    typeof lastToggledAt === 'number' && lastToggledAt > 0 && !isNaN(lastToggledAt)
      ? new Date(lastToggledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ', ' +
        new Date(lastToggledAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
      : '';

  const handleToggleClick = () => {
    if (isOpen) {
      // Need confirmation to CLOSE
      setCustomMsg(closedMessage || 'Kitchen is closed right now.');
      setShowConfirmModal(true);
    } else {
      // Reopen immediately
      handleReopen();
    }
  };

  const handleReopen = async () => {
    setSubmitting(true);
    try {
      await toggleKitchenStatus(true, '');
    } catch (err) {
      console.error('Failed to open kitchen:', err);
      alert('Failed to reopen kitchen. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmClose = async () => {
    setSubmitting(true);
    try {
      await toggleKitchenStatus(false, customMsg.trim());
      setShowConfirmModal(false);
    } catch (err) {
      console.error('Failed to close kitchen:', err);
      alert('Failed to close kitchen. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveMessageOnly = async () => {
    setSubmitting(true);
    try {
      await toggleKitchenStatus(false, customMsg.trim());
      setShowEditMsgModal(false);
    } catch (err) {
      console.error('Failed to update closed message:', err);
      alert('Failed to update message.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-10 px-4 bg-stone-100 rounded-2xl border-2 border-stone-300 animate-pulse flex items-center">
        <span className="text-xs font-black text-stone-400">Loading switch...</span>
      </div>
    );
  }

  return (
    <>
      {/* 12-Hour Stale Reminder Banner */}
      {isStaleClosed && (
        <div className="mb-3 p-3 sm:p-3.5 bg-[#FEF08A] border-2 border-[#111111] rounded-2xl shadow-[0_3px_0_#111111] flex flex-wrap items-center justify-between gap-3 text-xs font-black text-[#0F172A] animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 stroke-[2.5]" />
            <span>
              Kitchen has been closed since <strong>{formattedClosedSince}</strong> — did you forget to reopen?
            </span>
          </div>
          <button
            onClick={handleReopen}
            disabled={submitting}
            className="min-h-[44px] px-4 py-2 bg-[#15803D] hover:bg-[#166534] text-white text-xs font-black rounded-xl border-2 border-[#111111] shadow-[0_3px_0_#111111] active:translate-y-0.5 shrink-0 transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Reopen Now</span>
          </button>
        </div>
      )}

      {/* Main Master Switch Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleToggleClick}
          disabled={submitting}
          className={`min-h-[44px] flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-2xl border-2 border-[#111111] transition-all text-xs font-black shadow-[0_3px_0_#111111] active:translate-y-0.5 active:shadow-[0_1px_0_#111111] ${
            isOpen
              ? 'bg-[#15803D] text-white hover:bg-[#166534]'
              : 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
          }`}
          title={isOpen ? 'Click to close kitchen' : 'Click to reopen kitchen'}
        >
          <Power className="w-4 h-4 stroke-[3]" />
          <span className="hidden sm:inline">{isOpen ? 'Kitchen OPEN' : 'Kitchen CLOSED'}</span>
          <span className="sm:hidden">{isOpen ? 'OPEN' : 'CLOSED'}</span>
          <span
            className={`w-2.5 h-2.5 rounded-full border border-white ${
              isOpen ? 'bg-white' : 'bg-yellow-300 animate-pulse'
            }`}
          />
        </button>

        {/* If closed, show option to edit closed message (Min 44x44px touch target) */}
        {!isOpen && (
          <button
            onClick={() => {
              setCustomMsg(closedMessage || '');
              setShowEditMsgModal(true);
            }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 bg-white text-[#0F172A] rounded-2xl border-2 border-[#111111] shadow-[0_2px_0_#111111] hover:bg-stone-50 transition-colors"
            title="Edit message shown to employees"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Confirmation Modal to CLOSE Kitchen */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-[calc(100%-1.5rem)] max-w-md max-h-[90dvh] overflow-y-auto bg-white rounded-[28px] p-5 sm:p-6 border-4 border-[#111111] shadow-[0_8px_0_#111111] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-100 border-2 border-[#111111] flex items-center justify-center text-red-600 shrink-0">
                  <Power className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-[#0F172A]">
                  Close Kitchen to Orders?
                </h3>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-stone-500 hover:text-stone-900 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#475569] font-bold">
              New orders will be blocked until you reopen. Employees will still be able to browse the menu and their cart will be preserved.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#0F172A] uppercase tracking-wider block">
                Custom Message for Employees (Optional)
              </label>
              <input
                type="text"
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                placeholder="e.g. Back at 9:00 AM! / Restocking ingredients"
                className="w-full p-3 bg-[#FFF8F2] border-2 border-[#111111] rounded-2xl text-[16px] sm:text-xs font-bold text-[#0F172A] focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="min-h-[44px] flex-1 py-2.5 text-xs font-black text-stone-700 hover:bg-stone-100 rounded-xl border border-stone-300"
              >
                Keep Open
              </button>
              <button
                onClick={handleConfirmClose}
                disabled={submitting}
                className="min-h-[44px] flex-1 py-2.5 text-xs font-black bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl border-2 border-[#111111] shadow-[0_3px_0_#111111] active:translate-y-0.5"
              >
                {submitting ? 'Closing...' : 'Confirm & Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Closed Message Modal */}
      {showEditMsgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-[calc(100%-1.5rem)] max-w-md max-h-[90dvh] overflow-y-auto bg-white rounded-[28px] p-5 sm:p-6 border-4 border-[#111111] shadow-[0_8px_0_#111111] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-black text-[#0F172A]">
                Edit Closed Message
              </h3>
              <button
                onClick={() => setShowEditMsgModal(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-stone-500 hover:text-stone-900 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#0F172A] uppercase tracking-wider block">
                Message displayed to employees
              </label>
              <input
                type="text"
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                placeholder="e.g. Back at 9:00 AM!"
                className="w-full p-3 bg-[#FFF8F2] border-2 border-[#111111] rounded-2xl text-[16px] sm:text-xs font-bold text-[#0F172A] focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowEditMsgModal(false)}
                className="min-h-[44px] flex-1 py-2.5 text-xs font-black text-stone-700 hover:bg-stone-100 rounded-xl border border-stone-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMessageOnly}
                disabled={submitting}
                className="min-h-[44px] flex-1 py-2.5 text-xs font-black bg-[#0F766E] hover:bg-[#134E4A] text-white rounded-xl border-2 border-[#111111] shadow-[0_3px_0_#111111] active:translate-y-0.5"
              >
                {submitting ? 'Saving...' : 'Update Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

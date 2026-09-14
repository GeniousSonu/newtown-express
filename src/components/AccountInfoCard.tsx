'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { Shield, RefreshCw, CheckCircle2, AlertCircle, Key, Clock, UserCheck } from 'lucide-react';
import { formatOrderDateTime } from '@/lib/utils';

export function AccountInfoCard() {
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [claimsData, setClaimsData] = useState<Record<string, unknown> | null>(null);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  if (!user) return null;

  const handleRefreshToken = async () => {
    if (!auth?.currentUser) {
      setRefreshMessage('Firebase Auth user not found.');
      return;
    }

    setIsRefreshing(true);
    setRefreshMessage(null);

    try {
      // Force fresh token fetch from Firebase Auth server
      const tokenResult = await auth.currentUser.getIdTokenResult(true);
      setClaimsData({
        role: tokenResult.claims.role || 'employee (default)',
        canOrderForSelf: Boolean(tokenResult.claims.canOrderForSelf),
        issuedAt: tokenResult.issuedAtTime,
        expiresAt: tokenResult.expirationTime,
        signInProvider: tokenResult.signInProvider,
      });
      setRefreshMessage('Token claims refreshed directly from server.');
      setTimeout(() => setRefreshMessage(null), 4000);
    } catch (err: unknown) {
      console.error('Failed to refresh token claims:', err);
      setRefreshMessage('Failed to refresh token: ' + ((err as Error)?.message || 'Unknown error'));
    } finally {
      setIsRefreshing(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            Admin {user.canOrderForSelf ? '(Master Admin)' : ''}
          </span>
        );
      case 'kitchenManager':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
            Kitchen Manager
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-stone-100 text-stone-800 border border-stone-300">
            Employee
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-[28px] p-5 sm:p-6 border-2 border-[#134E4A] shadow-[0_4px_0_#0F766E] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#134E4A]/15">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 border border-[#134E4A]/30 flex items-center justify-center text-[#0F766E]">
            <Shield className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#0F172A] flex items-center gap-2">
              <span>Account & Role Info</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-50 text-[#0F766E] border border-[#0F766E]/30">
                Live Status
              </span>
            </h3>
            <p className="text-[11px] font-bold text-[#475569]">
              Authoritative token claims & permissions
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefreshToken}
          disabled={isRefreshing}
          className="min-h-[36px] px-3 py-1 bg-white hover:bg-stone-50 text-[#0F766E] border border-[#134E4A]/30 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
          title="Force fresh token fetch from Firebase Auth"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Force Refresh Token'}</span>
        </button>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-[#F4FBF7] rounded-xl border border-[#134E4A]/20 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#475569] block">
            Email Address
          </span>
          <span className="font-bold text-[#0F172A] font-mono break-all block">
            {user.email}
          </span>
        </div>

        <div className="p-3 bg-[#F4FBF7] rounded-xl border border-[#134E4A]/20 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#475569] block">
            Assigned Role Claim
          </span>
          <div>{getRoleBadge(user.role)}</div>
        </div>

        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#475569] block">
            Desk / Seat Code
          </span>
          <span className="font-bold text-[#0F172A] block">
            {user.seatCode || 'None (Pantry / Kitchen Staff)'}
          </span>
        </div>

        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#475569] block">
            Order-for-Self Permission
          </span>
          <span className="font-bold text-[#0F172A] flex items-center gap-1">
            {user.canOrderForSelf ? (
              <>
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-black">Allowed (Master Admin)</span>
              </>
            ) : user.role === 'admin' || user.role === 'kitchenManager' ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-amber-800">Restricted (Staff account)</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Allowed (Employee)</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Fresh Claims Inspection Result */}
      {claimsData && (
        <div className="p-3 bg-stone-900 text-stone-100 rounded-xl space-y-1.5 font-mono text-[11px]">
          <div className="flex items-center justify-between text-teal-400 font-sans text-xs font-black">
            <span className="flex items-center gap-1">
              <Key className="w-3.5 h-3.5" />
              <span>Decoded Custom Claims</span>
            </span>
            <span className="text-[10px] text-stone-400">Fetched with forceRefresh: true</span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            <div>role: <span className="text-emerald-400 font-bold">{String(claimsData.role)}</span></div>
            <div>canOrder: <span className="text-amber-400 font-bold">{String(Boolean(claimsData.canOrderForSelf || claimsData.role === 'employee'))}</span></div>
            <div className="col-span-2 text-stone-400 text-[10px] flex items-center gap-1 pt-1">
              <Clock className="w-3 h-3" />
              <span>Expires: {claimsData.expiresAt ? formatOrderDateTime(claimsData.expiresAt) : 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Message */}
      {refreshMessage && (
        <p className="text-[11px] font-bold text-[#0F766E] flex items-center gap-1 animate-in fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{refreshMessage}</span>
        </p>
      )}
    </div>
  );
}

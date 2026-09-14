'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrderContext';
import { AuthGate } from '@/components/AuthGate';
import { ProfileForm } from '@/components/ProfileForm';
import { AccountInfoCard } from '@/components/AccountInfoCard';
import { UserAvatar } from '@/components/UserAvatar';
import { formatINR, getStatusDetails, formatOrderDateTime } from '@/lib/utils';
import { getSeatShortCode } from '@/lib/seatLayout';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { formatInTimeZone } from 'date-fns-tz';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Pencil,
  MapPin,
  Building2,
  Mail,
  Shield,
  Flame,
  Clock,
  Calendar,
  Wallet,
  Receipt,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function ProfileSettingsPage() {
  const { user, loading } = useAuth();
  const { orders } = useOrders();
  const [isEditing, setIsEditing] = useState(false);
  const [todayCalories, setTodayCalories] = useState(0);

  // Fetch daily budget from config (default 600)
  const { data: budget = 600 } = useQuery({
    queryKey: ['appConfig', 'health'],
    queryFn: async () => {
      if (!db) return 600;
      const configSnap = await getDoc(doc(db, 'appConfig', 'health'));
      if (configSnap.exists()) {
        const data = configSnap.data();
        if (typeof data.dailyCalorieBudget === 'number') {
          return data.dailyCalorieBudget;
        }
      }
      return 600;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Listen to today's daily intake in IST
  useEffect(() => {
    if (!db || !user?.uid || loading || user.role === 'admin' || user.role === 'kitchenManager') return;

    const todayIST = formatInTimeZone(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
    const intakeDocRef = doc(db, 'dailyIntake', `${user.uid}_${todayIST}`);

    const unsubscribe = onSnapshot(
      intakeDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setTodayCalories(docSnap.data()?.totalCalories || 0);
        } else {
          setTodayCalories(0);
        }
      },
      (err) => {
        if (err.code !== 'permission-denied') {
          console.warn('[PROFILE-PAGE] Intake listener notice:', err.message);
        }
      }
    );

    return () => unsubscribe();
  }, [user, loading]);

  const uid = user?.uid;
  const [currentTimestamp] = useState(() => Date.now());

  // Compute User's Orders Metrics (Delivered vs Total)
  const myOrders = useMemo(() => {
    if (!uid) return [];
    return orders
      .filter((o) => o.employeeId === uid)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [orders, uid]);

  const deliveredOrders = useMemo(() => {
    return myOrders.filter((o) => ['SERVED', 'COMPLETED'].includes(o.status));
  }, [myOrders]);

  // Today's served calories summation (real-time IST)
  const todayServedCalories = useMemo(() => {
    if (!uid || !orders) return 0;
    const todayIST = formatInTimeZone(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
    return orders
      .filter((o) => {
        if (o.employeeId !== uid) return false;
        if (o.status !== 'SERVED' && o.status !== 'COMPLETED') return false;
        const orderDateIST = o.createdAt
          ? formatInTimeZone(new Date(o.createdAt), 'Asia/Kolkata', 'yyyy-MM-dd')
          : '';
        return orderDateIST === todayIST;
      })
      .reduce((sum, o) => sum + (Number(o.totalCalories) || 0), 0);
  }, [orders, uid]);

  const effectiveTodayCalories = Math.max(todayCalories, todayServedCalories);

  // Spending Calculations with explicit IST basis
  const { weeklySpend, monthlySpend, lifetimeCalories } = useMemo(() => {
    const sevenDaysAgoMs = currentTimestamp - 7 * 24 * 60 * 60 * 1000;

    // Start of the current calendar month in IST
    const startOfMonthIST = formatInTimeZone(new Date(currentTimestamp), 'Asia/Kolkata', 'yyyy-MM-01T00:00:00+05:30');
    const startOfMonthMs = new Date(startOfMonthIST).getTime();

    let weekly = 0;
    let monthly = 0;
    let caloriesTotal = 0;

    for (const o of deliveredOrders) {
      const orderTime = o.createdAt || 0;
      if (orderTime >= sevenDaysAgoMs) {
        weekly += o.totalAmount || 0;
      }
      if (orderTime >= startOfMonthMs) {
        monthly += o.totalAmount || 0;
      }
      caloriesTotal += o.totalCalories || 0;
    }

    return {
      weeklySpend: weekly,
      monthlySpend: monthly,
      lifetimeCalories: caloriesTotal,
    };
  }, [deliveredOrders, currentTimestamp]);

  // Health Score Calculation
  const healthRatio = budget > 0 ? Math.min(100, Math.round((effectiveTodayCalories / budget) * 100)) : 0;
  const isOverBudget = effectiveTodayCalories > budget;

  return (
    <AuthGate>
      <div className="max-w-2xl mx-auto py-6 space-y-6 pb-16">
        {/* Navigation Breadcrumb / Back */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="tactile-btn inline-flex items-center gap-2 px-3.5 py-1.5 text-xs bg-white"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Back to Menu</span>
          </Link>
          <span className="text-xs font-black uppercase text-[#6B6B6B] tracking-wider">
            Employee Profile
          </span>
        </div>

        {/* SECTION 1: PROFILE HERO CARD (View Mode by Default) */}
        <div className="bg-white rounded-[32px] p-6 sm:p-8 border-3 border-[#111111] shadow-[0_6px_0_#111111] space-y-6">
          {/* Card Header & Edit Trigger */}
          <div className="flex items-start justify-between gap-4 pb-5 border-b-2 border-stone-100">
            <div className="flex items-center gap-3.5">
              <UserAvatar
                uid={user?.uid || ''}
                name={user?.displayName || user?.email || 'User'}
                photoURL={user?.photoURL}
                size="lg"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
                    {user?.displayName || user?.email?.split('@')[0]}
                  </h1>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-[#111111] bg-[#FFD166] text-[#111111] shadow-xs">
                    {user?.role === 'admin'
                      ? 'Admin'
                      : user?.role === 'kitchenManager'
                      ? 'Kitchen Manager'
                      : 'Employee'}
                  </span>
                </div>
                <p className="text-xs font-bold text-[#6B6B6B] mt-0.5">
                  {user?.department || 'General'} · Newtown Express
                </p>
              </div>
            </div>

            {/* Pencil Edit CTA Button */}
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="tactile-btn flex items-center gap-1.5 px-3.5 py-2 text-xs bg-white text-[#111111]"
              title="Edit Profile"
            >
              <Pencil className="w-3.5 h-3.5 stroke-[2.5] text-[#FF3B30]" />
              <span>Edit</span>
            </button>
          </div>

          {/* Read-Only Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Email (Read-Only) */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border-2 border-[#111111]/15 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white border border-[#111111]/20 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-[#6B6B6B]" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase text-[#6B6B6B] block">Email Address</span>
                  <span className="text-xs font-bold text-[#111111] truncate block">
                    {user?.email}
                  </span>
                </div>
              </div>
              <span title="Email is tied to login authentication">
                <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              </span>
            </div>

            {/* Department */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border-2 border-[#111111]/15 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white border border-[#111111]/20 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-[#FF3B30]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-[#6B6B6B] block">Department</span>
                <span className="text-xs font-bold text-[#111111] truncate block">
                  {user?.department || 'Not specified'}
                </span>
              </div>
            </div>

            {/* Assigned Desk */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border-2 border-[#111111]/15 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white border border-[#111111]/20 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-[#22C55E] stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-[#6B6B6B] block">Assigned Desk</span>
                  <span className="text-xs font-black text-[#111111]">
                    {user?.seatCode ? getSeatShortCode(user.seatCode) : 'No desk claimed'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="tactile-btn text-[10px] font-black text-[#111111] bg-[#FFD166] px-2.5 py-1 rounded-lg border border-[#111111] hover:bg-[#ffe082] cursor-pointer"
              >
                Change Desk
              </button>
            </div>

            {/* Security / Role Status */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border-2 border-[#111111]/15 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white border border-[#111111]/20 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-[#6B6B6B] block">Account Status</span>
                <span className="text-xs font-bold text-[#111111] truncate block">
                  Verified Employee · Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: SPEND SUMMARIES (Weekly & Monthly in IST) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Wallet className="w-4 h-4 text-[#FF3B30] stroke-[2.5]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-[#111111]">
              Pantry Spending Summary (IST)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Weekly Spend */}
            <div className="tactile-card p-4 sm:p-5 bg-white space-y-1 text-left">
              <div className="flex items-center justify-between text-[#6B6B6B]">
                <span className="text-[10px] font-black uppercase tracking-wider">Weekly Spend</span>
                <Clock className="w-3.5 h-3.5 text-[#FF3B30]" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#FF3B30]">
                {formatINR(weeklySpend)}
              </div>
              <p className="text-[10px] font-bold text-[#6B6B6B]">
                Past 7 rolling days (delivered)
              </p>
            </div>

            {/* Monthly Spend */}
            <div className="tactile-card p-4 sm:p-5 bg-white space-y-1 text-left">
              <div className="flex items-center justify-between text-[#6B6B6B]">
                <span className="text-[10px] font-black uppercase tracking-wider">Monthly Spend</span>
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#111111]">
                {formatINR(monthlySpend)}
              </div>
              <p className="text-[10px] font-bold text-[#6B6B6B]">
                Current calendar month (IST)
              </p>
            </div>

            {/* Completed Orders Count */}
            <div className="tactile-card p-4 sm:p-5 bg-white space-y-1 text-left">
              <div className="flex items-center justify-between text-[#6B6B6B]">
                <span className="text-[10px] font-black uppercase tracking-wider">Delivered Meals</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#111111]">
                {deliveredOrders.length}
              </div>
              <p className="text-[10px] font-bold text-[#6B6B6B]">
                Total completed desk orders
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 3: CALORIE INTAKE TRACKING (From Delivered Orders) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Flame className="w-4 h-4 text-[#FF3B30] stroke-[2.5]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-[#111111]">
              Calorie Intake & Nutrition
            </h2>
          </div>

          <div className="tactile-card p-5 sm:p-6 bg-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider text-[#FF3B30]">
                  Today&apos;s Delivered Calories (IST)
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black text-[#111111]">
                    {effectiveTodayCalories}
                  </span>
                  <span className="text-xs font-bold text-[#6B6B6B]">
                    / {budget} kcal daily budget
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-black px-3 py-1.5 rounded-xl border-2 border-[#111111] shadow-[0_2px_0_#111111] ${
                    isOverBudget
                      ? 'bg-red-100 text-red-900'
                      : healthRatio >= 75
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-emerald-100 text-emerald-900'
                  }`}
                >
                  {isOverBudget ? 'Indulgent Day' : healthRatio >= 75 ? 'Moderate' : 'On Track'}
                </span>
              </div>
            </div>

            {/* Calorie Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden border border-[#111111]/30">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    isOverBudget ? 'bg-[#FF3B30]' : 'bg-[#22C55E]'
                  }`}
                  style={{
                    width: effectiveTodayCalories > 0
                      ? `${Math.max(3, Math.min(100, (effectiveTodayCalories / budget) * 100))}%`
                      : '0%',
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-[#6B6B6B]">
                <span>0 kcal</span>
                <span>{healthRatio}% of daily target consumed</span>
                <span>{budget} kcal</span>
              </div>
            </div>

            {/* Lifetime Calorie Stats */}
            <div className="pt-3 border-t-2 border-stone-100 flex items-center justify-between text-xs">
              <span className="font-bold text-[#6B6B6B]">Lifetime Meal Nutrition:</span>
              <span className="font-black text-[#111111]">
                {lifetimeCalories.toLocaleString()} kcal total across {deliveredOrders.length} delivered meal(s)
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 4: ORDER HISTORY RECEIPTS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#FF3B30] stroke-[2.5]" />
              <h2 className="text-xs font-black uppercase tracking-wider text-[#111111]">
                Order History Receipts ({myOrders.length})
              </h2>
            </div>
            <Link
              href="/orders"
              className="text-xs font-black text-[#FF3B30] hover:underline"
            >
              View Full Receipts
            </Link>
          </div>

          {myOrders.length === 0 ? (
            <div className="tactile-card p-6 text-center text-xs font-bold text-[#6B6B6B]">
              No past orders yet. Browse our menu to order fresh meals to your desk!
            </div>
          ) : (
            <div className="space-y-2.5">
              {myOrders.slice(0, 5).map((order) => {
                const statusMeta = getStatusDetails(order.status);
                return (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="tactile-card p-4 bg-white flex items-center justify-between gap-3 transition-all hover:-translate-y-0.5"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#FFF8F2] border border-[#111111] flex items-center justify-center text-sm shrink-0">
                        {statusMeta.emoji}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-[#111111]">
                            #{order.id.slice(-4)}
                          </span>
                          <span className="text-[10px] font-bold text-[#6B6B6B]">
                            {formatOrderDateTime(order.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs font-black text-[#111111] truncate mt-0.5">
                          {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-[#6B6B6B] font-bold mt-0.5">
                          <span>Desk {order.seatCode}</span>
                          <span>•</span>
                          <span>{order.totalCalories || 0} kcal</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-[#111111] block">
                        {formatINR(order.totalAmount)}
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md border border-[#111111] bg-[#FFF8F2] mt-1 inline-block">
                        {statusMeta.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 5: ACCOUNT & ROLE CLAIM DEBUG INFO (Restricted to Admin) */}
        {user?.role === 'admin' && <AccountInfoCard />}
      </div>

      {/* EDIT PROFILE DIALOG (Modal triggered strictly via pencil button) */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent size="md" className="p-6 sm:p-7 space-y-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center gap-3 pb-3 border-b-2 border-stone-100 pr-8">
            <div className="w-10 h-10 rounded-2xl bg-[#FFD166] border-2 border-[#111111] flex items-center justify-center text-[#111111] shadow-[0_2px_0_#111111] shrink-0">
              <Pencil className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-[#111111]">
                Edit Profile Details
              </DialogTitle>
              <DialogDescription className="text-xs text-[#6B6B6B] font-bold">
                Update your name, avatar, and department. Role and desk code are read-only.
              </DialogDescription>
            </div>
          </div>

          <ProfileForm
            mode="settings"
            onComplete={() => setIsEditing(false)}
          />
        </DialogContent>
      </Dialog>
    </AuthGate>
  );
}

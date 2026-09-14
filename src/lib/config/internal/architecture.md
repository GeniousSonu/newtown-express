# Newtown Express — Internal System Specification & Engineering Blueprint

> **Internal Reference**: This specification documents the core architecture, data schemas, design tokens, and technical constraints of the Newtown Express office pantry platform. Engineers and code assistants should consult this document before modifying core systems.

---

## 1. System Overview

- **Application Purpose**: Real-time office pantry ordering and kitchen dispatch PWA for Ibarts Newtown.
- **Core Value Loop**:
  1. Employee places food/drink order from desk.
  2. Employee verifies payment via static UPI QR code and attaches canvas-compressed receipt proof.
  3. Kitchen dispatch admin receives instant notification with loud synthesized audio chime.
  4. Kitchen updates preparation status (`PLACED` → `ACCEPTED` → `PREPARING` → `READY_FOR_PICKUP` / `OUT_FOR_DELIVERY` → `COMPLETED`).
  5. Employee receives live real-time status updates on desk screen.

---

## 2. Infrastructure & Zero-Cost Constraints (Firebase Spark)

This application is strictly engineered to run on **Firebase Spark (100% Free Tier)** without requiring a credit card or Blaze upgrade:

1. **No Cloud Functions**:
   - Background actions and notifications are handled via Next.js Server Route Handlers (`src/app/api/notify-admin`, `src/app/api/auth/*`).
2. **No Firebase Storage Bucket**:
   - Payment proofs are resized and compressed on the client side using an HTML5 Canvas to a lightweight JPEG base64 string (~50KB) and stored directly inside the Firestore `orders` document.
3. **Firestore Security & Open Pilot Mode**:
   - Firestore security rules in `firestore.rules` permit public read/write during initial pilot rollout with client-side OTP validation, ensuring uninterrupted ordering.

---

## 3. Database Collections & Schema Reference

### `orders` Collection
```typescript
interface Order {
  id: string;                       // Firestore document ID (or local UUID in mock mode)
  tokenNumber: number;              // Daily sequential token (e.g. 1, 2, 3...)
  userId: string;                   // User UID or email
  userName: string;                 // Employee name
  userEmail: string;                // Official work email
  seatCode: string;                 // Desk location (e.g. "B-04")
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    selectedAddons?: Array<{
      groupName: string;
      optionName: string;
      priceDelta: number;
    }>;
  }>;
  totalAmount: number;              // Order total in INR (₹)
  status: OrderStatus;
  paymentMethod: 'UPI_QR';
  paymentProofUrl?: string;         // Canvas-compressed base64 data URI (~50KB)
  paymentStatus: 'VERIFIED' | 'PENDING_REVIEW';
  createdAt: number;                // Timestamp (Date.now())
  updatedAt: number;                // Timestamp (Date.now())
  rejectionReason?: string;
  notes?: string;
}
```

### Order Status State Machine
```
[PLACED] ──> [ACCEPTED] ──> [PREPARING] ──> [READY_FOR_PICKUP / OUT_FOR_DELIVERY] ──> [COMPLETED]
   │
   └───> [REJECTED]
```

### `users` Collection
```typescript
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'employee' | 'admin';
  seatCode?: string;
  createdAt: number;
  lastLogin: number;
}
```

---

## 4. Authentication Architecture

- **Mechanism**: Passwordless 6-digit email OTP.
- **Service Endpoints**:
  - `POST /api/auth/send-otp`: Dispatches a 6-digit numeric code via Resend or Nodemailer. In development / sandbox mode, the OTP is printed to the terminal console and returned for seamless testing.
  - `POST /api/auth/verify-otp`: Validates code within a 10-minute expiry window and initializes session.
- **Provider Context**: `src/context/AuthContext.tsx` handles session persistence across browser reloads via `localStorage`.

---

## 5. Visual & Interaction Design System

- **Aesthetic**: Tactile Neo-Brutal food design.
- **Color Palette**:
  - Cream Background: `#FFF8F2`
  - Primary Red (Hot Action): `#FF3B30`
  - Deep Ink / Border: `#111111`
  - Warm Butter / Accent: `#FFD166`
  - Fresh Herb / Success: `#22C55E`
  - Subdued Charcoal: `#6B6B6B`
- **Tactile Shadows**: `shadow-[0_4px_0_#111111]` on interactive cards and buttons. Active press transforms with `translate-y-0.5` and `shadow-[0_2px_0_#111111]`.
- **Typography**: Outfit for bold expressive headings; Plus Jakarta Sans for body text.
- **Brand Assets**: Located in `public/ibarts-logo.png`, `public/favicon.ico`, `public/egg-maggie.jpg`, and `public/red-sause-paste.webp`.

---

## 6. Sound & Audio Cue System (`src/lib/sound.ts`)

- Utilizes the browser's native **Web Audio API** (`AudioContext`) to generate synthesized acoustic chimes without external MP3 dependencies.
- **Supported Cues**:
  - `playKitchenBell()`: Urgent repeating two-tone alert for new incoming orders in the kitchen admin queue.
  - `playOrderSuccess()`: Upbeat ascending major triad for successful checkout.
  - `playStatusChime(status)`: Contextual pitch feedback on order progression.

---

## 7. Next.js 16 & Hydration Guidelines

1. **Hydration Integrity**:
   - `src/app/layout.tsx` contains `suppressHydrationWarning` on `<html>` and `<body>` to prevent third-party browser extensions (e.g. Chrome shortcut listeners) from triggering React SSR hydration warnings.
2. **Client Components**:
   - Components requiring browser APIs (`localStorage`, `AudioContext`, `canvas`) must be marked `'use client'`.
3. **Static Image Imports & Assets**:
   - Food and brand assets are referenced from `/public` via optimized Next.js `<Image>` or responsive `<img>` wrappers.

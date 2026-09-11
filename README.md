# Newtown Express — Office Pantry Ordering Platform

Newtown Express is a production Progressive Web App (PWA) designed for office employees to order hot food, snacks, and beverages from the office pantry with delivery straight to their desks.

---

## ⚠️ Production Credentials Required

**Sandbox and mock modes have been completely removed.** This application strictly requires real **Firebase** and **Brevo** credentials to boot and operate, both in local development and in production.

If any required configuration is missing, the application fails fast with a clear **"App Misconfigured"** screen instead of silently degrading to fake data.

### Required Environment Variables

Configure these in `.env.local` (see `.env.example` for the template):

```bash
# Server-Side Configuration
ADMIN_EMAILS="sudipta@ibarts.in,admin@genioussonu.me"
BREVO_API_KEY="xkeysib-..."
BREVO_SENDER_EMAIL="verified-sender@gmail.com"
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'

# Client-Side Configuration (Public)
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-app"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-app.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."
```

---

## Core Features

1. **Email OTP Authentication & RBAC**:
   - Access restricted to `@ibarts.in` domain and authorized `ADMIN_EMAILS`.
   - Single-use, SHA-256 hashed OTPs stored in Firestore `otpRequests` with rate-limiting and rolling daily caps.
   - Authoritative server-minted Firebase custom tokens embedding `{ role: "admin" | "employee" }`.

2. **Calorie Tracking & Daily Health Score Ring**:
   - Approximate base calories and health tags (`light`, `balanced`, `indulgent`) for every menu dish and addon.
   - Automatic calculation of `totalCalories` on order placement.
   - Transactional server status updates (`SERVED`) that atomically increment `dailyIntake/{uid}_{todayIST}`.
   - Interactive Healthify-style Daily Health Score gauge on the employee menu screen based on `appConfig/health.dailyCalorieBudget` (default 600 kcal).

3. **Frequent-Item Healthier Alternative Nudge**:
   - Automatically monitors 7-day orders for items ordered 3+ times.
   - Renders a dismissible "Switch it up?" card recommending lighter alternatives from the same category with persistent end-of-day dismissal.

4. **Kitchen Order Dashboard**:
   - Real-time order queue with audio chimes and loud alarm loops for kitchen staff.
   - Unified state machine (`PLACED` -> `PAYMENT_VERIFYING` -> `ACCEPTED` -> `COOKING` -> `READY` -> `SERVED`).
   - Single-action **"Delivered & Complete"** workflow.

---

## Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

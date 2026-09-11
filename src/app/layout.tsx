import type { Metadata, Viewport } from 'next';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { OrderProvider } from '@/context/OrderContext';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { LoudAlertModal } from '@/components/LoudAlertModal';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['400', '600', '700', '800', '900'],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Newtown Express — Pantry PWA',
  description: 'Order hot food and beverages from the office pantry straight to your desk',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/ibarts-logo.png', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
    apple: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Newtown Express',
  },
};

export const viewport: Viewport = {
  themeColor: '#FF3B30',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { ConfigGuard } from '@/components/ConfigGuard';

import { KitchenStatusProvider } from '@/context/KitchenStatusContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${plusJakartaSans.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen flex flex-col bg-[#FFF8F2] text-[#111111] pb-20 sm:pb-8"
        suppressHydrationWarning
      >
        <ConfigGuard>
          <AuthProvider>
            <KitchenStatusProvider>
              <CartProvider>
                <OrderProvider>
                  <Header />
                  <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 sm:py-6">
                    {children}
                  </main>
                  <BottomNav />
                  <LoudAlertModal />
                  <ServiceWorkerRegister />
                </OrderProvider>
              </CartProvider>
            </KitchenStatusProvider>
          </AuthProvider>
        </ConfigGuard>
      </body>
    </html>
  );
}

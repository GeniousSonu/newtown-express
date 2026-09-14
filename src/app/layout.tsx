import type { Metadata, Viewport } from 'next';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { OrderProvider } from '@/context/OrderContext';
import { LoudAlertModal } from '@/components/LoudAlertModal';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';

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
  viewportFit: 'cover',
};

import { ConfigGuard } from '@/components/ConfigGuard';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { KitchenStatusProvider } from '@/context/KitchenStatusContext';
import { AdminThemeProvider } from '@/context/AdminThemeContext';
import { AppNavigationShell } from '@/components/AppNavigationShell';
import { Toaster } from 'sonner';

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
      <body suppressHydrationWarning className="min-h-screen">
        <QueryProvider>
          <ConfigGuard>
            <AuthProvider>
              <AdminThemeProvider>
                <KitchenStatusProvider>
                  <CartProvider>
                    <OrderProvider>
                      <AppNavigationShell>
                        {children}
                      </AppNavigationShell>
                      <LoudAlertModal />
                      <ServiceWorkerRegister />
                      <PwaInstallPrompt />
                      <Toaster position="top-center" richColors theme="light" />
                    </OrderProvider>
                  </CartProvider>
                </KitchenStatusProvider>
              </AdminThemeProvider>
            </AuthProvider>
          </ConfigGuard>
        </QueryProvider>
      </body>
    </html>
  );
}

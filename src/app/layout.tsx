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

import { OfflineBanner } from '@/components/OfflineBanner';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://newtown-express.web.app'),
  title: {
    default: 'Newtown Express — Office Pantry & Hot Food Delivery',
    template: '%s | Newtown Express',
  },
  description: 'Order hot food and beverages from the office pantry straight to your desk with real-time tracking and UPI payments.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/ibarts-logo.png', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
    apple: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Newtown Express — Office Pantry & Hot Food Delivery',
    description: 'Order hot food, snacks, and drinks delivered straight to your desk in minutes.',
    siteName: 'Newtown Express',
    images: [
      {
        url: '/ibarts-logo.png',
        width: 512,
        height: 512,
        alt: 'Newtown Express Pantry',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Newtown Express — Office Pantry & Hot Food Delivery',
    description: 'Order hot food, snacks, and drinks delivered straight to your desk in minutes.',
    images: ['/ibarts-logo.png'],
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
import { MenuProvider } from '@/context/MenuContext';
import { NavigationProvider } from '@/context/NavigationContext';
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
                <NavigationProvider>
                  <KitchenStatusProvider>
                    <MenuProvider>
                      <CartProvider>
                        <OrderProvider>
                          <OfflineBanner />
                          <AppNavigationShell>
                            {children}
                          </AppNavigationShell>
                          <LoudAlertModal />
                          <ServiceWorkerRegister />
                          <PwaInstallPrompt />
                          <Toaster position="top-center" richColors theme="light" />
                        </OrderProvider>
                      </CartProvider>
                    </MenuProvider>
                  </KitchenStatusProvider>
                </NavigationProvider>
              </AdminThemeProvider>
            </AuthProvider>
          </ConfigGuard>
        </QueryProvider>
      </body>
    </html>
  );
}

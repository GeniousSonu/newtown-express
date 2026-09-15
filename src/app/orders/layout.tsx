import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your Orders & Tracking',
  description: 'Track active desk deliveries and browse your past order history.',
};

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

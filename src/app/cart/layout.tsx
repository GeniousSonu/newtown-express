import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Review & Pay',
  description: 'Review your pantry cart items, add delivery notes, and complete UPI payment.',
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

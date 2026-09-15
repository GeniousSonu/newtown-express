import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile & Preferences',
  description: 'Manage your desk location, profile information, and pantry preferences.',
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

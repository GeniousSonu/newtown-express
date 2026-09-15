import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Install App (Android APK & PWA)',
  description: 'Download the Newtown Express Android app directly or add to your home screen for real-time pantry ordering and delivery alerts.',
};

export default function GetAppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

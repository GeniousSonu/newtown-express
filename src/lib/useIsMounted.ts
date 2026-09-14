'use client';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * Hook to safely detect if the component has mounted on the client.
 * Returns false on the server and initial SSR hydration frame, then true on client.
 * Uses useSyncExternalStore to comply with React 19 rules (no setState in useEffect).
 */
export function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

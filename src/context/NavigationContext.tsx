'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export const MAX_STACK_SIZE = 15;

/**
 * Pure helper function for managing the route history stack.
 * - Caps stack to maxCap (default 15)
 * - Ignores empty or undefined pathnames
 * - Dedupes consecutive identical entries (avoids duplicate pushes on re-render)
 * - Detects browser back navigation (pop when going back to previous path)
 */
export function computeNextStack(
  prev: string[],
  nextPath: string | null | undefined,
  maxCap: number = MAX_STACK_SIZE
): string[] {
  if (!nextPath) return prev;

  // 1. Dedupe consecutive identical entries (e.g. re-renders or same path updates)
  if (prev.length > 0 && prev[prev.length - 1] === nextPath) {
    return prev;
  }

  // 2. Check if user navigated back via browser button (popping current head)
  if (prev.length > 1 && prev[prev.length - 2] === nextPath) {
    return prev.slice(0, prev.length - 1);
  }

  // 3. Forward push with bounded cap (MAX_STACK_SIZE = 15)
  const nextStack = [...prev, nextPath];
  if (nextStack.length > maxCap) {
    return nextStack.slice(nextStack.length - maxCap);
  }
  return nextStack;
}

interface NavigationContextType {
  stack: string[];
  canGoBack: boolean;
  goBack: (fallbackHref: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [stack, setStack] = useState<string[]>(() => (pathname ? [pathname] : []));
  const isNavigatingBackRef = useRef(false);

  useEffect(() => {
    if (!pathname) return;

    // If this update was triggered by our own in-app goBack pop, reset flag and skip pushing
    if (isNavigatingBackRef.current) {
      isNavigatingBackRef.current = false;
      return;
    }

    setStack((prev) => computeNextStack(prev, pathname));
  }, [pathname]);

  const goBack = useCallback(
    (fallbackHref: string) => {
      if (stack.length > 1) {
        isNavigatingBackRef.current = true;
        setStack((prev) => prev.slice(0, prev.length - 1));
        router.back();
      } else {
        // No in-app history (direct push notification link, fresh tab, or initial load)
        router.push(fallbackHref);
      }
    },
    [stack, router]
  );

  return (
    <NavigationContext.Provider
      value={{
        stack,
        canGoBack: stack.length > 1,
        goBack,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextType {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return ctx;
}

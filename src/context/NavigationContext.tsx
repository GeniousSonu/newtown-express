'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export const MAX_STACK_SIZE = 15;

// route stack manage: max 15 entries rakho, duplicate route skip koro
export function computeNextStack(
  prev: string[],
  nextPath: string | null | undefined,
  maxCap: number = MAX_STACK_SIZE
): string[] {
  if (!nextPath) return prev;

  // duplicate path abar push korbo na
  if (prev.length > 0 && prev[prev.length - 1] === nextPath) {
    return prev;
  }

  // user browser back button chaple ager page pop hobe
  if (prev.length > 1 && prev[prev.length - 2] === nextPath) {
    return prev.slice(0, prev.length - 1);
  }

  // max 15 ta entries obdi stack e rakho
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

    // nijeder in-app back cholar shomoy extra push skip koro
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
        // direct link ba notun tab e khulle fallback route e jao
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

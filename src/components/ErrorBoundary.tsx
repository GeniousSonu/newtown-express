'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { EmptyState } from '@/components/EmptyState';
import { RefreshCw, Home } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  variant?: 'buyer' | 'admin' | 'neutral';
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    try {
      Sentry.captureException(error);
    } catch {
      // ignore Sentry reporting failure in dev/offline
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-4">
          <EmptyState
            icon="⚠️"
            title={this.props.fallbackTitle || 'Something went sideways'}
            description={
              this.props.fallbackDescription ||
              "We encountered an unexpected glitch while rendering this section. Your orders and cart data remain safe."
            }
            variant={this.props.variant || 'buyer'}
            action={{
              label: 'Reload Screen',
              onClick: this.handleReload,
              icon: <RefreshCw className="w-4 h-4" />,
            }}
            secondaryAction={{
              label: 'Try Again',
              onClick: this.handleReset,
              icon: <Home className="w-3.5 h-3.5" />,
            }}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

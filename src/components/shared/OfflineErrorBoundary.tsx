/**
 * Offline Error Boundary
 * Gracefully handles module failures when offline
 */

import React, { Component, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  moduleName?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isOffline: boolean;
}

export class OfflineErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('OfflineErrorBoundary caught error:', error, errorInfo);
  }

  componentDidMount() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  handleOnline = () => {
    this.setState({ isOffline: false });
    // Auto-retry when coming back online
    if (this.state.hasError) {
      this.handleRetry();
    }
  };

  handleOffline = () => {
    this.setState({ isOffline: true });
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { hasError, error, isOffline } = this.state;
    const { children, moduleName = 'Module', fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      const isNetworkError = error?.message?.toLowerCase().includes('network') ||
                             error?.message?.toLowerCase().includes('fetch') ||
                             error?.message?.toLowerCase().includes('offline');

      return (
        <Card className="border-dashed border-2 border-warning/50 bg-warning/5">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6">
            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-4 ${
              isNetworkError || isOffline 
                ? 'bg-warning/20' 
                : 'bg-destructive/20'
            }`}>
              {isNetworkError || isOffline ? (
                <WifiOff className="h-8 w-8 text-warning" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-destructive" />
              )}
            </div>
            
            <h3 className="text-base font-semibold text-foreground mb-2">
              {isOffline ? 'Working Offline' : `Unable to Load ${moduleName}`}
            </h3>
            
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              {isOffline 
                ? 'Some features may be limited. Your changes will sync when connected.'
                : isNetworkError
                  ? 'Network connection issue. Using cached data if available.'
                  : `An error occurred while loading ${moduleName.toLowerCase()}.`
              }
            </p>

            {error && !isOffline && (
              <p className="text-xs text-muted-foreground/70 mb-4 max-w-sm text-center font-mono">
                {error.message.slice(0, 100)}
              </p>
            )}
            
            <Button 
              variant="outline" 
              onClick={this.handleRetry}
              className="h-11 px-6 touch-target"
              disabled={isOffline}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              {isOffline ? 'Waiting for connection...' : 'Try Again'}
            </Button>
          </CardContent>
        </Card>
      );
    }

    return children;
  }
}

export default OfflineErrorBoundary;

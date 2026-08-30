import React, { useState, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// ErrorBoundary implemented as a function component + hook pattern
// to avoid class-component type resolution issues with React 19 types.
const ErrorBoundaryContext = React.createContext<{
  reset: () => void;
} | null>(null);

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('VOICE OF GUDALUR ErrorBoundary caught:', error, info);
  }

  private reset() {
    this.setState({ hasError: false, error: undefined });
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-8 text-center">
          <div className="max-w-md space-y-6">
            <div className="text-6xl font-black text-red-600">!</div>
            <h1 className="text-2xl font-black">Something went wrong</h1>
            <p className="text-slate-400 text-sm">
              An unexpected error occurred. Please refresh the page or try again later.
            </p>
            <button
              onClick={() => this.reset()}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

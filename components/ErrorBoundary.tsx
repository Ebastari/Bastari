
import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // You could also log error to an error reporting service here
  }

  public render() {
    // FIX: Destructure props to ensure type inference works correctly for `this.props`.
    const { children } = this.props;

    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-red-800 text-white p-4 text-center">
          <h1 className="text-2xl font-bold mb-4">Oops! Terjadi kesalahan.</h1>
          <p className="mb-2">Aplikasi mengalami masalah dan tidak dapat dimuat.</p>
          {this.state.error && (
            <div className="bg-red-900 p-3 rounded text-sm max-w-lg overflow-auto">
              <p className="font-mono break-words">{this.state.error.message}</p>
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-white text-red-800 rounded-full font-bold shadow-lg active:scale-95 transition-all"
          >
            Muat Ulang Aplikasi
          </button>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected rendering issue occurred.',
    };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Handled via accessible fallback UI without leaking internal stack traces
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="rounded-2xl border border-red-500/30 bg-red-50 dark:bg-red-950/20 p-6 space-y-3"
        >
          <div className="flex items-center gap-2 text-red-700 dark:text-pink-400 font-semibold text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>View temporarily interrupted</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300">{this.state.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Section</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  moduleName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ScreenErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ScreenErrorBoundary: ${this.props.moduleName || 'Screen'}]`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[350px] p-6 text-slate-700 bg-red-50/40 border border-red-200 rounded-lg m-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3 shadow-inner">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-red-900 uppercase tracking-wide">
            {this.props.moduleName ? `${this.props.moduleName} Error` : 'Module Loading Error'}
          </h3>
          <p className="text-xs text-slate-600 mt-1.5 max-w-md text-center">
            {this.state.error?.message || 'An unexpected rendering error occurred while loading this section.'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-4 px-4 py-2 bg-[#D94B5A] hover:bg-[#b83846] text-white rounded text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-2 shadow-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Screen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

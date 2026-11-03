import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // Automatic recovery from stale dynamic chunk imports following new deployments
    const msg = String(error?.message || '');
    if (/dynamically imported module|failed to fetch.*module|loading chunk/i.test(msg)) {
      const lastReload = Number(sessionStorage.getItem('bjl_last_chunk_reload') || '0');
      const now = Date.now();
      // Reload at most once every 15 seconds to prevent reload loops
      if (now - lastReload > 15000) {
        sessionStorage.setItem('bjl_last_chunk_reload', String(now));
        window.location.reload();
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      const errMsg = typeof this.state.error?.message === 'string'
        ? this.state.error.message
        : typeof this.state.error === 'object'
          ? JSON.stringify(this.state.error)
          : String(this.state.error || 'Unknown error occurred');
      const isChunkError = /dynamically imported module|failed to fetch.*module|loading chunk/i.test(errMsg);

      return (
        <div className="min-h-screen bg-[#FBCFCB] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-400 shadow-[4px_4px_0_0_rgba(0,0,0,0.1)] max-w-lg w-full">
            <div className={cn(
              "text-white px-3 py-2 flex items-center gap-2 border-b-2",
              isChunkError ? "bg-amber-800 border-amber-900" : "bg-red-800 border-red-900"
            )}>
              <AlertTriangle className="h-5 w-5" />
              <h1 className="text-sm font-bold uppercase tracking-wider">
                {isChunkError ? "Application Update Detected" : "Fatal System Error"}
              </h1>
            </div>
            
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={cn("p-3 rounded-full flex-shrink-0", isChunkError ? "bg-amber-100" : "bg-red-100")}>
                  <AlertTriangle className={cn("h-8 w-8", isChunkError ? "text-amber-600" : "text-red-600")} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 mb-2">
                    {isChunkError ? "New Version Available" : "Module execution halted"}
                  </h2>
                  <p className="text-sm text-slate-600 mb-4">
                    {isChunkError 
                      ? "A new update has been published. Please reload your browser to download the latest module files."
                      : "The application encountered an unexpected error and has suspended this component to prevent data corruption."}
                  </p>
                  
                  <div className="bg-slate-100 p-3 border border-slate-300 rounded text-xs font-mono text-slate-800 mb-6 overflow-auto max-h-32 shadow-inner">
                    {errMsg}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-slate-200">
                {isChunkError ? (
                  <button
                    type="button"
                    onClick={() => {
                      sessionStorage.removeItem('bjl_last_chunk_reload');
                      window.location.reload();
                    }}
                    className="flex items-center gap-2 bg-[#F7AFA8] hover:bg-[#D94B5A] text-white px-4 py-2 font-bold text-xs uppercase transition-colors shadow-xs"
                  >
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Reload & Load Latest Version
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => this.setState({ hasError: false, error: null })}
                      className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 font-bold text-xs uppercase transition-colors shadow-xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Try In-Place Recovery
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem("bjl_audit_logs");
                        localStorage.removeItem("bjl_alerts");
                        window.location.reload();
                      }}
                      className="flex items-center gap-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-2 font-bold text-xs uppercase transition-colors"
                    >
                      Reset Local State & Reload
                    </button>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 font-bold text-xs uppercase transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Restart Terminal
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

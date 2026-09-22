import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
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
  }

  private handleReset = () => {
    try {
      // Clear potentially corrupt session
      localStorage.removeItem('ptun_survey_token');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 text-center border border-slate-200">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">
              Terjadi Kendala Memuat Aplikasi
            </h1>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Halaman ini mengalami gangguan saat proses render. Silakan muat ulang halaman untuk memperbarui status aplikasi.
            </p>
            {this.state.error && (
              <div className="text-xs bg-slate-50 text-slate-500 font-mono p-3 rounded-lg mb-6 text-left overflow-auto max-h-32 border border-slate-200">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 z-50 bg-[#0f1115] flex flex-col items-center justify-center gap-8">
          <div className="text-center">
            <h2 className="text-xl font-black text-red-500 uppercase tracking-[0.2em] mb-2">Erro Crítico no Sistema</h2>
            <p className="text-[12px] font-bold text-slate-400 uppercase">{this.state.error?.message || 'Falha ao carregar a interface'}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2 bg-red-500/20 text-red-500 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/30 transition-all"
            >
              Reiniciar Protocolo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

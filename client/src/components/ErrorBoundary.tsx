import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Something went wrong</h2>
                        <p className="text-slate-500 mb-6">
                            We encountered an unexpected error. Please try reloading the page.
                        </p>
                        {this.state.error && (
                            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs font-mono text-left mb-6 overflow-auto max-h-32">
                                {this.state.error.toString()}
                            </div>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 px-6 rounded-xl transition-colors shadow-lg shadow-teal-500/20"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

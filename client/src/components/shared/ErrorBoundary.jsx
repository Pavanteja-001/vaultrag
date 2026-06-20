import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-base-900 flex items-center justify-center p-6">
          <div className="glass-card p-8 max-w-md w-full text-center border border-neon-red/30">
            <AlertTriangle className="w-10 h-10 text-neon-red mx-auto mb-4" />
            <h2 className="font-heading font-semibold text-white mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-400 mb-4">{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-gradient-ai text-white text-sm font-heading hover:shadow-glow-ai transition-all"
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

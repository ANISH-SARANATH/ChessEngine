import React from 'react';

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export class GameErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch() {
    // Keep gameplay shell visible even if board rendering fails.
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex h-full min-h-[420px] items-center justify-center rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Board temporarily unavailable. Rejoin the queue to continue.
        </div>
      );
    }
    return this.props.children;
  }
}

'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import DiscoveryBox from './DiscoveryBox';

type Props = { children: ReactNode };

type State = { hasError: boolean };

export default class BoxErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[BoxErrorBoundary]', error.message, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <DiscoveryBox reason="error" className="min-h-[240px]" />;
    }
    return this.props.children;
  }
}

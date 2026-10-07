'use client';

import React from 'react';

type Props = { children: React.ReactNode };

type State = { failed: boolean };

export default class CallErrorBoundary extends React.Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error('[Call UI]', error);
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

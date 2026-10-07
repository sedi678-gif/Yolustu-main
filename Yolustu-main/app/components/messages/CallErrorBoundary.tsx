'use client';

import React from 'react';
import { setCallUiState } from '@/app/lib/callUiBridge';

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
    if (this.state.failed) {
      return (
        <div
          role="alertdialog"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2147483646,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            background: '#050816',
            color: '#fff',
            padding: 24,
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Zəng ekranı açılmadı</p>
          <button
            type="button"
            onClick={() => {
              setCallUiState(null);
              this.setState({ failed: false });
            }}
            style={{
              border: 0,
              borderRadius: 999,
              padding: '12px 22px',
              background: '#ff2d55',
              color: '#fff',
              fontWeight: 600,
            }}
          >
            Bağla
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

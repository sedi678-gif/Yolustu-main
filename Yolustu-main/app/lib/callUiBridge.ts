import { CallType } from './callService';

export type CallUiMode = 'incoming' | 'outgoing' | 'connecting' | 'active';

export type CallUiState = {
  mode: CallUiMode;
  callType: CallType;
  peerName: string;
  peerAvatar?: string;
  accept?: () => void;
  refuse?: () => void;
  cancel?: () => void;
} | null;

let current: CallUiState = null;
const listeners = new Set<(state: CallUiState) => void>();

export function getCallUiState(): CallUiState {
  return current;
}

let notifyScheduled = false;

export function setCallUiState(next: CallUiState) {
  current = next;
  if (notifyScheduled) return;
  notifyScheduled = true;
  queueMicrotask(() => {
    notifyScheduled = false;
    const snapshot = current;
    listeners.forEach((listen) => listen(snapshot));
  });
}

export function listenCallUiState(callback: (state: CallUiState) => void): () => void {
  listeners.add(callback);
  callback(current);
  return () => {
    listeners.delete(callback);
  };
}

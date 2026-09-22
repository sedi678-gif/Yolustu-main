import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { requireFirebaseAuth } from '@/app/lib/firebaseAuth';
import { timestampToMs } from '@/app/lib/battleEventLog/battleEventLog';

export const SERVER_CLOCK_COLLECTION = 'server_clock';

let originServerMs = 0;
let originMonoMs = 0;
let syncing: Promise<number> | null = null;

/** Telefon saatından asılı deyil — performance.now() + server timestamp. */
export function serverNowMs(): number {
  if (originServerMs <= 0) return 0;
  return originServerMs + (performance.now() - originMonoMs);
}

export function hasServerClock(): boolean {
  return originServerMs > 0;
}

function clockRef(uid: string) {
  return doc(db, SERVER_CLOCK_COLLECTION, uid);
}

function applyServerSample(serverMs: number) {
  if (serverMs <= 0) return;
  originServerMs = serverMs;
  originMonoMs = performance.now();
}

export async function syncServerClock(): Promise<number> {
  if (syncing) return syncing;
  syncing = (async () => {
    const user = await requireFirebaseAuth();
    await setDoc(clockRef(user.uid), {
      t: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return serverNowMs();
  })().finally(() => {
    syncing = null;
  });
  return syncing;
}

export function listenServerClock(onTick: (serverNow: number) => void): () => void {
  let unsubSnap: (() => void) | null = null;
  let tick: number | null = null;
  let cancelled = false;

  void requireFirebaseAuth()
    .then((user) => {
      if (cancelled) return;
      unsubSnap = onSnapshot(clockRef(user.uid), (snap) => {
        if (!snap.exists()) return;
        applyServerSample(timestampToMs(snap.data().t));
        onTick(serverNowMs());
      });
      void syncServerClock().catch(() => {});
    })
    .catch(() => {});

  tick = window.setInterval(() => {
    if (originServerMs > 0) onTick(serverNowMs());
  }, 250);

  const resync = window.setInterval(() => {
    void syncServerClock().catch(() => {});
  }, 20_000);

  return () => {
    cancelled = true;
    unsubSnap?.();
    if (tick != null) window.clearInterval(tick);
    window.clearInterval(resync);
  };
}

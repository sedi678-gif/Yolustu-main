/** Overlay üçün lokal/remote MediaStream — Zego DOM-dan və getUserMedia-dan. */

export type CallMediaState = {
  local: MediaStream | null;
  remote: MediaStream | null;
};

let local: MediaStream | null = null;
let remote: MediaStream | null = null;
const listeners = new Set<(state: CallMediaState) => void>();
let harvestTimer: ReturnType<typeof setInterval> | null = null;

function emit() {
  const snapshot = { local, remote };
  listeners.forEach((fn) => fn(snapshot));
}

export function getCallMedia(): CallMediaState {
  return { local, remote };
}

export function listenCallMedia(fn: (state: CallMediaState) => void): () => void {
  listeners.add(fn);
  fn(getCallMedia());
  return () => {
    listeners.delete(fn);
  };
}

export function setCallLocalStream(stream: MediaStream | null | undefined) {
  if (local === stream) return;
  local = stream ?? null;
  emit();
}

export function setCallRemoteStream(stream: MediaStream | null | undefined) {
  if (remote === stream) return;
  remote = stream ?? null;
  emit();
}

export function muteLocalAudio(muted: boolean) {
  local?.getAudioTracks().forEach((t) => {
    t.enabled = !muted;
  });
}

export function muteLocalVideo(muted: boolean) {
  local?.getVideoTracks().forEach((t) => {
    t.enabled = !muted;
  });
}

export async function ensureLocalPreview(wantVideo: boolean): Promise<MediaStream | null> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return local;
  const hasAudio = Boolean(local?.getAudioTracks().some((t) => t.readyState === 'live'));
  const hasVideo = Boolean(local?.getVideoTracks().some((t) => t.readyState === 'live'));
  if (hasAudio && (!wantVideo || hasVideo)) return local;

  try {
    const next = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: wantVideo ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    });
    if (local) {
      local.getTracks().forEach((t) => t.stop());
    }
    local = next;
    emit();
    return local;
  } catch {
    if (wantVideo) {
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (!local) {
          local = audioOnly;
          emit();
        }
        return local;
      } catch {
        return local;
      }
    }
    return local;
  }
}

export async function flipLocalCamera(): Promise<void> {
  const video = local?.getVideoTracks()[0];
  const facing = video?.getSettings().facingMode === 'environment' ? 'user' : 'environment';
  try {
    const next = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { exact: facing } },
    });
    const newTrack = next.getVideoTracks()[0];
    if (!newTrack) return;
    video?.stop();
    if (local) {
      local.getVideoTracks().forEach((t) => local?.removeTrack(t));
      local.addTrack(newTrack);
    } else {
      local = next;
    }
    emit();
  } catch {
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: facing },
      });
      const newTrack = next.getVideoTracks()[0];
      if (!newTrack) return;
      video?.stop();
      local?.getVideoTracks().forEach((t) => local?.removeTrack(t));
      local?.addTrack(newTrack);
      emit();
    } catch {
      /* cihaz dəstəkləmir */
    }
  }
}

export function releaseCallMedia() {
  stopMediaHarvest();
  local?.getTracks().forEach((t) => {
    try {
      t.stop();
    } catch {
      /* */
    }
  });
  local = null;
  remote = null;
  emit();
}

function asStream(value: unknown): MediaStream | null {
  if (value instanceof MediaStream) return value;
  if (value && typeof value === 'object') {
    const bag = value as { stream?: unknown; mediaStream?: unknown };
    if (bag.stream instanceof MediaStream) return bag.stream;
    if (bag.mediaStream instanceof MediaStream) return bag.mediaStream;
  }
  return null;
}

function collectFromStage(): { local: MediaStream | null; remote: MediaStream | null } {
  const stage = document.getElementById('zego-call-stage');
  if (!stage) return { local: null, remote: null };
  let foundLocal: MediaStream | null = null;
  let foundRemote: MediaStream | null = null;

  stage.querySelectorAll('video, audio').forEach((node) => {
    const el = node as HTMLMediaElement;
    const stream = asStream(el.srcObject);
    if (!stream) return;
    const hasVideo = stream.getVideoTracks().length > 0;
    const looksLocal = el.muted || (el as HTMLVideoElement).playsInline && hasVideo && (el as HTMLVideoElement).className.includes('local');
    if (el.muted && hasVideo) foundLocal = stream;
    else if (!el.muted && stream.getAudioTracks().length > 0) foundRemote = stream;
    else if (hasVideo && !looksLocal) foundRemote = stream;
  });

  return { local: foundLocal, remote: foundRemote };
}

function wakeStageMedia() {
  const stage = document.getElementById('zego-call-stage');
  if (!stage) return;
  stage.querySelectorAll('audio, video').forEach((node) => {
    const el = node as HTMLMediaElement;
    const stream = asStream(el.srcObject);
    const isLocalVideo = el.tagName === 'VIDEO' && el.muted;
    if (!isLocalVideo && stream?.getAudioTracks().length) {
      el.muted = false;
      el.volume = 1;
    }
    void el.play().catch(() => undefined);
  });
}

export function startMediaHarvest(express?: {
  on?: (ev: string, cb: (...args: unknown[]) => void) => void;
  startPlayingStream?: (id: string) => Promise<unknown>;
} | null): void {
  stopMediaHarvest();
  wakeStageMedia();

  const playStream = express?.startPlayingStream;
  if (express?.on && playStream) {
    express.on('roomStreamUpdate', (...args: unknown[]) => {
      const updateType = args[1];
      const list = (args[2] || []) as { streamID?: string; stream_id?: string }[];
      const added = updateType === 'ADD' || updateType === 0 || updateType === 'Added';
      if (!added) return;
      void Promise.all(
        list.map(async (item) => {
          const id = item.streamID || item.stream_id;
          if (!id) return;
          try {
            const played = await playStream(id);
            const ms = asStream(played);
            if (ms) setCallRemoteStream(ms);
          } catch {
            /* play later via DOM harvest */
          }
        })
      );
    });
  }

  harvestTimer = setInterval(() => {
    wakeStageMedia();
    const found = collectFromStage();
    if (found.local && found.local !== local) setCallLocalStream(found.local);
    if (found.remote && found.remote !== remote) setCallRemoteStream(found.remote);
  }, 600);
}

export function stopMediaHarvest() {
  if (harvestTimer) {
    clearInterval(harvestTimer);
    harvestTimer = null;
  }
}

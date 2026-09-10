/** Mobil brauzer/WebView-də zəng səsini aktivləşdirir (user gesture sonrası) */
export async function unlockCallAudio(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      const ctx = new Ctx();
      if (ctx.state === 'suspended') await ctx.resume();
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      setTimeout(() => void ctx.close(), 300);
    }
  } catch {
    /* ignore */
  }

  try {
    const el = document.createElement('audio');
    el.setAttribute('playsinline', 'true');
    el.muted = true;
    el.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
    await el.play();
  } catch {
    /* ignore */
  }
}

export async function bindStreamToSpeaker(
  el: HTMLMediaElement | null,
  stream: MediaStream | null,
  useSpeaker: boolean
): Promise<void> {
  if (!el || !stream) return;
  el.srcObject = stream;
  el.volume = 1;
  try {
    const sink = el as HTMLMediaElement & { setSinkId?: (id: string) => Promise<void> };
    if (useSpeaker && typeof sink.setSinkId === 'function') {
      await sink.setSinkId('default');
    }
    await el.play();
  } catch {
    /* autoplay */
  }
}

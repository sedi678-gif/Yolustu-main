'use client';

import { primeCallMedia, releaseMediaStream } from '@/app/lib/mediaPermissions';
import {
  ensureZegoConfig,
  getZegoAppId,
  getZegoServerSecret,
} from '@/app/lib/zegoConfig';
import {
  requestCallNotificationPermission,
  showIncomingCallNotification,
} from '@/app/lib/callNotifications';
import { toZegoRoomId, toZegoUserId, toZegoUserName } from '@/app/lib/zegoUserId';
import type { CallType } from '@/app/lib/callService';
import { getCallUiState, setCallUiState } from '@/app/lib/callUiBridge';

type ZegoUIKitModule = typeof import('@zegocloud/zego-uikit-prebuilt');
type ZegoInstance = ReturnType<ZegoUIKitModule['ZegoUIKitPrebuilt']['create']>;

export interface ZegoCallKitOptions {
  canReceiveFrom?: (callerId: string, callType: CallType) => boolean;
  onCallInvitationEnded?: (reason: string) => void;
  onOutgoingAccepted?: (calleeId: string) => void;
}

const optionsRef: { current: ZegoCallKitOptions } = { current: {} };

let zpInstance: ZegoInstance | null = null;
let mediaZp: ZegoInstance | null = null;
let mediaRoomId: string | null = null;
let activeUserId: string | null = null;
let activeUserName: string | null = null;
let initPromise: Promise<ZegoInstance | null> | null = null;
let lastInitError: string | null = null;
let tableVoiceActive = false;
let joinWithCamera = false;
let zimBound = false;
let zimRef: ZimLike | null = null;
let pendingZimCallId = '';
let pendingCalleeZegoId = '';
let pendingRoomId = '';
let pendingCallType: CallType = 'voice';

const TEST_TOKEN_TTL_SEC = 24 * 60 * 60;

type ZimUser = { userID: string; userName?: string };
type ZimLike = {
  callInvite: (
    invitees: string[],
    config: { timeout: number; extendedData: string }
  ) => Promise<{ callID: string; errorUserList?: ZimUser[]; errorInvitees?: ZimUser[] }>;
  callCancel: (callID: string, invitees: string[], config: { extendedData: string }) => Promise<unknown>;
  callAccept: (callID: string, config: { extendedData: string }) => Promise<unknown>;
  callReject: (callID: string, config: { extendedData: string }) => Promise<unknown>;
  callEnd?: (callID: string, config?: { extendedData: string }) => Promise<unknown>;
  on: (event: string, cb: (zim: unknown, info: Record<string, unknown>) => void) => void;
};

type InvitePayload = {
  roomId: string;
  callType: CallType;
  peerName?: string;
  peerAvatar?: string;
};

function generateTestKitToken(
  ZegoUIKitPrebuilt: ZegoUIKitModule['ZegoUIKitPrebuilt'],
  roomID: string,
  userID: string,
  userName: string
): string {
  const appID = Number(getZegoAppId());
  const serverSecret = String(getZegoServerSecret() ?? '').trim();
  const rid = String(roomID ?? '');
  const uid = String(userID ?? '');
  if (!Number.isFinite(appID) || appID <= 0) {
    throw new Error('Zego appID etibarsızdır.');
  }
  if (!serverSecret) {
    throw new Error('Zego serverSecret yüklənməyib.');
  }
  if (!rid) {
    throw new Error('Zego roomID boşdur.');
  }
  if (!uid) {
    throw new Error('Zego userID boşdur.');
  }
  return ZegoUIKitPrebuilt.generateKitTokenForTest(
    appID,
    serverSecret,
    rid,
    uid,
    String(userName || uid),
    TEST_TOKEN_TTL_SEC
  );
}

function destroyPrebuilt(instance: ZegoInstance | null): void {
  if (!instance) return;
  try {
    instance.destroy();
  } catch {
    /* ignore */
  }
}

function parseInvitePayload(raw: unknown): InvitePayload | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const data = JSON.parse(raw) as InvitePayload;
    if (!data?.roomId) return null;
    return {
      roomId: String(data.roomId),
      callType: data.callType === 'video' ? 'video' : 'voice',
      peerName: data.peerName,
      peerAvatar: data.peerAvatar,
    };
  } catch {
    return null;
  }
}

/** Next.js 16 body-ni React root kimi istifadə edir — Zego-nu html altına, body-dən kənar qoy. */
function getOrCreateZegoStage(): HTMLElement {
  let el = document.getElementById('zego-call-stage');
  if (!el) {
    el = document.createElement('div');
    el.id = 'zego-call-stage';
    el.setAttribute('aria-hidden', 'true');
  }
  if (el.parentElement !== document.documentElement) {
    document.documentElement.appendChild(el);
  }
  el.style.display = 'block';
  return el;
}

function patchJoinRoom(zp: ZegoInstance): void {
  const kit = zp as ZegoInstance & { __yolustuJoinPatched?: boolean };
  if (kit.__yolustuJoinPatched) return;
  kit.__yolustuJoinPatched = true;
  const original = zp.joinRoom.bind(zp);
  zp.joinRoom = ((config: Record<string, unknown> = {}) => {
    const stage = getOrCreateZegoStage();
    const given = config.container;
    const container =
      given instanceof HTMLElement && given !== document.body && given !== document.documentElement
        ? given
        : stage;
    if (container.parentElement === document.body) {
      stage.appendChild(container);
    }
    return original({
      ...config,
      container,
      showPreJoinView: false,
      showLeavingView: false,
      sharedLinks: [],
    });
  }) as typeof zp.joinRoom;
}

let zegoDomGuarded = false;
let zegoImportGuard = false;

function installZegoBodyGuard(): void {
  if (zegoDomGuarded || typeof document === 'undefined' || !document.body) return;
  zegoDomGuarded = true;
  const body = document.body;
  const insertBefore = body.insertBefore.bind(body);
  const appendChild = body.appendChild.bind(body);

  body.insertBefore = function (node, child) {
    if (
      zegoImportGuard &&
      node instanceof HTMLElement &&
      node.tagName === 'DIV' &&
      !node.id &&
      (child === body.firstChild || child === body.firstElementChild)
    ) {
      node.id = 'zego-invite-host';
      return getOrCreateZegoStage().appendChild(node);
    }
    return insertBefore(node, child);
  } as typeof body.insertBefore;

  body.appendChild = function (node) {
    if (node instanceof HTMLElement && node.id === 'zego-container') {
      return getOrCreateZegoStage().appendChild(node);
    }
    return appendChild(node);
  } as typeof body.appendChild;
}

async function patchSharedReactRoot(): Promise<void> {
  try {
    const rd = await import('react-dom/client');
    const patched = rd as typeof rd & { __yolustuCreateRootPatched?: boolean };
    if (patched.__yolustuCreateRootPatched) return;
    patched.__yolustuCreateRootPatched = true;
    const original = rd.createRoot.bind(rd);
    rd.createRoot = ((container: Element | DocumentFragment, options?: Parameters<typeof rd.createRoot>[1]) => {
      let host = container;
      if (host === document.body || host === document.documentElement) {
        host = getOrCreateZegoStage();
      }
      return original(host as Element, options);
    }) as typeof rd.createRoot;
  } catch {
    /* Zego öz React-ını bundle edirsə bu patch toxunmur — ona görə invitation UI-ni çağırmırıq */
  }
}

let uikitPromise: Promise<ZegoUIKitModule> | null = null;

function loadZegoUIKit(): Promise<ZegoUIKitModule> {
  if (!uikitPromise) {
    uikitPromise = (async () => {
      installZegoBodyGuard();
      await patchSharedReactRoot();
      zegoImportGuard = true;
      try {
        return await import('@zegocloud/zego-uikit-prebuilt');
      } finally {
        zegoImportGuard = false;
      }
    })();
  }
  return uikitPromise;
}

export function hideZegoStage(): void {
  const el = document.getElementById('zego-call-stage');
  if (el) el.style.display = 'none';
}

export function setJoinWithCamera(on: boolean): void {
  joinWithCamera = on;
}

function getZim(): ZimLike | null {
  if (zimRef) return zimRef;
  try {
    const g = globalThis as unknown as { ZIM?: { getInstance?: () => ZimLike } };
    return g.ZIM?.getInstance?.() ?? null;
  } catch {
    return null;
  }
}

function stopCallUi(reason: string) {
  pendingZimCallId = '';
  pendingCalleeZegoId = '';
  pendingRoomId = '';
  leaveMediaRoom();
  setCallUiState(null);
  optionsRef.current.onCallInvitationEnded?.(reason);
}

function bindZimListeners(zim: ZimLike) {
  if (zimBound) return;
  zimBound = true;

  zim.on('callInvitationReceived', (_z, info) => {
    const inviter = (info.inviter || {}) as ZimUser;
    const callID = String(info.callID || '');
    const payload = parseInvitePayload(info.extendedData);
    const callType = payload?.callType || 'voice';
    if (optionsRef.current.canReceiveFrom && !optionsRef.current.canReceiveFrom(inviter.userID, callType)) {
      void zim.callReject(callID, { extendedData: '' });
      return;
    }
    pendingZimCallId = callID;
    pendingRoomId = payload?.roomId || toZegoRoomId(callID, 'c_');
    pendingCallType = callType;
    showIncomingCallNotification(inviter.userName || inviter.userID, callType);
    setCallUiState({
      mode: 'incoming',
      callType,
      peerName: payload?.peerName || inviter.userName || inviter.userID || 'İstifadəçi',
      peerAvatar: payload?.peerAvatar,
      accept: () => {
        void zim
          .callAccept(callID, { extendedData: '' })
          .then(() => joinMediaRoom(pendingRoomId, pendingCallType))
          .catch((err) => {
            console.error('[ZIM] callAccept', err);
            stopCallUi('accept_failed');
          });
      },
      refuse: () => {
        void zim.callReject(callID, { extendedData: '' });
        stopCallUi('refused');
      },
    });
  });

  zim.on('callUserStateChanged', (_z, info) => {
    const list = (info.callUserList || []) as { userID?: string; state?: number }[];
    for (const user of list) {
      if (!user?.userID || user.userID === activeUserId) continue;
      if (user.state === 1) {
        const prev = getCallUiState();
        if (prev) setCallUiState({ ...prev, mode: 'connecting' });
        optionsRef.current.onOutgoingAccepted?.(user.userID);
        if (pendingRoomId) void joinMediaRoom(pendingRoomId, pendingCallType);
      }
      if (user.state === 2 || user.state === 4 || user.state === 6 || user.state === 7) {
        stopCallUi(`user_${user.state}`);
      }
    }
  });

  zim.on('callInvitationCancelled', () => stopCallUi('cancelled'));
  zim.on('callInvitationTimeout', () => stopCallUi('timeout'));
  zim.on('callInvitationEnded', () => stopCallUi('ended'));
}

function mediaRoomConfig(
  ZegoUIKitPrebuilt: ZegoUIKitModule['ZegoUIKitPrebuilt'],
  callType: CallType
) {
  return {
    container: getOrCreateZegoStage(),
    scenario: {
      mode: ZegoUIKitPrebuilt.OneONoneCall,
      config: { role: ZegoUIKitPrebuilt.Host },
    },
    turnOnMicrophoneWhenJoining: true,
    turnOnCameraWhenJoining: callType === 'video' && joinWithCamera,
    showMyCameraToggleButton: false,
    showMyMicrophoneToggleButton: false,
    showAudioVideoSettingsButton: false,
    showLeaveRoomButton: false,
    showMoreButton: false,
    showTextChat: false,
    showUserList: false,
    showScreenSharingButton: false,
    showLayoutButton: false,
    showPinButton: false,
    showPreJoinView: false,
    showLeavingView: false,
    showRoomTimer: false,
    sharedLinks: [],
  };
}

async function joinMediaRoom(roomId: string, callType: CallType): Promise<void> {
  const rid = String(roomId || '');
  const uid = String(activeUserId || '');
  if (!rid || !uid) return;
  if (mediaZp && mediaRoomId === rid) return;

  leaveMediaRoom();

  const { ZegoUIKitPrebuilt } = await loadZegoUIKit();
  const kitToken = generateTestKitToken(
    ZegoUIKitPrebuilt,
    rid,
    uid,
    String(activeUserName || uid)
  );
  const zp = ZegoUIKitPrebuilt.create(kitToken);
  patchJoinRoom(zp);
  zp.joinRoom(mediaRoomConfig(ZegoUIKitPrebuilt, callType));
  mediaZp = zp;
  mediaRoomId = rid;

  const prev = getCallUiState();
  setCallUiState({
    mode: 'active',
    callType,
    peerName: prev?.peerName || 'İstifadəçi',
    peerAvatar: prev?.peerAvatar,
  });
}

function leaveMediaRoom(): void {
  destroyPrebuilt(mediaZp);
  mediaZp = null;
  mediaRoomId = null;
  hideZegoStage();
}

export function getZegoLastInitError(): string | null {
  return lastInitError;
}

export async function initZegoCallKit(
  userId: string,
  userName: string,
  options: ZegoCallKitOptions = {}
): Promise<ZegoInstance | null> {
  optionsRef.current = { ...optionsRef.current, ...options };

  const zegoUserId = String(toZegoUserId(userId));
  const zegoName = String(toZegoUserName(userName, userId));
  if (!zegoUserId) {
    lastInitError = 'Etibarlı istifadəçi ID-si yoxdur.';
    return null;
  }

  const configured = await ensureZegoConfig();
  if (!configured) {
    lastInitError = 'Zego konfiqurasiyası tapılmadı.';
    return null;
  }

  if (tableVoiceActive) {
    activeUserId = zegoUserId;
    activeUserName = zegoName;
    return zpInstance;
  }

  if (zpInstance && activeUserId === zegoUserId) {
    activeUserName = zegoName;
    return zpInstance;
  }

  if (zpInstance && activeUserId !== zegoUserId) {
    destroyZegoCallKit();
  }

  if (initPromise) return initPromise;

  initPromise = (async () => {
    lastInitError = null;
    try {
      const [{ ZegoUIKitPrebuilt }, { ZIM }] = await Promise.all([
        loadZegoUIKit(),
        import('zego-zim-web'),
      ]);

      if (tableVoiceActive) {
        activeUserId = zegoUserId;
        activeUserName = zegoName;
        return zpInstance;
      }

      await requestCallNotificationPermission();

      const inviteRoomId = toZegoRoomId(zegoUserId, 'sig_');
      const kitToken = generateTestKitToken(
        ZegoUIKitPrebuilt,
        inviteRoomId,
        zegoUserId,
        zegoName
      );

      const zp = ZegoUIKitPrebuilt.create(kitToken);
      zp.addPlugins({ ZIM });
      patchJoinRoom(zp);

      zimRef = (ZIM as unknown as { getInstance?: () => ZimLike }).getInstance?.() || null;
      if (zimRef) bindZimListeners(zimRef);

      zpInstance = zp;
      activeUserId = zegoUserId;
      activeUserName = zegoName;
      return zp;
    } catch (err) {
      lastInitError = err instanceof Error ? err.message : 'Zego init xətası';
      console.error('[Zego] init failed:', err);
      zpInstance = null;
      return null;
    }
  })().finally(() => {
    initPromise = null;
  });

  return initPromise;
}

export async function sendZegoCallInvitation(
  zp: ZegoInstance,
  params: {
    calleeId: string;
    calleeName: string;
    calleeAvatar?: string;
    callType: CallType;
    timeout?: number;
    joinCamera?: boolean;
    roomId?: string;
    callerAvatar?: string;
  }
): Promise<{ errorInvitees: { userID: string }[] }> {
  void zp;
  setJoinWithCamera(Boolean(params.joinCamera));

  const zim = getZim();
  if (!zim) {
    throw new Error('Zəng siqnalı hazır deyil. Səhifəni yeniləyib yenidən yoxlayın.');
  }

  const calleeZegoId = toZegoUserId(params.calleeId);
  const roomId = toZegoRoomId(params.roomId || params.calleeId, 'c_');
  pendingCalleeZegoId = calleeZegoId;
  pendingRoomId = roomId;
  pendingCallType = params.callType;

  const payload: InvitePayload = {
    roomId,
    callType: params.callType,
    peerName: activeUserName || undefined,
    peerAvatar: params.callerAvatar,
  };

  setCallUiState({
    mode: 'outgoing',
    callType: params.callType,
    peerName: params.calleeName,
    peerAvatar: params.calleeAvatar,
    cancel: () => {
      if (pendingZimCallId) {
        void zim.callCancel(pendingZimCallId, [calleeZegoId], { extendedData: '' });
      }
      stopCallUi('cancelled');
    },
  });

  const result = await zim.callInvite([calleeZegoId], {
    timeout: params.timeout ?? 60,
    extendedData: JSON.stringify(payload),
  });

  pendingZimCallId = result.callID;
  const errors = result.errorUserList?.length ? result.errorUserList : result.errorInvitees || [];
  if (errors.length) {
    setCallUiState(null);
    pendingZimCallId = '';
  }
  return { errorInvitees: errors.map((u) => ({ userID: u.userID })) };
}

export function getZegoCallKitInstance(): ZegoInstance | null {
  return zpInstance;
}

export function isZegoCallKitReady(): boolean {
  return zpInstance !== null;
}

export function destroyZegoCallKit(): void {
  const hadInstance = zpInstance !== null || mediaZp !== null;
  leaveMediaRoom();
  destroyPrebuilt(zpInstance);
  zpInstance = null;
  zimRef = null;
  zimBound = false;
  activeUserId = null;
  activeUserName = null;
  initPromise = null;
  pendingZimCallId = '';
  if (hadInstance) setCallUiState(null);
}

type ZegoExpressLike = {
  muteMicrophone?: (mute: boolean) => void;
  muteSpeaker?: (mute: boolean) => void;
  enableCamera?: (enable: boolean) => void;
  mutePublishStreamVideo?: (mute: boolean) => void;
};

function getExpress(): ZegoExpressLike | null {
  const live = mediaZp || zpInstance;
  const express = (live as { express?: ZegoExpressLike } | null)?.express;
  return express ?? null;
}

export function zegoHangUp() {
  const zim = getZim();
  if (zim && pendingZimCallId) {
    const id = pendingZimCallId;
    if (pendingCalleeZegoId) {
      void zim.callCancel(id, [pendingCalleeZegoId], { extendedData: '' }).catch(() => {
        void zim.callEnd?.(id, { extendedData: '' });
      });
    } else {
      void zim.callEnd?.(id, { extendedData: '' });
    }
  }
  try {
    mediaZp?.hangUp();
  } catch {
    /* ignore */
  }
  leaveMediaRoom();
  pendingZimCallId = '';
  pendingCalleeZegoId = '';
  pendingRoomId = '';
  setCallUiState(null);
}

export function zegoMuteMicrophone(muted: boolean) {
  getExpress()?.muteMicrophone?.(muted);
}

export function zegoMuteSpeaker(muted: boolean) {
  getExpress()?.muteSpeaker?.(muted);
}

export function zegoEnableCamera(on: boolean) {
  const express = getExpress();
  if (!express) return;
  if (express.enableCamera) {
    express.enableCamera(on);
    return;
  }
  express.mutePublishStreamVideo?.(!on);
}

let tableZp: ZegoInstance | null = null;
let tableRoomId: string | null = null;

function arenaVoiceRoomId(matchId: string): string {
  return toZegoRoomId(String(matchId ?? ''), 'arena_');
}

function restoreCallKitAfterTable(): void {
  tableVoiceActive = false;
  const uid = activeUserId;
  const name = activeUserName;
  if (!uid) return;
  void initZegoCallKit(uid, name ?? uid, optionsRef.current);
}

export async function joinArenaVoiceRoom(input: {
  matchId: string;
  playerId: string;
  playerName: string;
  container: HTMLElement;
}): Promise<boolean> {
  const configured = await ensureZegoConfig();
  if (!configured) return false;
  const primed = await primeCallMedia(false);
  releaseMediaStream(primed.stream);
  if (!primed.audio) return false;

  const roomId = String(arenaVoiceRoomId(input.matchId));
  const zegoUserId = String(toZegoUserId(input.playerId));
  const zegoName = String(toZegoUserName(input.playerName, input.playerId));
  if (!roomId || !zegoUserId) return false;

  if (tableZp && tableRoomId === roomId) return true;

  if (!activeUserId) {
    activeUserId = zegoUserId;
    activeUserName = zegoName;
  }

  tableVoiceActive = true;
  if (initPromise) {
    try {
      await initPromise;
    } catch {
      /* ignore */
    }
  }
  leaveArenaVoiceRoom({ restoreCallKit: false });
  destroyPrebuilt(zpInstance);
  zpInstance = null;
  initPromise = null;

  try {
    const { ZegoUIKitPrebuilt } = await loadZegoUIKit();
    const kitToken = generateTestKitToken(
      ZegoUIKitPrebuilt,
      roomId,
      zegoUserId,
      zegoName
    );
    const zp = ZegoUIKitPrebuilt.create(kitToken);
    patchJoinRoom(zp);
    zp.joinRoom({
      container: input.container,
      showPreJoinView: false,
      turnOnMicrophoneWhenJoining: true,
      turnOnCameraWhenJoining: false,
      showMyCameraToggleButton: false,
      showMyMicrophoneToggleButton: true,
      showAudioVideoSettingsButton: false,
      showTextChat: false,
      showUserList: false,
      showScreenSharingButton: false,
      showLayoutButton: false,
      showPinButton: false,
      showRoomTimer: false,
      showLeavingView: false,
      maxUsers: 12,
      scenario: {
        mode: ZegoUIKitPrebuilt.GroupCall,
        config: { role: ZegoUIKitPrebuilt.Host },
      },
    });
    tableZp = zp;
    tableRoomId = roomId;
    return true;
  } catch (err) {
    console.error('[Zego] arena voice failed:', err);
    tableZp = null;
    tableRoomId = null;
    restoreCallKitAfterTable();
    return false;
  }
}

export function leaveArenaVoiceRoom(opts?: { restoreCallKit?: boolean }): void {
  const restore = opts?.restoreCallKit !== false;
  destroyPrebuilt(tableZp);
  tableZp = null;
  tableRoomId = null;
  if (restore) restoreCallKitAfterTable();
}

export function setArenaVoiceMuted(muted: boolean): void {
  const express = (tableZp as { express?: ZegoExpressLike } | null)?.express;
  express?.muteMicrophone?.(muted);
}

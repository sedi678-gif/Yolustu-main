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
let activeUserId: string | null = null;
let activeUserName: string | null = null;
let initPromise: Promise<ZegoInstance | null> | null = null;
let lastInitError: string | null = null;
let tableVoiceActive = false;
let joinWithCamera = false;

/** Test kit token — Zego default 7200s; 24 saat yenilənmiş müddət. */
const TEST_TOKEN_TTL_SEC = 24 * 60 * 60;

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

function toCallType(
  ZegoUIKitPrebuilt: ZegoUIKitModule['ZegoUIKitPrebuilt'],
  invitationType: number
): CallType {
  return invitationType === ZegoUIKitPrebuilt.InvitationTypeVideoCall ? 'video' : 'voice';
}

function peerLabel(user?: { userID?: string; userName?: string }): string {
  const name = user?.userName?.trim();
  if (name) return name;
  return user?.userID || 'İstifadəçi';
}

function getOrCreateZegoStage(): HTMLElement {
  let el = document.getElementById('zego-call-stage');
  if (!el) {
    el = document.createElement('div');
    el.id = 'zego-call-stage';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }
  el.style.display = 'block';
  return el;
}

export function hideZegoStage(): void {
  const el = document.getElementById('zego-call-stage');
  if (el) el.style.display = 'none';
}

export function setJoinWithCamera(on: boolean): void {
  joinWithCamera = on;
}

function buildInvitationConfig(ZegoUIKitPrebuilt: ZegoUIKitModule['ZegoUIKitPrebuilt']) {
  return {
    enableNotifyWhenAppRunningInBackgroundOrQuit: false,
    enableCustomCallInvitationDialog: true,
    enableCustomCallInvitationWaitingPage: true,
    endCallWhenInitiatorLeave: true,
    onWaitingPageWhenSending: (
      callType: number,
      callees: { userID: string; userName?: string; avatar?: string }[],
      cancel: () => void
    ) => {
      const peer = callees[0];
      setCallUiState({
        mode: 'outgoing',
        callType: toCallType(ZegoUIKitPrebuilt, callType),
        peerName: peerLabel(peer),
        peerAvatar: peer?.avatar,
        cancel,
      });
      return false;
    },
    onConfirmDialogWhenReceiving: (
      callType: number,
      caller: { userID: string; userName?: string; avatar?: string },
      refuse: () => void,
      accept?: () => void
    ) => {
      const mapped = toCallType(ZegoUIKitPrebuilt, callType);
      if (optionsRef.current.canReceiveFrom && !optionsRef.current.canReceiveFrom(caller.userID, mapped)) {
        refuse();
        return false;
      }
      setCallUiState({
        mode: 'incoming',
        callType: mapped,
        peerName: peerLabel(caller),
        peerAvatar: caller.avatar,
        accept,
        refuse,
      });
      return false;
    },
    onIncomingCallReceived: (
      _callID: string,
      caller: { userID: string; userName?: string },
      callType: number
    ) => {
      showIncomingCallNotification(
        caller.userName || caller.userID,
        toCallType(ZegoUIKitPrebuilt, callType)
      );
    },
    onSetRoomConfigBeforeJoining: (callType: number) => {
      const isVideo = callType === ZegoUIKitPrebuilt.InvitationTypeVideoCall;
      const prev = getCallUiState();
      setCallUiState({
        mode: 'active',
        callType: toCallType(ZegoUIKitPrebuilt, callType),
        peerName: prev?.peerName || 'İstifadəçi',
        peerAvatar: prev?.peerAvatar,
      });
      return {
        container: getOrCreateZegoStage(),
        scenario: {
          mode: ZegoUIKitPrebuilt.OneONoneCall,
          config: { role: ZegoUIKitPrebuilt.Host },
        },
        turnOnMicrophoneWhenJoining: true,
        turnOnCameraWhenJoining: isVideo && joinWithCamera,
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
      };
    },
    onCallInvitationEnded: (reason: string) => {
      hideZegoStage();
      const ui = getCallUiState();
      if (!ui || ui.mode !== 'active' || String(reason) === 'LeaveRoom') {
        setCallUiState(null);
      }
      optionsRef.current.onCallInvitationEnded?.(String(reason));
    },
    onOutgoingCallAccepted: (_callID: string, callee: { userID: string }) => {
      const prev = getCallUiState();
      if (prev) {
        setCallUiState({ ...prev, mode: 'connecting' });
      }
      optionsRef.current.onOutgoingAccepted?.(callee.userID);
    },
  };
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
        import('@zegocloud/zego-uikit-prebuilt'),
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
      zp.setCallInvitationConfig(buildInvitationConfig(ZegoUIKitPrebuilt));

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
  }
): Promise<{ errorInvitees: { userID: string }[] }> {
  const { ZegoUIKitPrebuilt } = await import('@zegocloud/zego-uikit-prebuilt');
  setJoinWithCamera(Boolean(params.joinCamera));

  const invitationType =
    params.callType === 'video'
      ? ZegoUIKitPrebuilt.InvitationTypeVideoCall
      : ZegoUIKitPrebuilt.InvitationTypeVoiceCall;

  const calleeZegoId = toZegoUserId(params.calleeId);

  return zp.sendCallInvitation({
    callees: [
      {
        userID: calleeZegoId,
        userName: toZegoUserName(params.calleeName, params.calleeId),
        avatar: params.calleeAvatar,
      },
    ],
    callType: invitationType,
    timeout: params.timeout ?? 60,
  });
}

export function getZegoCallKitInstance(): ZegoInstance | null {
  return zpInstance;
}

export function isZegoCallKitReady(): boolean {
  return zpInstance !== null;
}

export function destroyZegoCallKit(): void {
  const hadInstance = zpInstance !== null;
  destroyPrebuilt(zpInstance);
  zpInstance = null;
  activeUserId = null;
  activeUserName = null;
  initPromise = null;
  hideZegoStage();
  if (hadInstance) setCallUiState(null);
}

type ZegoExpressLike = {
  muteMicrophone?: (mute: boolean) => void;
  muteSpeaker?: (mute: boolean) => void;
  enableCamera?: (enable: boolean) => void;
  mutePublishStreamVideo?: (mute: boolean) => void;
};

function getExpress(): ZegoExpressLike | null {
  const express = (zpInstance as { express?: ZegoExpressLike } | null)?.express;
  return express ?? null;
}

export function zegoHangUp() {
  try {
    zpInstance?.hangUp();
  } catch {
    /* ignore */
  }
  hideZegoStage();
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
    const { ZegoUIKitPrebuilt } = await import('@zegocloud/zego-uikit-prebuilt');
    const kitToken = generateTestKitToken(
      ZegoUIKitPrebuilt,
      roomId,
      zegoUserId,
      zegoName
    );
    const zp = ZegoUIKitPrebuilt.create(kitToken);
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

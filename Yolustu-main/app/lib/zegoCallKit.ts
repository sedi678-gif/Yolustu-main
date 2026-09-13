'use client';

import {
  ensureZegoConfig,
  getZegoAppId,
  getZegoServerSecret,
} from '@/app/lib/zegoConfig';
import {
  requestCallNotificationPermission,
  showIncomingCallNotification,
} from '@/app/lib/callNotifications';
import { ensureMediaPermission } from '@/app/lib/mediaPermissions';
import { toZegoUserId, toZegoUserName } from '@/app/lib/zegoUserId';
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
let initPromise: Promise<ZegoInstance | null> | null = null;
let lastInitError: string | null = null;

function toCallType(
  ZegoUIKitPrebuilt: ZegoUIKitModule['ZegoUIKitPrebuilt'],
  invitationType: number
): CallType {
  return invitationType === ZegoUIKitPrebuilt.InvitationTypeVideoCall ? 'video' : 'voice';
}

function peerLabel(user?: { userName?: string; userID?: string }) {
  return user?.userName || user?.userID || 'İstifadəçi';
}

function buildInvitationConfig(ZegoUIKitPrebuilt: ZegoUIKitModule['ZegoUIKitPrebuilt']) {
  return {
    enableNotifyWhenAppRunningInBackgroundOrQuit: true,
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
        return;
      }
      setCallUiState({
        mode: 'incoming',
        callType: mapped,
        peerName: peerLabel(caller),
        peerAvatar: caller.avatar,
        accept,
        refuse,
      });
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
        scenario: {
          mode: ZegoUIKitPrebuilt.OneONoneCall,
          config: { role: ZegoUIKitPrebuilt.Host },
        },
        turnOnMicrophoneWhenJoining: true,
        turnOnCameraWhenJoining: isVideo,
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
        showRoomTimer: false,
      };
    },
    onCallInvitationEnded: (reason: string) => {
      const ui = getCallUiState();
      if (!ui || ui.mode !== 'active' || String(reason) === 'LeaveRoom') {
        setCallUiState(null);
      }
      optionsRef.current.onCallInvitationEnded?.(String(reason));
    },
    onOutgoingCallAccepted: (_callID: string, callee: { userID: string }) => {
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

  const zegoUserId = toZegoUserId(userId);
  if (!zegoUserId || zegoUserId === 'user_unknown') {
    lastInitError = 'Etibarlı istifadəçi ID-si yoxdur.';
    return null;
  }

  const configured = await ensureZegoConfig();
  if (!configured) {
    lastInitError = 'Zego konfiqurasiyası tapılmadı.';
    return null;
  }

  if (zpInstance && activeUserId === zegoUserId) {
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

      await requestCallNotificationPermission();

      const appID = getZegoAppId();
      const serverSecret = getZegoServerSecret();
      const zegoName = toZegoUserName(userName, userId);

      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appID,
        serverSecret,
        null as unknown as string,
        zegoUserId,
        zegoName
      );

      const zp = ZegoUIKitPrebuilt.create(kitToken);
      zp.addPlugins({ ZIM });
      zp.setCallInvitationConfig(buildInvitationConfig(ZegoUIKitPrebuilt));

      zpInstance = zp;
      activeUserId = zegoUserId;
      return zp;
    } catch (err) {
      lastInitError = err instanceof Error ? err.message : 'Zego init xətası';
      console.error('[Zego] init failed:', err);
      zpInstance = null;
      activeUserId = null;
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
  }
): Promise<{ errorInvitees: { userID: string }[] }> {
  const { ZegoUIKitPrebuilt } = await import('@zegocloud/zego-uikit-prebuilt');

  const mediaOk = await ensureMediaPermission(
    params.callType === 'video' ? 'camera' : 'microphone'
  );
  if (!mediaOk) {
    throw new Error(
      params.callType === 'video'
        ? 'Kamera/mikrofon icazəsi verilməyib.'
        : 'Mikrofon icazəsi verilməyib.'
    );
  }

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
    timeout: params.timeout ?? 90,
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
  try {
    zpInstance?.destroy();
  } catch {
    /* ignore */
  }
  zpInstance = null;
  activeUserId = null;
  initPromise = null;
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

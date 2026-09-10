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

function buildInvitationConfig(ZegoUIKitPrebuilt: ZegoUIKitModule['ZegoUIKitPrebuilt']) {
  return {
    enableNotifyWhenAppRunningInBackgroundOrQuit: true,
    endCallWhenInitiatorLeave: true,
    onConfirmDialogWhenReceiving: (
      callType: number,
      caller: { userID: string },
      refuse: () => void
    ) => {
      const mapped = toCallType(ZegoUIKitPrebuilt, callType);
      if (optionsRef.current.canReceiveFrom && !optionsRef.current.canReceiveFrom(caller.userID, mapped)) {
        refuse();
      }
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
      return {
        scenario: {
          mode: ZegoUIKitPrebuilt.OneONoneCall,
          config: { role: ZegoUIKitPrebuilt.Host },
        },
        turnOnMicrophoneWhenJoining: true,
        turnOnCameraWhenJoining: isVideo,
        showMyCameraToggleButton: true,
        showMyMicrophoneToggleButton: true,
        showAudioVideoSettingsButton: true,
        showLeaveRoomButton: true,
        showTextChat: false,
        showUserList: false,
        showScreenSharingButton: false,
        showLayoutButton: false,
        showPinButton: false,
        showPreJoinView: false,
      };
    },
    onCallInvitationEnded: (reason: string) => {
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
  try {
    zpInstance?.destroy();
  } catch {
    /* ignore */
  }
  zpInstance = null;
  activeUserId = null;
  initPromise = null;
}

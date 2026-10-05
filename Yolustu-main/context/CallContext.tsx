"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { getAppUserId, getLocalProfileDisplayName } from '@/app/lib/userId';
import { sendCallLogMessage } from '@/app/lib/messageService';
import {
  createCallId,
  createCallSession,
  inviteParticipantToCall,
  normalizeUserId,
  CallType,
} from '@/app/lib/callService';
import { getCallSettings } from '@/app/lib/callSettings';
import { listenFollowingIds, searchUsers } from '@/app/lib/socialService';
import { ensureZegoConfig, getZegoConfigErrorMessage } from '@/app/lib/zegoConfig';
import {
  destroyZegoCallKit,
  getZegoCallKitInstance,
  getZegoLastInitError,
  initZegoCallKit,
  sendZegoCallInvitation,
} from '@/app/lib/zegoCallKit';
import { toZegoUserId } from '@/app/lib/zegoUserId';
import styles from '@/app/components/social/social.module.css';
import CallUiHost from '@/app/components/messages/CallUiHost';

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80';

interface ActiveCallState {
  callId: string;
  callType: CallType;
  peerId: string;
  peerName: string;
  chatId?: string;
}

interface StartCallParams {
  calleeId: string;
  calleeName: string;
  calleeAvatar: string;
  chatId: string;
  callType: CallType;
}

interface CallContextType {
  activeCall: ActiveCallState | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  micMuted: boolean;
  speakerMuted: boolean;
  callParticipants: string[];
  callError: string | null;
  zegoReady: boolean;
  startCall: (params: StartCallParams) => Promise<void>;
  endCall: () => Promise<void>;
  toggleMic: () => void;
  toggleSpeaker: () => void;
  cameraOn: boolean;
  remoteVideoOn: boolean;
  toggleCamera: () => Promise<void>;
  showInvite: boolean;
  setShowInvite: (v: boolean) => void;
  inviteQuery: string;
  setInviteQuery: (v: string) => void;
  inviteResults: Awaited<ReturnType<typeof searchUsers>>;
  runInviteSearch: (myId: string) => Promise<void>;
  inviteUser: (userId: string, userName: string) => Promise<void>;
  clearCallError: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

function getMyProfileMeta(): { name: string; avatar: string } {
  if (typeof window === 'undefined') return { name: '', avatar: DEFAULT_AVATAR };
  try {
    const raw = localStorage.getItem('app_current_user_v6');
    if (!raw) return { name: getLocalProfileDisplayName(), avatar: DEFAULT_AVATAR };
    const u = JSON.parse(raw);
    return {
      name: [u.name, u.surname].filter(Boolean).join(' ') || getLocalProfileDisplayName(),
      avatar: u.avatar || DEFAULT_AVATAR,
    };
  } catch {
    return { name: getLocalProfileDisplayName(), avatar: DEFAULT_AVATAR };
  }
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useUser();
  const myId = normalizeUserId(getAppUserId(userId));

  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [zegoReady, setZegoReady] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteResults, setInviteResults] = useState<Awaited<ReturnType<typeof searchUsers>>>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  const activeCallRef = useRef<ActiveCallState | null>(null);
  const followingIdsRef = useRef<string[]>([]);
  const myIdRef = useRef(myId);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    followingIdsRef.current = followingIds;
  }, [followingIds]);

  useEffect(() => {
    myIdRef.current = myId;
  }, [myId]);

  useEffect(() => {
    if (!myId) return;
    return listenFollowingIds(myId, setFollowingIds);
  }, [myId]);

  const canReceiveFrom = useCallback((callerId: string, callType: CallType) => {
    const settings = getCallSettings();
    if (settings.allowCallsFrom === 'nobody') return false;
    if (
      settings.allowCallsFrom === 'following' &&
      !followingIdsRef.current.includes(normalizeUserId(callerId))
    ) {
      return false;
    }
    if (callType === 'video' && !settings.videoCallsEnabled) return false;
    return true;
  }, []);

  const buildKitOptions = useCallback(
    () => ({
      canReceiveFrom,
      onCallInvitationEnded: () => {
        const call = activeCallRef.current;
        const id = myIdRef.current;
        if (call && id) {
          void sendCallLogMessage({
            senderId: id,
            recipientId: call.peerId,
            callType: call.callType,
            callStatus: 'bitdi',
            senderName: getMyProfileMeta().name,
            recipientName: call.peerName,
          });
        }
        setActiveCall(null);
        activeCallRef.current = null;
      },
    }),
    [canReceiveFrom]
  );

  useEffect(() => {
    if (!myId || myId === 'guest' || myId === 'anonim_user_id') {
      setZegoReady(false);
      destroyZegoCallKit();
      return;
    }

    let cancelled = false;
    const meta = getMyProfileMeta();

    void (async () => {
      const ready = await ensureZegoConfig();
      if (!ready || cancelled) {
        if (!cancelled) setZegoReady(false);
        return;
      }
      const zp = await initZegoCallKit(myId, meta.name, buildKitOptions());
      if (!cancelled) setZegoReady(Boolean(zp));
    })();

    return () => {
      cancelled = true;
    };
  }, [myId, buildKitOptions]);

  useEffect(() => {
    return () => {
      destroyZegoCallKit();
    };
  }, []);

  const clearCallError = useCallback(() => setCallError(null), []);

  const startCall = useCallback(
    async (params: StartCallParams) => {
      if (!myId) {
        setCallError('Zəng etmək üçün profil qeydiyyatından keçin (/profile).');
        return;
      }

      let ready = await ensureZegoConfig();
      if (!ready) {
        await new Promise((r) => setTimeout(r, 1200));
        ready = await ensureZegoConfig();
      }
      if (!ready) {
        setCallError(getZegoConfigErrorMessage());
        return;
      }

      const calleeId = normalizeUserId(params.calleeId);
      const calleeZegoId = toZegoUserId(calleeId);
      if (!calleeId || calleeId === myId || !calleeZegoId || calleeZegoId === 'user_unknown') {
        setCallError('Zəng ediləcək istifadəçi tapılmadı.');
        return;
      }

      const settings = getCallSettings();
      if (params.callType === 'video' && !settings.videoCallsEnabled) {
        setCallError('Video zəng parametrlərdə söndürülüb.');
        return;
      }

      const myMeta = getMyProfileMeta();
      const callId = createCallId(myId, calleeId);

      setCallError(null);
      const nextCall: ActiveCallState = {
        callId,
        callType: params.callType,
        peerId: calleeId,
        peerName: params.calleeName,
        chatId: params.chatId,
      };
      activeCallRef.current = nextCall;
      setActiveCall(nextCall);

      void createCallSession({
        callId,
        chatId: params.chatId,
        callerId: myId,
        calleeId,
        callType: params.callType,
        callerName: myMeta.name,
        callerAvatar: myMeta.avatar,
      }).catch((err) => console.warn('[Call] Firebase session:', err));

      try {
        let zp = getZegoCallKitInstance();
        if (!zp) {
          zp = await initZegoCallKit(myId, myMeta.name, buildKitOptions());
        }
        if (!zp) {
          setCallError(getZegoLastInitError() || 'Zego Call Kit işə salına bilmədi.');
          setActiveCall(null);
          activeCallRef.current = null;
          return;
        }

        const result = await sendZegoCallInvitation(zp, {
          calleeId,
          calleeName: params.calleeName,
          calleeAvatar: params.calleeAvatar,
          callType: params.callType,
        });

        if (result.errorInvitees?.length) {
          setCallError(
            'Qarşı tərəf onlayn deyil. Hər iki istifadəçi tətbiqdə olmalı və profil ID-ləri eyni olmalıdır.'
          );
          setActiveCall(null);
          activeCallRef.current = null;
        }
      } catch (err) {
        console.error('[Zego] sendCallInvitation failed:', err);
        const msg = err instanceof Error ? err.message : 'Zəng göndərilmədi.';
        setCallError(msg);
        setActiveCall(null);
        activeCallRef.current = null;
      }
    },
    [myId, buildKitOptions]
  );

  const endCall = useCallback(async () => {
    try {
      getZegoCallKitInstance()?.hangUp();
    } catch {
      /* ignore */
    }
    setActiveCall(null);
    activeCallRef.current = null;
  }, []);

  const runInviteSearch = useCallback(
    async (searchMyId: string) => {
      const results = await searchUsers(inviteQuery, searchMyId);
      setInviteResults(results.filter((u) => u.id !== searchMyId));
    },
    [inviteQuery]
  );

  const inviteUser = useCallback(async (userId: string, userName: string) => {
    const call = activeCallRef.current;
    if (!call) return;
    try {
      await inviteParticipantToCall(call.callId, userId);
      setCallError(null);
      alert(`${userName} zəngə dəvət olundu.`);
      setShowInvite(false);
    } catch (err) {
      console.error(err);
      setCallError('Dəvət göndərilmədi.');
    }
  }, []);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        localStream: null,
        remoteStream: null,
        micMuted: false,
        speakerMuted: false,
        cameraOn: false,
        remoteVideoOn: false,
        callParticipants: activeCall ? [myId, activeCall.peerId] : [],
        callError,
        zegoReady,
        startCall,
        endCall,
        toggleMic: () => undefined,
        toggleSpeaker: () => undefined,
        toggleCamera: async () => undefined,
        showInvite,
        setShowInvite,
        inviteQuery,
        setInviteQuery,
        inviteResults,
        runInviteSearch,
        inviteUser,
        clearCallError,
      }}
    >
      {children}
      <CallUiHost />

      {callError && (
        <div className={styles.modalOverlay} onClick={clearCallError}>
          <div className={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Zəng xətası</h2>
            <p style={{ marginBottom: 16 }}>{callError}</p>
            <button type="button" className={styles.primaryBtn} onClick={clearCallError}>
              Bağla
            </button>
          </div>
        </div>
      )}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
}

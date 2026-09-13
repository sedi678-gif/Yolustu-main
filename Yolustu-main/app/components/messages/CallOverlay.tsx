"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  IconCallHangup,
  IconCallInvite,
  IconCallMic,
  IconCallMicOff,
  IconCallPhone,
  IconCallSpeaker,
  IconCallSpeakerOff,
  IconCallVideo,
  IconCallVideoOff,
} from './CallControlIcons';
import { unlockCallAudio } from '@/app/lib/audioUnlock';
import { CallSessionData, CallType } from '@/app/lib/callService';
import { watchVideoTrackActivity } from '@/app/lib/callVideoUtils';
import styles from './callOverlay.module.css';

interface CallOverlayProps {
  mode: 'outgoing' | 'incoming' | 'connecting' | 'active';
  chrome?: 'full' | 'docked';
  callType: CallType;
  peerName: string;
  peerAvatar?: string;
  session?: CallSessionData | null;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  participants?: string[];
  onAccept?: () => void;
  onReject?: () => void;
  onEnd?: () => void;
  onToggleMute?: () => void;
  onToggleSpeaker?: () => void;
  onToggleCamera?: () => void;
  onOpenInvite?: () => void;
  micMuted?: boolean;
  speakerMuted?: boolean;
  cameraOn?: boolean;
  remoteVideoOn?: boolean;
  errorMessage?: string | null;
  socketConnected?: boolean;
  peerConnected?: boolean;
  onDismissError?: () => void;
}

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

async function attachAudio(
  el: HTMLAudioElement | null,
  stream: MediaStream | null,
  muted: boolean
) {
  if (!el || !stream) return;
  el.srcObject = stream;
  el.volume = 1;
  el.muted = muted;
  try {
    await el.play();
  } catch {
    /* autoplay */
  }
}

async function attachVideo(el: HTMLVideoElement | null, stream: MediaStream | null) {
  if (!el || !stream) return;
  el.srcObject = stream;
  el.muted = true;
  try {
    await el.play();
  } catch {
    /* autoplay */
  }
}

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function ControlBtn({
  label,
  onClick,
  danger = false,
  accept = false,
  active = false,
  large = false,
  children,
}: {
  label: string;
  onClick?: () => void;
  danger?: boolean;
  accept?: boolean;
  active?: boolean;
  large?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={styles.controlBtn}>
      <span
        className={[
          styles.controlCircle,
          large ? styles.controlCircleLarge : '',
          danger ? styles.controlCircleDanger : '',
          accept ? styles.controlCircleAccept : '',
          active ? styles.controlCircleActive : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </span>
      <span className={[styles.controlLabel, accept ? styles.controlLabelAccept : ''].filter(Boolean).join(' ')}>
        {label}
      </span>
    </button>
  );
}

export default function CallOverlay({
  mode,
  chrome = 'full',
  callType,
  peerName,
  peerAvatar,
  localStream,
  remoteStream,
  participants = [],
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleSpeaker,
  onToggleCamera,
  onOpenInvite,
  micMuted = false,
  speakerMuted = false,
  cameraOn = false,
  remoteVideoOn = false,
  errorMessage = null,
  socketConnected = true,
  peerConnected = true,
  onDismissError,
}: CallOverlayProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const [remoteVideoLive, setRemoteVideoLive] = useState(false);

  const avatar = peerAvatar || DEFAULT_AVATAR;
  const isLiveCall = mode === 'active' || mode === 'connecting';
  const isConnecting = isLiveCall && !remoteStream;
  const showRipple = !isLiveCall && (mode === 'incoming' || mode === 'outgoing');
  const remoteHasVideo = remoteVideoOn || remoteVideoLive;
  const showVideoStage = isLiveCall && (callType === 'video' || cameraOn || remoteHasVideo);
  const isVideoCall = callType === 'video' || cameraOn || remoteHasVideo;

  const statusText =
    mode === 'incoming'
      ? 'Gələn zəng...'
      : mode === 'outgoing'
        ? 'Zəng edilir...'
        : isConnecting
          ? 'Qoşulur...'
          : 'Danışıq gedir...';

  const bindStreams = useCallback(async () => {
    await attachAudio(remoteAudioRef.current, remoteStream ?? null, speakerMuted);

    if (remoteHasVideo && remoteStream) {
      await attachVideo(remoteVideoRef.current, remoteStream);
    } else if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    if (cameraOn && localStream) {
      await attachVideo(localVideoRef.current, localStream);
    } else if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, [remoteStream, localStream, remoteHasVideo, cameraOn, speakerMuted]);

  useEffect(() => {
    return watchVideoTrackActivity(remoteStream, setRemoteVideoLive);
  }, [remoteStream]);

  useEffect(() => {
    void bindStreams();
  }, [bindStreams, mode]);

  useEffect(() => {
    if (isLiveCall) {
      void unlockCallAudio().then(() => bindStreams());
    }
  }, [isLiveCall, bindStreams]);

  useEffect(() => {
    if (!remoteStream) return;
    const onTrack = () => void bindStreams();
    remoteStream.addEventListener('addtrack', onTrack);
    return () => remoteStream.removeEventListener('addtrack', onTrack);
  }, [remoteStream, bindStreams]);

  useEffect(() => {
    if (remoteAudioRef.current) remoteAudioRef.current.muted = speakerMuted;
    if (remoteVideoRef.current) remoteVideoRef.current.muted = speakerMuted;
    void bindStreams();
  }, [speakerMuted, bindStreams]);

  useEffect(() => {
    if (mode !== 'active' && mode !== 'connecting' && mode !== 'outgoing') {
      setElapsed(0);
      return;
    }
    const startedAt = Date.now();
    setElapsed(0);
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [mode]);

  const timerDisplay = formatTimer(elapsed);
  const isDocked = chrome === 'docked';

  return (
    <div
      className={[styles.overlay, isDocked ? styles.overlayDocked : ''].filter(Boolean).join(' ')}
      role="dialog"
      aria-modal={!isDocked}
      aria-label={`${peerName} — ${statusText}`}
    >
      <audio ref={remoteAudioRef} autoPlay playsInline className={styles.srOnly} />

      {showVideoStage && (
        <div className={styles.videoStage}>
          {remoteHasVideo ? (
            <video ref={remoteVideoRef} autoPlay playsInline className={styles.remoteVideo} />
          ) : (
            <div className={styles.main}>
              <div className={[styles.avatarWrap, showRipple ? styles.avatarPulse : ''].filter(Boolean).join(' ')}>
                <img src={avatar} alt="" className={styles.avatar} />
              </div>
            </div>
          )}
          {cameraOn && (
            <video ref={localVideoRef} autoPlay playsInline muted className={styles.localPip} />
          )}
        </div>
      )}

      <header className={styles.header}>
        <p className={styles.status}>{isDocked ? peerName : statusText}</p>
        <p className={styles.timer}>{timerDisplay}</p>
        {isDocked && <p className={styles.callKind}>{statusText}</p>}
      </header>

      <main className={[styles.main, isDocked ? styles.mainDocked : ''].filter(Boolean).join(' ')}>
        {!isDocked && !showVideoStage && (
          <div className={[styles.avatarWrap, showRipple ? styles.avatarPulse : ''].filter(Boolean).join(' ')}>
            <img src={avatar} alt="" className={styles.avatar} />
          </div>
        )}

        <h2 className={styles.peerName}>{peerName}</h2>
        {!showVideoStage && (
          <p className={styles.callKind}>{isVideoCall ? 'Video zəng' : 'Səsli zəng'}</p>
        )}

        {participants.length > 2 && (
          <p className={styles.callKind}>👥 {participants.length} iştirakçı</p>
        )}

        {!peerConnected && (
          <p className={styles.serverHint} role="status">
            PeerJS cloud-a qoşulur... (bir neçə saniyə gözləyin)
          </p>
        )}

        {!socketConnected && peerConnected && (
          <p className={styles.serverHint} role="status">
            Real-time server yoxdur — zəng PeerJS cloud vasitəsilə işləyir
          </p>
        )}

        {errorMessage && (
          <div className={styles.errorBox} role="alert">
            <p>{errorMessage}</p>
            {onDismissError ? (
              <button type="button" onClick={onDismissError} className={styles.controlBtn}>
                Bağla
              </button>
            ) : null}
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        {mode === 'incoming' ? (
          <div className={styles.controlsRow}>
            <ControlBtn label="Rədd et" onClick={onReject} danger large>
              <IconCallHangup size={30} />
            </ControlBtn>
            <ControlBtn
              label="Qəbul et"
              accept
              large
              onClick={() => void unlockCallAudio().then(() => onAccept?.())}
            >
              <IconCallPhone size={30} />
            </ControlBtn>
          </div>
        ) : mode === 'outgoing' ? (
          <div className={styles.controlsRow}>
            <ControlBtn label="Ləğv et" onClick={onEnd} danger large>
              <IconCallHangup size={30} />
            </ControlBtn>
          </div>
        ) : (
          <div className={styles.controlsStack}>
            <div className={styles.controlsGrid}>
              <ControlBtn label={micMuted ? 'Susdu' : 'Mikrofon'} onClick={onToggleMute} active={micMuted}>
                {micMuted ? <IconCallMicOff /> : <IconCallMic />}
              </ControlBtn>
              <ControlBtn label={speakerMuted ? 'Səs yox' : 'Spiker'} onClick={onToggleSpeaker} active={speakerMuted}>
                {speakerMuted ? <IconCallSpeakerOff /> : <IconCallSpeaker />}
              </ControlBtn>
              <ControlBtn
                label={cameraOn ? 'Kamera açıq' : 'Kamera'}
                onClick={() => void onToggleCamera?.()}
                active={!cameraOn}
              >
                {cameraOn ? <IconCallVideo /> : <IconCallVideoOff />}
              </ControlBtn>
              {onOpenInvite && (
                <ControlBtn label="Dəvət" onClick={onOpenInvite}>
                  <IconCallInvite />
                </ControlBtn>
              )}
            </div>
            <div className={styles.controlsRow}>
              <ControlBtn label="Bitir" onClick={onEnd} danger large>
                <IconCallHangup size={30} />
              </ControlBtn>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}

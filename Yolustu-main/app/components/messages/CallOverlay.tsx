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
import { CallType } from '@/app/lib/callService';
import { watchVideoTrackActivity } from '@/app/lib/callVideoUtils';
import { useAppStrings } from '@/app/lib/useAppStrings';
import styles from './callOverlay.module.css';

interface CallOverlayProps {
  mode: 'outgoing' | 'incoming' | 'connecting' | 'active';
  chrome?: 'full' | 'docked';
  callType: CallType;
  peerName: string;
  peerAvatar?: string;
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
  onDismissError?: () => void;
  chromeHidden?: boolean;
  onToggleChrome?: () => void;
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
  onDismissError,
  chromeHidden = false,
  onToggleChrome,
}: CallOverlayProps) {
  const t = useAppStrings();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const [remoteVideoLive, setRemoteVideoLive] = useState(false);

  const avatar = peerAvatar || DEFAULT_AVATAR;
  const isLiveCall = mode === 'active' || mode === 'connecting';
  const showRipple = mode === 'incoming' || mode === 'outgoing';
  const remoteHasVideo = remoteVideoOn || remoteVideoLive;
  const isVideoCall = callType === 'video' || cameraOn || remoteHasVideo;
  const showVideoStage = isLiveCall && isVideoCall;
  const isDocked = chrome === 'docked';

  const statusText =
    mode === 'incoming'
      ? t.messages.callIncoming
      : mode === 'outgoing'
        ? t.messages.callOutgoing
        : mode === 'connecting'
          ? t.messages.callConnecting
          : t.messages.callInProgress;

  const kindLabel = isVideoCall ? t.messages.videoCall : t.messages.voiceCall;

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
    if (mode !== 'active') {
      setElapsed(0);
      return;
    }
    const startedAt = Date.now();
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [mode]);

  return (
    <div
      className={[
        styles.overlay,
        isDocked ? styles.overlayDocked : '',
        chromeHidden ? styles.overlayHiddenChrome : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="dialog"
      aria-modal={!isDocked}
      aria-label={`${peerName} — ${statusText}`}
    >
      <audio ref={remoteAudioRef} autoPlay playsInline className={styles.srOnly} />

      {isDocked && onToggleChrome ? (
        <button type="button" className={styles.chromeHit} aria-label={statusText} onClick={onToggleChrome} />
      ) : null}

      {showVideoStage && remoteStream ? (
        <div className={styles.videoStage}>
          {remoteHasVideo ? (
            <video ref={remoteVideoRef} autoPlay playsInline className={styles.remoteVideo} />
          ) : null}
          {cameraOn && localStream ? (
            <video ref={localVideoRef} autoPlay playsInline muted className={styles.localPip} />
          ) : null}
        </div>
      ) : null}

      <header className={styles.header}>
        <p className={styles.encrypt}>{t.messages.callEncrypt}</p>
        <p className={styles.status}>{statusText}</p>
        {mode === 'active' ? <p className={styles.timer}>{formatTimer(elapsed)}</p> : null}
      </header>

      <main className={[styles.main, isDocked ? styles.mainDocked : ''].filter(Boolean).join(' ')}>
        {!isDocked ? (
          <div className={[styles.avatarGlow, showRipple ? styles.avatarPulse : ''].filter(Boolean).join(' ')}>
            <img src={avatar} alt="" className={styles.avatar} />
          </div>
        ) : null}

        <h2 className={styles.peerName}>{peerName}</h2>
        <p className={styles.callKind}>{kindLabel}</p>
        {participants.length > 2 ? (
          <p className={styles.callKind}>👥 {participants.length}</p>
        ) : null}

        {errorMessage ? (
          <div className={styles.errorBox} role="alert">
            <p>{errorMessage}</p>
            {onDismissError ? (
              <button type="button" onClick={onDismissError} className={styles.controlBtn}>
                {t.messages.callCancel}
              </button>
            ) : null}
          </div>
        ) : null}
      </main>

      <footer className={styles.footer}>
        {mode === 'incoming' ? (
          <div className={styles.controlsRow}>
            <ControlBtn label={t.messages.callDecline} onClick={onReject} danger large>
              <IconCallHangup size={30} />
            </ControlBtn>
            <ControlBtn
              label={t.messages.callAccept}
              accept
              large
              onClick={() => onAccept?.()}
            >
              {isVideoCall ? <IconCallVideo size={30} /> : <IconCallPhone size={30} />}
            </ControlBtn>
          </div>
        ) : mode === 'outgoing' || mode === 'connecting' ? (
          <div className={styles.controlsStack}>
            {mode === 'outgoing' ? (
              <div className={styles.controlsGrid}>
                <ControlBtn
                  label={micMuted ? t.messages.callMuted : t.messages.callMute}
                  onClick={onToggleMute}
                  active={micMuted}
                >
                  {micMuted ? <IconCallMicOff /> : <IconCallMic />}
                </ControlBtn>
                <ControlBtn
                  label={speakerMuted ? t.messages.callSpeakerOff : t.messages.callSpeaker}
                  onClick={onToggleSpeaker}
                  active={speakerMuted}
                >
                  {speakerMuted ? <IconCallSpeakerOff /> : <IconCallSpeaker />}
                </ControlBtn>
              </div>
            ) : null}
            <div className={styles.controlsRow}>
              <ControlBtn label={t.messages.callCancel} onClick={onEnd} danger large>
                <IconCallHangup size={30} />
              </ControlBtn>
            </div>
          </div>
        ) : (
          <div className={styles.controlsStack}>
            <div className={styles.controlsGrid}>
              <ControlBtn
                label={micMuted ? t.messages.callMuted : t.messages.callMute}
                onClick={onToggleMute}
                active={micMuted}
              >
                {micMuted ? <IconCallMicOff /> : <IconCallMic />}
              </ControlBtn>
              <ControlBtn
                label={speakerMuted ? t.messages.callSpeakerOff : t.messages.callSpeaker}
                onClick={onToggleSpeaker}
                active={speakerMuted}
              >
                {speakerMuted ? <IconCallSpeakerOff /> : <IconCallSpeaker />}
              </ControlBtn>
              <ControlBtn
                label={cameraOn ? t.messages.callCamera : t.messages.callCameraOff}
                onClick={() => void onToggleCamera?.()}
                active={!cameraOn}
              >
                {cameraOn ? <IconCallVideo /> : <IconCallVideoOff />}
              </ControlBtn>
              {onOpenInvite ? (
                <ControlBtn label="+" onClick={onOpenInvite}>
                  <IconCallInvite />
                </ControlBtn>
              ) : null}
            </div>
            <div className={styles.controlsRow}>
              <ControlBtn label={t.messages.callEnd} onClick={onEnd} danger large>
                <IconCallHangup size={30} />
              </ControlBtn>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}

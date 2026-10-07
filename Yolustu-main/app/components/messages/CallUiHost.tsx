"use client";

import React, { useEffect, useState } from 'react';
import { unlockCallAudio } from '@/app/lib/audioUnlock';
import {
  ensureLocalPreview,
  flipLocalCamera,
  getCallMedia,
  listenCallMedia,
  setCallLocalStream,
} from '@/app/lib/callMediaBridge';
import { startCallPulse, startRingtone, stopCallPulse, stopRingtone } from '@/app/lib/callRingtone';
import { primeCallMedia, releaseMediaStream } from '@/app/lib/mediaPermissions';
import {
  getCallUiState,
  listenCallUiState,
  requestCallInvite,
  setCallUiState,
} from '@/app/lib/callUiBridge';
import {
  setJoinWithCamera,
  zegoEnableCamera,
  zegoHangUp,
  zegoMuteMicrophone,
  zegoMuteSpeaker,
} from '@/app/lib/zegoCallKit';
import CallOverlay from './CallOverlay';

export default function CallUiHost() {
  const [ui, setUi] = useState(getCallUiState);
  const [media, setMedia] = useState(getCallMedia);
  const [micMuted, setMicMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => listenCallUiState(setUi), []);
  useEffect(() => listenCallMedia(setMedia), []);

  useEffect(() => {
    if (!ui) {
      setMicMuted(false);
      setSpeakerOn(true);
      setCameraOn(false);
      setMinimized(false);
      stopRingtone();
      stopCallPulse();
      return;
    }

    try {
      if (ui.mode === 'incoming' || ui.mode === 'outgoing') {
        void startRingtone();
        if (ui.mode === 'incoming') startCallPulse();
        else stopCallPulse();
      } else {
        stopRingtone();
        stopCallPulse();
      }
    } catch {
      /* */
    }

    if (ui.mode !== 'active') {
      setCameraOn(ui.callType === 'video');
      setMinimized(false);
    }
  }, [ui]);

  if (!ui) return null;

  const closeUi = () => setCallUiState(null);

  return (
    <CallOverlay
      mode={ui.mode}
      callType={ui.callType}
      peerName={ui.peerName}
      peerAvatar={ui.peerAvatar}
      localStream={media.local}
      remoteStream={media.remote}
      micMuted={micMuted}
      speakerOn={speakerOn}
      cameraOn={cameraOn}
      errorMessage={ui.hint || null}
      minimized={minimized}
      onToggleMinimize={() => setMinimized((v) => !v)}
      onAccept={() => {
        void (async () => {
          void unlockCallAudio();
          const primed = await primeCallMedia(ui.callType === 'video');
          if (primed.stream) setCallLocalStream(primed.stream);
          else releaseMediaStream(primed.stream);
          if (!primed.audio) {
            ui.refuse?.();
            closeUi();
            return;
          }
          await ensureLocalPreview(ui.callType === 'video');
          setJoinWithCamera(ui.callType === 'video' && primed.video);
          setCameraOn(ui.callType === 'video' && primed.video);
          ui.accept?.();
        })();
      }}
      onReject={() => {
        ui.refuse?.();
        closeUi();
      }}
      onEnd={() => {
        if (ui.mode === 'outgoing') ui.cancel?.();
        else zegoHangUp();
        closeUi();
      }}
      onToggleMute={() => {
        const next = !micMuted;
        setMicMuted(next);
        zegoMuteMicrophone(next);
      }}
      onToggleSpeaker={() => {
        const next = !speakerOn;
        setSpeakerOn(next);
        zegoMuteSpeaker(!next);
        void unlockCallAudio();
      }}
      onToggleCamera={async () => {
        const next = !cameraOn;
        if (next) {
          const stream = await ensureLocalPreview(true);
          const hasVideo = Boolean(stream?.getVideoTracks().length);
          setCameraOn(hasVideo);
          setJoinWithCamera(hasVideo);
          zegoEnableCamera(hasVideo);
          return;
        }
        setCameraOn(false);
        zegoEnableCamera(false);
      }}
      onOpenInvite={() => requestCallInvite()}
      onShare={() => {
        const text = `${ui.peerName} — Yolüstü zəng`;
        if (navigator.share) {
          void navigator.share({ title: 'Yolüstü', text }).catch(() => undefined);
          return;
        }
        void navigator.clipboard?.writeText(text);
      }}
      onFlipCamera={() => {
        void flipLocalCamera();
      }}
    />
  );
}

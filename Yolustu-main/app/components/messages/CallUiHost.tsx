"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { unlockCallAudio } from '@/app/lib/audioUnlock';
import { startCallPulse, startRingtone, stopCallPulse, stopRingtone } from '@/app/lib/callRingtone';
import { primeCallMedia, releaseMediaStream } from '@/app/lib/mediaPermissions';
import {
  getCallUiState,
  listenCallUiState,
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

function overlayRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.getElementById('call-overlay-root');
}

export default function CallUiHost() {
  const [ui, setUi] = useState(getCallUiState);
  const [host, setHost] = useState<HTMLElement | null>(overlayRoot);
  const [micMuted, setMicMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [chromeHidden, setChromeHidden] = useState(false);

  useEffect(() => listenCallUiState(setUi), []);

  useEffect(() => {
    const el = overlayRoot();
    setHost(el);
  }, []);

  useEffect(() => {
    if (!host) return;
    host.setAttribute('aria-hidden', ui ? 'false' : 'true');
  }, [host, ui]);

  useEffect(() => {
    if (!ui) {
      setMicMuted(false);
      setSpeakerMuted(false);
      setCameraOn(false);
      setChromeHidden(false);
      stopRingtone();
      stopCallPulse();
      return;
    }

    if (ui.mode === 'incoming' || ui.mode === 'outgoing') {
      void startRingtone();
      if (ui.mode === 'incoming') startCallPulse();
      else stopCallPulse();
    } else {
      stopRingtone();
      stopCallPulse();
    }

    if (ui.mode !== 'active') {
      setCameraOn(ui.callType === 'video');
      setChromeHidden(false);
    }
  }, [ui]);

  if (!ui || !host) return null;

  const closeUi = () => setCallUiState(null);
  const videoLive = ui.mode === 'active' && (ui.callType === 'video' || cameraOn);

  return createPortal(
    <CallOverlay
      mode={ui.mode}
      chrome={videoLive ? 'docked' : 'full'}
      callType={ui.callType}
      peerName={ui.peerName}
      peerAvatar={ui.peerAvatar}
      micMuted={micMuted}
      speakerMuted={speakerMuted}
      cameraOn={cameraOn}
      chromeHidden={videoLive ? chromeHidden : false}
      errorMessage={ui.hint || null}
      onToggleChrome={videoLive ? () => setChromeHidden((v) => !v) : undefined}
      onAccept={() => {
        void (async () => {
          void unlockCallAudio();
          const media = await primeCallMedia(ui.callType === 'video');
          releaseMediaStream(media.stream);
          if (!media.audio) {
            ui.refuse?.();
            closeUi();
            return;
          }
          setJoinWithCamera(ui.callType === 'video' && media.video);
          ui.accept?.();
        })();
      }}
      onReject={() => {
        ui.refuse?.();
        closeUi();
      }}
      onEnd={() => {
        if (ui.mode === 'outgoing') {
          ui.cancel?.();
        } else {
          zegoHangUp();
        }
        closeUi();
      }}
      onToggleMute={() => {
        const next = !micMuted;
        setMicMuted(next);
        zegoMuteMicrophone(next);
      }}
      onToggleSpeaker={() => {
        const next = !speakerMuted;
        setSpeakerMuted(next);
        zegoMuteSpeaker(next);
      }}
      onToggleCamera={() => {
        const next = !cameraOn;
        setCameraOn(next);
        zegoEnableCamera(next);
      }}
    />,
    host
  );
}

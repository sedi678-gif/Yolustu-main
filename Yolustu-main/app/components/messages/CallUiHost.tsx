"use client";

import React, { useEffect, useState } from 'react';
import { unlockCallAudio } from '@/app/lib/audioUnlock';
import { startCallPulse, startRingtone, stopCallPulse, stopRingtone } from '@/app/lib/callRingtone';
import {
  getCallUiState,
  listenCallUiState,
  setCallUiState,
} from '@/app/lib/callUiBridge';
import {
  zegoEnableCamera,
  zegoHangUp,
  zegoMuteMicrophone,
  zegoMuteSpeaker,
} from '@/app/lib/zegoCallKit';
import CallOverlay from './CallOverlay';

export default function CallUiHost() {
  const [ui, setUi] = useState(getCallUiState);
  const [micMuted, setMicMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [chromeHidden, setChromeHidden] = useState(false);

  useEffect(() => listenCallUiState(setUi), []);

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

  if (!ui) return null;

  const closeUi = () => setCallUiState(null);
  const videoLive = ui.mode === 'active' && (ui.callType === 'video' || cameraOn);

  return (
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
      onToggleChrome={videoLive ? () => setChromeHidden((v) => !v) : undefined}
      onAccept={() => {
        void unlockCallAudio().then(() => ui.accept?.());
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
    />
  );
}

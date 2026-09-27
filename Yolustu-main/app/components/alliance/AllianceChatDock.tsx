"use client";

import React from 'react';
import { useUser } from '@/context/UserContext';
import { getLocalProfileDisplayName } from '@/app/lib/userId';
import { useAllianceBrain } from './AllianceBrainContext';
import AllianceMapEmbeddedChat from './AllianceMapEmbeddedChat';
import { useAllianceScreenBusy } from './AllianceScreenBusy';
import styles from './alliance.module.css';

export default function AllianceChatDock() {
  const { user } = useUser();
  const userName = user?.displayName || user?.email || getLocalProfileDisplayName();
  const busy = useAllianceScreenBusy();
  const { activeAlliance, globalMessages, allianceMessages, handleSendMessage } = useAllianceBrain();

  return (
    <div className={`${styles.allianceChatStay} ${busy ? styles.allianceChatStayHidden : ''}`} aria-hidden={busy}>
      <AllianceMapEmbeddedChat
        globalMessages={globalMessages}
        allianceMessages={allianceMessages}
        activeAlliance={activeAlliance}
        currentUserName={userName}
        onSendMessage={(text, channel) => void handleSendMessage(text, channel)}
      />
    </div>
  );
}

"use client";

import React, { useMemo, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { getLocalProfileDisplayName } from '@/app/lib/userId';
import { useAllianceBrain } from './AllianceBrainContext';
import AllianceMapEmbeddedChat from './AllianceMapEmbeddedChat';
import AllianceMapSheet from './AllianceMapSheet';
import { MessageData } from './types';
import styles from './alliance.module.css';

function latestTwo(globalMessages: MessageData[], allianceMessages: MessageData[]) {
  return [...globalMessages, ...allianceMessages]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 2)
    .reverse();
}

export default function AllianceChatDock() {
  const { user } = useUser();
  const userName = user?.displayName || user?.email || getLocalProfileDisplayName();
  const [chatOpen, setChatOpen] = useState(false);
  const { activeAlliance, globalMessages, allianceMessages, handleSendMessage } = useAllianceBrain();

  const preview = useMemo(
    () => latestTwo(globalMessages, allianceMessages),
    [globalMessages, allianceMessages]
  );

  return (
    <>
      <button
        type="button"
        className={styles.allianceChatDock}
        onClick={() => setChatOpen(true)}
        aria-label="İttifaq çatını aç"
      >
        {preview.length === 0 ? (
          <>
            <span className={styles.allianceChatDockLine}>Hələ mesaj yoxdur</span>
            <span className={styles.allianceChatDockLineMuted}>Çatı aç və yaz...</span>
          </>
        ) : (
          preview.map((msg) => (
            <span key={msg.id} className={styles.allianceChatDockLine}>
              <strong>{msg.user === userName ? 'Sən' : msg.user}:</strong> {msg.text}
            </span>
          ))
        )}
      </button>

      <AllianceMapSheet
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        title="İttifaq çatı"
        variant="neon"
      >
        <AllianceMapEmbeddedChat
          globalMessages={globalMessages}
          allianceMessages={allianceMessages}
          activeAlliance={activeAlliance}
          currentUserName={userName}
          onSendMessage={(text, channel) => void handleSendMessage(text, channel)}
          sheetMode
          neon
        />
      </AllianceMapSheet>
    </>
  );
}

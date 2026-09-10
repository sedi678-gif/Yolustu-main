"use client";



import React, { useEffect, useRef, useState } from 'react';

import { useUser } from '@/context/UserContext';

import { getLocalProfileDisplayName } from '@/app/lib/userId';

import ProfilePhotoEditorModal from '@/app/components/profile/ProfilePhotoEditorModal';

import { uploadAllianceFlagImage } from '@/app/lib/allianceFlagMediaService';

import { useAllianceBrain } from './AllianceBrainContext';

import { AllianceFlagConfig } from './types';

import AllianceFlagPreview from './AllianceFlagPreview';

import AllianceRankTables from './AllianceRankTables';

import AllianceQuestPanel from './AllianceQuestPanel';

import AllianceMapOrduCards from './AllianceMapOrduCards';

import AllianceMapRoundBtn from './AllianceMapRoundBtn';

import AllianceMapSheet from './AllianceMapSheet';
import AllianceFortressPanel from './AllianceFortressPanel';

import {

  FLAG_ACCENT_PRESETS,

  FLAG_BG_PRESETS,

  FLAG_EMBLEM_PRESETS,

  FLAG_PATTERN_OPTIONS,

} from './allianceFlagConfig';

import styles from './alliance.module.css';



export default function AllianceMapSidebar() {

  const { userId, user } = useUser();

  const userName = user?.displayName || user?.email || getLocalProfileDisplayName();

  const {

    alliances,

    players,

    activeAlliance,

    hubVisuals,

    handleUpdateAllianceFlag,

  } = useAllianceBrain();



  const [draft, setDraft] = useState<AllianceFlagConfig>(hubVisuals.allianceFlag);

  const [saving, setSaving] = useState(false);

  const [saved, setSaved] = useState(false);

  const [questsOpen, setQuestsOpen] = useState(false);
  const [fortressOpen, setFortressOpen] = useState(false);

  const [flagOpen, setFlagOpen] = useState(false);

  const [flagPhotoFile, setFlagPhotoFile] = useState<File | null>(null);

  const [uploadingFlagImage, setUploadingFlagImage] = useState(false);

  const flagInputRef = useRef<HTMLInputElement>(null);



  useEffect(() => {

    setDraft(hubVisuals.allianceFlag);

  }, [hubVisuals.allianceFlag]);



  const canEdit = hubVisuals.canEditAllianceFlag;



  const patchDraft = (patch: Partial<AllianceFlagConfig>) => {

    setDraft((prev) => ({ ...prev, ...patch }));

    setSaved(false);

  };



  const handleSave = async () => {

    if (!canEdit) return;

    setSaving(true);

    try {

      await handleUpdateAllianceFlag(draft);

      setSaved(true);

    } finally {

      setSaving(false);

    }

  };



  const handleFlagFile = (e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0];

    e.target.value = '';

    if (!file || !canEdit) return;

    if (!file.type.startsWith('image/')) {

      alert('Yalnız şəkil faylı seçin.');

      return;

    }

    setFlagPhotoFile(file);

  };



  const closeFlagPhotoEditor = () => {

    setFlagPhotoFile(null);

  };



  const uploadFlagPhoto = async (file: File) => {

    if (!activeAlliance || !canEdit) return;



    setUploadingFlagImage(true);

    setSaving(true);



    try {

      const url = await uploadAllianceFlagImage(activeAlliance.id, file);

      let nextFlag!: AllianceFlagConfig;

      setDraft((prev) => {

        nextFlag = { ...prev, imageUrl: url, imageUpdatedAt: Date.now() };

        return nextFlag;

      });

      await handleUpdateAllianceFlag(nextFlag);

      setSaved(true);

      closeFlagPhotoEditor();

    } catch (err) {

      console.error(err);

      alert(err instanceof Error ? err.message : 'Bayraq şəkli saxlanmadı.');

    } finally {

      setUploadingFlagImage(false);

      setSaving(false);

    }

  };



  const handleRemoveFlagImage = async () => {

    if (!canEdit) return;

    const nextFlag = { ...draft };

    delete nextFlag.imageUrl;

    delete nextFlag.imageUpdatedAt;

    setDraft(nextFlag);

    setSaved(false);

    setSaving(true);

    try {

      await handleUpdateAllianceFlag(nextFlag);

      setSaved(true);

    } catch (err) {

      console.error(err);

      alert(err instanceof Error ? err.message : 'Bayraq şəkli silinmədi.');

    } finally {

      setSaving(false);

    }

  };



  return (

    <aside className={styles.allianceMapSidebar}>

      <div className={styles.allianceMapSidebarHead}>

        <AllianceFlagPreview flag={draft} size="md" />

        <div className={styles.allianceMapSidebarTitleBlock}>

          <p className={styles.allianceMapSidebarEyebrow}>İttifaq</p>

          <h1 className={styles.allianceMapSidebarTitle}>{hubVisuals.allianceName}</h1>

          {activeAlliance ? (

            <p className={styles.allianceMapSidebarMeta}>

              <span className={hubVisuals.hubOnline ? styles.allianceStatusOnline : styles.allianceStatusOffline}>

                {hubVisuals.hubOnline ? '🟢 Onlayn' : '🔴 Oflayn'}

              </span>

              {' · '}

              📍 {activeAlliance.region} · 🏰 Qala {hubVisuals.fortressLevel}

            </p>

          ) : (

            <p className={styles.allianceMapSidebarMeta}>Hələ ittifaqda deyilsiniz</p>

          )}

        </div>

      </div>



      <div className={styles.mapRoundBtnRow}>

        <AllianceRankTables

          alliances={alliances}

          players={players}

          currentUserId={userId}

          currentUserName={userName}

          activeAlliance={activeAlliance}

          sections={['alliances']}

          allianceTitle="İttifaq reytinqi"

          variant="sheet"

        />



        <AllianceMapOrduCards variant="sheet" />



        <AllianceMapRoundBtn

          icon="📋"

          label="Tapşırıq"

          onClick={() => setQuestsOpen(true)}

          disabled={!activeAlliance}

          title={!activeAlliance ? 'Tapşırıqlar üçün ittifaqda olmalısan' : 'Gündəlik tapşırıqlar'}

          active={questsOpen}

        />



        {activeAlliance && (
          <AllianceMapRoundBtn
            icon="🏰"
            label="Qala"
            onClick={() => setFortressOpen(true)}
            title="Qala səviyyəsi və binanı dəyiş"
            active={fortressOpen}
          />
        )}

        {activeAlliance && (

          <AllianceMapRoundBtn

            icon="🏴"

            label="Bayraq"

            onClick={() => setFlagOpen(true)}

            title="Bayraq redaktoru"

            active={flagOpen}

          />

        )}

      </div>



      <AllianceMapSheet

        open={questsOpen}

        onClose={() => setQuestsOpen(false)}

        title="Gündəlik tapşırıqlar"

        icon="📋"

      >

        {activeAlliance ? (

          <AllianceQuestPanel allianceId={activeAlliance.id} userId={userId} embedded />

        ) : (

          <p className={styles.sidebarPopupEmpty}>Tapşırıqlar üçün ittifaqda olmalısan.</p>

        )}

      </AllianceMapSheet>



      <AllianceMapSheet

        open={flagOpen}

        onClose={() => setFlagOpen(false)}

        title="Bayraq redaktoru"

        icon="🏴"

      >

        <div className={styles.allianceFlagEditorSheet}>

          <div className={styles.allianceFlagEditorHead}>

            <span>Önizləmə</span>

            {!canEdit && <span className={styles.allianceFlagEditorHint}>Yalnız lider</span>}

          </div>



          <div className={styles.allianceFlagEditorPreviewRow}>

            <AllianceFlagPreview flag={draft} size="lg" />

          </div>



          {canEdit && (

            <div className={styles.allianceFlagToolGroup}>

              <span className={styles.allianceFlagToolLabel}>Bayraq şəkli</span>

              <div className={styles.allianceFlagUploadRow}>

                <button

                  type="button"

                  className={styles.allianceFlagUploadBtn}

                  disabled={uploadingFlagImage || saving}

                  onClick={() => flagInputRef.current?.click()}

                >

                  {uploadingFlagImage ? 'Yüklənir...' : '📷 Şəkil yüklə'}

                </button>

                {draft.imageUrl ? (

                  <button

                    type="button"

                    className={styles.allianceFlagRemoveImageBtn}

                    disabled={uploadingFlagImage || saving}

                    onClick={() => void handleRemoveFlagImage()}

                  >

                    Şəkli sil

                  </button>

                ) : null}

              </div>

              <input

                ref={flagInputRef}

                type="file"

                accept="image/*"

                hidden

                onChange={handleFlagFile}

              />

            </div>

          )}



          <div className={styles.allianceFlagToolGroup}>

            <span className={styles.allianceFlagToolLabel}>Fon rəngi</span>

            <div className={styles.allianceFlagSwatches}>

              {FLAG_BG_PRESETS.map((color) => (

                <button

                  key={color}

                  type="button"

                  className={`${styles.allianceFlagSwatch} ${draft.backgroundColor === color ? styles.allianceFlagSwatchActive : ''}`}

                  style={{ backgroundColor: color }}

                  disabled={!canEdit}

                  onClick={() => patchDraft({ backgroundColor: color })}

                  aria-label={`Fon ${color}`}

                />

              ))}

            </div>

          </div>



          <div className={styles.allianceFlagToolGroup}>

            <span className={styles.allianceFlagToolLabel}>Naxış rəngi</span>

            <div className={styles.allianceFlagSwatches}>

              {FLAG_ACCENT_PRESETS.map((color) => (

                <button

                  key={color}

                  type="button"

                  className={`${styles.allianceFlagSwatch} ${draft.accentColor === color ? styles.allianceFlagSwatchActive : ''}`}

                  style={{ backgroundColor: color }}

                  disabled={!canEdit}

                  onClick={() => patchDraft({ accentColor: color })}

                  aria-label={`Naxış ${color}`}

                />

              ))}

            </div>

          </div>



          <div className={styles.allianceFlagToolGroup}>

            <span className={styles.allianceFlagToolLabel}>Emblem</span>

            <div className={styles.allianceFlagEmblems}>

              {FLAG_EMBLEM_PRESETS.map((emblem) => (

                <button

                  key={emblem}

                  type="button"

                  className={`${styles.allianceFlagEmblemBtn} ${draft.emblem === emblem ? styles.allianceFlagEmblemBtnActive : ''}`}

                  disabled={!canEdit}

                  onClick={() => patchDraft({ emblem })}

                >

                  {emblem}

                </button>

              ))}

            </div>

          </div>



          <div className={styles.allianceFlagToolGroup}>

            <span className={styles.allianceFlagToolLabel}>Naxış</span>

            <div className={styles.allianceFlagPatterns}>

              {FLAG_PATTERN_OPTIONS.map((option) => (

                <button

                  key={option.id}

                  type="button"

                  className={`${styles.allianceFlagPatternBtn} ${draft.pattern === option.id ? styles.allianceFlagPatternBtnActive : ''}`}

                  disabled={!canEdit}

                  onClick={() => patchDraft({ pattern: option.id })}

                >

                  {option.label}

                </button>

              ))}

            </div>

          </div>



          {canEdit && (

            <button

              type="button"

              className={styles.allianceFlagSaveBtn}

              disabled={saving}

              onClick={() => void handleSave()}

            >

              {saving ? 'Saxlanır...' : saved ? '✓ Saxlanıldı' : 'Bayrağı saxla'}

            </button>

          )}

        </div>

      </AllianceMapSheet>



      <ProfilePhotoEditorModal

        open={flagPhotoFile !== null}

        kind="flag"

        file={flagPhotoFile}

        onClose={closeFlagPhotoEditor}

        onConfirm={(file) => {

          void uploadFlagPhoto(file);

        }}

      />

      <AllianceFortressPanel open={fortressOpen} onClose={() => setFortressOpen(false)} />

    </aside>

  );

}


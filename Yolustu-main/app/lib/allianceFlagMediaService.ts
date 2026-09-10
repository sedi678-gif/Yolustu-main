import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase';
import {
  ensureFirebaseAuth,
  blobToDataUrl,
  compressImageSafe,
  withTimeout,
} from './firebaseAuth';

const FLAG_MAX_WIDTH = 720;
const FLAG_QUALITY = 0.72;
const MAX_INLINE_CHARS = 850_000;
const STORAGE_TRY_MS = 10_000;

export async function prepareAllianceFlagFile(file: File): Promise<File> {
  const blob = await compressImageSafe(file, FLAG_MAX_WIDTH, FLAG_QUALITY);
  return new File([blob], 'flag.jpg', { type: 'image/jpeg', lastModified: Date.now() });
}

async function buildInlineUrl(file: File): Promise<string> {
  let payload: Blob = file;
  if (file.size > 180_000) {
    payload = await compressImageSafe(file, 520, 0.55);
  }

  let dataUrl = await blobToDataUrl(payload);
  if (dataUrl.length <= MAX_INLINE_CHARS) return dataUrl;

  const tiny = await compressImageSafe(file, 420, 0.48);
  dataUrl = await blobToDataUrl(tiny);
  if (dataUrl.length > MAX_INLINE_CHARS) {
    throw new Error('Şəkil çox böyükdür. Daha kiçik fayl seçin.');
  }
  return dataUrl;
}

async function tryStorageUrl(file: File, allianceId: string): Promise<string | null> {
  try {
    await ensureFirebaseAuth();
    const path = `alliances/${allianceId}/flag_${Date.now()}.jpg`;
    const storageRef = ref(storage, path);
    await withTimeout(
      uploadBytes(storageRef, file, { contentType: 'image/jpeg' }),
      STORAGE_TRY_MS,
      'storage skip'
    );
    return await getDownloadURL(storageRef);
  } catch {
    return null;
  }
}

function scheduleStorageUpgrade(file: File, allianceId: string, imageUrl: string, imageUpdatedAt: number) {
  void tryStorageUrl(file, allianceId).then((remote) => {
    if (!remote || remote.startsWith('data:') || remote === imageUrl) return;
    void updateDoc(doc(db, 'alliances', allianceId), {
      'flag.imageUrl': remote,
      'flag.imageUpdatedAt': imageUpdatedAt,
      updatedAt: Date.now(),
    });
  });
}

export async function uploadAllianceFlagImage(allianceId: string, file: File): Promise<string> {
  if (!allianceId?.trim()) {
    throw new Error('İttifaq tapılmadı.');
  }

  await ensureFirebaseAuth();

  const prepared =
    file.name === 'flag.jpg' && file.type === 'image/jpeg'
      ? file
      : await prepareAllianceFlagFile(file);

  const url = await buildInlineUrl(prepared);
  scheduleStorageUpgrade(prepared, allianceId, url, Date.now());
  return url;
}

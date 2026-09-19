export interface ModelCardDef {
  id: string;
  folder: string;
  imageFolder: string;
  imageFile: string;
  title: string;
  emoji: string;
  accent: string;
}

/** public/models: `karti` = info.json, `kartı` = şəkil */
export const MODEL_CARD_DEFS: ModelCardDef[] = [
  { id: '2x', folder: '2X karti', imageFolder: '2X kartı', imageFile: '2x kartı.jpeg', title: '2X Kartı', emoji: '✖️', accent: '#f59e0b' },
  { id: 'casus', folder: 'casus karti', imageFolder: 'casus kartı', imageFile: 'casus kartı.jpeg', title: 'Cəsus Kartı', emoji: '🕵️', accent: '#64748b' },
  { id: 'duman', folder: 'duman karti', imageFolder: 'duman kartı', imageFile: 'duman kartı.jpeg', title: 'Duman Kartı', emoji: '🌫️', accent: '#94a3b8' },
  { id: 'guzgu', folder: 'Güzgə karti', imageFolder: 'Güzgü kartı', imageFile: 'güzgü.jpeg', title: 'Güzgü Kartı', emoji: '🪞', accent: '#67e8f9' },
  { id: 'joker', folder: 'Joker karti', imageFolder: 'Joker kartı', imageFile: 'Joker.jpeg', title: 'Joker Kartı', emoji: '🃏', accent: '#a855f7' },
  { id: 'ogru', folder: 'ogru karti', imageFolder: 'oğru kartı', imageFile: 'oğru kartı.jpeg', title: 'Oğru Kartı', emoji: '🥷', accent: '#334155' },
  { id: 'qaya', folder: 'qaya (das karti)', imageFolder: 'qaya (daş kartı)', imageFile: 'qaya (daş adam) kartı.jpeg', title: 'Qaya Kartı', emoji: '🪨', accent: '#78716c' },
  { id: 'qul', folder: 'qul eden karti (zəncirlənmə)', imageFolder: 'qul eden kartı (zəncirlənmə)', imageFile: 'qul edən kartı (zəncirlənmə kartı).jpeg', title: 'Qul Edən Kartı', emoji: '⛓️', accent: '#b45309' },
  { id: 'qutb', folder: 'qütblərin seçimi karti (od və buz)', imageFolder: 'qütblərin seçimi kartı (od və buz)', imageFile: 'qütblərin seçimi (od və buz).jpeg', title: 'Qütblərin Seçimi', emoji: '🔥', accent: '#ef4444' },
  { id: 'sehrbaz', folder: 'sehrbaz karti', imageFolder: 'sehrbaz kartı', imageFile: 'sehrbaz kartı.jpeg', title: 'Sehrbaz Kartı', emoji: '🧙', accent: '#6366f1' },
  { id: 'tikanli', folder: 'tikanli məftil karti', imageFolder: 'tikanlı məftil kartı', imageFile: 'tikanlı məftil kartı.jpeg', title: 'Tikanlı Məftil', emoji: '🪢', accent: '#ca8a04' },
  { id: 'felaket', folder: 'Təbii fəlakətlər karti', imageFolder: 'Təbii fəlakətlər kartı', imageFile: 'təbii fəlakətlər.jpeg', title: 'Təbii Fəlakətlər', emoji: '🌊', accent: '#0ea5e9' },
  { id: 'usyan', folder: 'üsyan karti', imageFolder: 'üsyan kartı', imageFile: 'üsyan kartı.jpeg', title: 'Üsyan Kartı', emoji: '⚔️', accent: '#dc2626' },
];

const IMAGE_FILES = [
  'card.png',
  'card.jpg',
  'card.webp',
  'card.jpeg',
  'preview.png',
  'preview.jpg',
  'preview.webp',
  'image.png',
  'image.jpg',
  'kart.png',
  'kart.jpg',
  'cover.png',
  'cover.jpg',
];

export function modelCardPublicUrl(folder: string, file: string): string {
  const encodedFolder = folder.split('/').map(encodeURIComponent).join('/');
  return `/models/${encodedFolder}/${encodeURIComponent(file)}`;
}

export function modelCardImageCandidates(def: ModelCardDef): string[] {
  const named = [`${def.id}.png`, `${def.id}.jpg`, `${def.id}.jpeg`, `${def.id}.webp`];
  const fromImageFolder = [def.imageFile, ...IMAGE_FILES, ...named].map((file) =>
    modelCardPublicUrl(def.imageFolder, file)
  );
  const fromInfoFolder = [...IMAGE_FILES, ...named].map((file) => modelCardPublicUrl(def.folder, file));
  return [...fromImageFolder, ...fromInfoFolder];
}

export function modelCardInfoUrl(folder: string): string {
  return modelCardPublicUrl(folder, 'info.json');
}

export interface ParsedModelCardInfo {
  title?: string;
  body: string;
  image?: string;
}

export function parseModelCardInfo(raw: string): ParsedModelCardInfo {
  let text = raw.replace(/^\uFEFF/, '').trim();
  if (text.startsWith('{}')) text = text.slice(2).trim();
  if (!text || text === '{}') return { body: '' };

  try {
    const json = JSON.parse(text) as unknown;
    if (typeof json === 'string') return { body: json.trim() };
    if (json && typeof json === 'object') {
      const rec = json as Record<string, unknown>;
      const body = [rec.desc, rec.info, rec.text, rec.description, rec.body]
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .find(Boolean) ?? '';
      return {
        title: typeof rec.title === 'string' ? rec.title.trim() : undefined,
        body,
        image: typeof rec.image === 'string' ? rec.image.trim() : undefined,
      };
    }
  } catch {
    /* plain text info.json */
  }

  const firstLine = text.split(/\r?\n/, 1)[0]?.trim();
  return { title: firstLine, body: text };
}

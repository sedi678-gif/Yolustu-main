import { getFortressMarkerUrl, normalizeFortressLevel } from '@/app/lib/allianceFortressConfig';

/** Xəritə markerində qala şəkli — px (Leaflet CSS bəzən tətbiq olunmur, inline da var) */
export const CASTLE_ART_W = 40;
export const CASTLE_ART_H = 44;

/** Yaxınlaşdıqda qala görünür şəkildə böyüsün (Leaflet min/max zoom) */
export const CASTLE_ZOOM_SCALE_MIN = 0.88;
export const CASTLE_ZOOM_SCALE_MAX = 2.2;
const CASTLE_MAP_MIN_ZOOM = 6;
const CASTLE_MAP_MAX_ZOOM = 12;

export function getCastleZoomScale(mapZoom: number): number {
  const z = Math.min(CASTLE_MAP_MAX_ZOOM, Math.max(CASTLE_MAP_MIN_ZOOM, mapZoom));
  const t = (z - CASTLE_MAP_MIN_ZOOM) / (CASTLE_MAP_MAX_ZOOM - CASTLE_MAP_MIN_ZOOM);
  return CASTLE_ZOOM_SCALE_MIN + t * (CASTLE_ZOOM_SCALE_MAX - CASTLE_ZOOM_SCALE_MIN);
}

/** CSS transform işləməyəndə də qala zoom ilə böyüsün */
export function applyCastleZoomToMap(container: HTMLElement, mapZoom: number): number {
  const s = getCastleZoomScale(mapZoom);
  const w = Math.round(CASTLE_ART_W * s);
  const h = Math.round(CASTLE_ART_H * s);
  container.style.setProperty('--castle-zoom-scale', String(s));
  container.querySelectorAll<HTMLImageElement>('.alliance-castle-pin__img').forEach((img) => {
    img.style.setProperty('width', `${w}px`, 'important');
    img.style.setProperty('max-width', `${w}px`, 'important');
    img.style.setProperty('max-height', `${h}px`, 'important');
    img.style.setProperty('height', 'auto', 'important');
    img.setAttribute('width', String(w));
    img.setAttribute('height', String(h));
  });
  return s;
}

const CASTLE_ART_SLOT_H = Math.ceil(CASTLE_ART_H * CASTLE_ZOOM_SCALE_MAX);
const CASTLE_PIN_W = Math.ceil(CASTLE_ART_W * CASTLE_ZOOM_SCALE_MAX);
const CASTLE_LABEL_H = 16;

export interface AllianceCastleMarkerOpts {
  name: string;
  region: string;
  score: number;
  isActive: boolean;
  fortressLevel?: number;
}

export function buildAllianceCastleMarkerHtml(opts: AllianceCastleMarkerOpts): string {
  const { name, isActive, fortressLevel } = opts;
  const shortName = name.length > 12 ? `${name.slice(0, 11)}…` : name;
  const level = normalizeFortressLevel(fortressLevel);
  const imgUrl = getFortressMarkerUrl(level);

  const classes = [
    'alliance-castle-pin',
    `alliance-castle-pin--lv${level}`,
    isActive ? 'alliance-castle-pin--mine' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const imgExtraStyle =
    level === 1
      ? 'opacity:1;background:transparent !important;'
      : 'background:transparent !important;';

  return `
    <div class="${classes}" style="width:${CASTLE_PIN_W}px;background:transparent !important;overflow:visible;line-height:0;">
      <div class="alliance-castle-pin__art-slot" style="height:${CASTLE_ART_SLOT_H}px;display:flex;align-items:flex-end;justify-content:center;width:100%;overflow:visible;">
        <img
          class="alliance-castle-pin__img"
          src="${imgUrl}"
          alt=""
          width="${CASTLE_ART_W}"
          height="${CASTLE_ART_H}"
          style="width:${CASTLE_ART_W}px;height:auto;max-height:${CASTLE_ART_H}px;display:block;border:none;object-fit:contain;${imgExtraStyle}"
          draggable="false"
          decoding="async"
        />
      </div>
      <div class="alliance-castle-pin__name" style="margin-top:2px;font-size:9px;line-height:1.2;">${shortName} · Lv.${level}</div>
    </div>`;
}

export const ALLIANCE_CASTLE_ICON_SIZE: [number, number] = [CASTLE_PIN_W, CASTLE_ART_SLOT_H + CASTLE_LABEL_H];
export const ALLIANCE_CASTLE_ICON_ANCHOR: [number, number] = [CASTLE_PIN_W / 2, CASTLE_ART_SLOT_H - 2];

export const ALLIANCE_CASTLE_MARKER_URL = getFortressMarkerUrl(1);

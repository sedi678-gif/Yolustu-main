import * as THREE from 'three';
import type { ClickRaidCardId } from '@/app/lib/clickRaidLogic';

type Outfit = {
  skin: string;
  skinDark: string;
  shirt: string;
  shirtDark: string;
  hole: string;
  pants: string;
  pantsFade: string;
  stain: string;
};

const OUTFITS: Record<ClickRaidCardId, Outfit> = {
  zombi: {
    skin: '#6aa84f',
    skinDark: '#3d6b32',
    shirt: '#8a7350',
    shirtDark: '#5c4a30',
    hole: '#4f7a3a',
    pants: '#2a3140',
    pantsFade: '#1a1f28',
    stain: '#3d2a18',
  },
  mutant: {
    skin: '#7dcf3c',
    skinDark: '#3f7a22',
    shirt: '#4a3d58',
    shirtDark: '#2e2638',
    hole: '#6aaa38',
    pants: '#2a2433',
    pantsFade: '#16131c',
    stain: '#5a2a6a',
  },
  standing: {
    skin: '#e6c4a0',
    skinDark: '#c4926a',
    shirt: '#4a3d8c',
    shirtDark: '#c9a227',
    hole: '#d4b08c',
    pants: '#2c2458',
    pantsFade: '#1a1638',
    stain: '#6b5420',
  },
  it: {
    skin: '#7a9a3d',
    skinDark: '#4a6224',
    shirt: '#6b4428',
    shirtDark: '#3d2616',
    hole: '#5a7a30',
    pants: '#3a2c1c',
    pantsFade: '#241810',
    stain: '#2a1c10',
  },
};

const texCache = new Map<ClickRaidCardId, THREE.CanvasTexture>();

function paintOutfit(kind: ClickRaidCardId): THREE.CanvasTexture {
  const cached = texCache.get(kind);
  if (cached) return cached;
  const o = OUTFITS[kind];
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  const band = (y0: number, y1: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, Math.round((1 - y1) * 256), 256, Math.round((y1 - y0) * 256));
  };

  band(0, 1, o.skin);
  band(0.08, 0.48, o.pants);
  band(0.42, 0.8, o.shirt);
  band(0.76, 0.84, o.shirtDark);
  band(0.84, 1, o.skin);

  ctx.fillStyle = o.skinDark;
  for (let i = 0; i < 16; i += 1) {
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 42, 4 + Math.random() * 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = o.shirtDark;
  for (let i = 0; i < 26; i += 1) {
    ctx.globalAlpha = 0.4;
    ctx.fillRect(Math.random() * 256, 52 + Math.random() * 90, 10 + Math.random() * 28, 4 + Math.random() * 10);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = o.hole;
  [
    [40, 80, 12],
    [200, 100, 10],
    [120, 70, 8],
    [70, 130, 11],
  ].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.strokeStyle = o.shirtDark;
  ctx.lineWidth = 2;
  for (let x = 0; x < 256; x += 10) {
    ctx.beginPath();
    ctx.moveTo(x, 55);
    ctx.lineTo(x + 2, 145);
    ctx.stroke();
  }

  ctx.fillStyle = o.stain;
  ctx.globalAlpha = 0.4;
  ctx.fillRect(24, 150, 64, 14);
  ctx.fillRect(160, 172, 48, 12);
  ctx.globalAlpha = 1;

  ctx.fillStyle = o.pantsFade;
  for (let i = 0; i < 16; i += 1) {
    ctx.fillRect(Math.random() * 256, 160 + Math.random() * 70, 8, 16);
  }

  ctx.fillStyle = o.skin;
  ctx.fillRect(0, 232, 256, 24);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  texCache.set(kind, tex);
  return tex;
}

function ensureBodyUVs(mesh: THREE.Mesh): void {
  const geo = mesh.geometry;
  if (geo.getAttribute('uv')) return;
  const pos = geo.getAttribute('position');
  if (!pos) return;
  const box = new THREE.Box3().setFromBufferAttribute(pos as THREE.BufferAttribute);
  const h = Math.max(box.max.y - box.min.y, 0.001);
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    uv[i * 2] = Math.atan2(z, x) / (Math.PI * 2) + 0.5;
    uv[i * 2 + 1] = (y - box.min.y) / h;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/** Qəhrəmana dəri rəngi + paltar (köynək/şalvar) çəkir. */
export function applyHeroAppearance(root: THREE.Object3D, cardId: ClickRaidCardId): void {
  if (typeof document === 'undefined') return;
  const map = paintOutfit(cardId);
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    ensureBodyUVs(mesh);
    mesh.material = new THREE.MeshStandardMaterial({
      map,
      roughness: 0.9,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
    mesh.frustumCulled = false;
  });
}

import * as THREE from 'three';

let outfitTex: THREE.CanvasTexture | null = null;

function outfitMap(): THREE.CanvasTexture {
  if (outfitTex) return outfitTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  const skin = '#6aa84f';
  const skinDark = '#3d6b32';
  const shirt = '#8a7350';
  const shirtDark = '#5c4a30';
  const shirtHole = '#4f7a3a';
  const pants = '#2a3140';
  const pantsFade = '#1a1f28';
  const stain = '#3d2a18';

  // v: 0 ayaq, 1 baş (UV-də v yuxarıdır, canvas Y aşağı — tərs çəkirik)
  const band = (y0: number, y1: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, Math.round((1 - y1) * 256), 256, Math.round((y1 - y0) * 256));
  };

  band(0, 1, skin);
  band(0.08, 0.48, pants);
  band(0.42, 0.8, shirt);
  band(0.78, 0.84, shirtDark);
  band(0.84, 1, skin);

  ctx.fillStyle = skinDark;
  for (let i = 0; i < 18; i += 1) {
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 40, 4 + Math.random() * 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = shirtDark;
  for (let i = 0; i < 30; i += 1) {
    ctx.globalAlpha = 0.4;
    ctx.fillRect(Math.random() * 256, 52 + Math.random() * 90, 10 + Math.random() * 28, 4 + Math.random() * 10);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = shirtHole;
  [[40, 80, 14], [200, 100, 11], [120, 70, 9], [70, 130, 12], [180, 140, 8]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.strokeStyle = '#2b2418';
  ctx.lineWidth = 2;
  for (let x = 0; x < 256; x += 9) {
    ctx.beginPath();
    ctx.moveTo(x, 55);
    ctx.lineTo(x + 3, 145);
    ctx.stroke();
  }

  ctx.fillStyle = stain;
  ctx.globalAlpha = 0.45;
  ctx.fillRect(20, 150, 70, 16);
  ctx.fillRect(160, 170, 50, 12);
  ctx.globalAlpha = 1;

  ctx.fillStyle = pantsFade;
  for (let i = 0; i < 20; i += 1) {
    ctx.fillRect(Math.random() * 256, 160 + Math.random() * 70, 8, 18);
  }
  ctx.fillStyle = shirtHole;
  ctx.beginPath();
  ctx.arc(90, 200, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(190, 210, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = skin;
  ctx.fillRect(0, 230, 256, 26);

  outfitTex = new THREE.CanvasTexture(c);
  outfitTex.wrapS = THREE.RepeatWrapping;
  outfitTex.wrapT = THREE.ClampToEdgeWrapping;
  outfitTex.colorSpace = THREE.SRGBColorSpace;
  outfitTex.needsUpdate = true;
  return outfitTex;
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

function clothMat(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.92,
    metalness: 0.03,
    side: THREE.DoubleSide,
  });
}

function findBone(root: THREE.Object3D, id: string): THREE.Object3D | null {
  const want = id.toLowerCase();
  let found: THREE.Object3D | null = null;
  root.traverse((obj) => {
    const n = obj.name.toLowerCase().replace(/mixamorig_?/g, '');
    if (n === want) found = obj;
  });
  return found;
}

/** Yaşıl çürük dəri + cırıq köynək/şalvar (bədən mesh-inə çəkilir). */
export function applyZombieAppearance(root: THREE.Object3D): void {
  if (typeof document === 'undefined') return;
  const map = outfitMap();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || mesh.name.startsWith('zombieCloth')) return;
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

/**
 * Əlavə cırıq parça — Mixamo sümüklərinə taxılır.
 * Əsas paltar applyZombieAppearance-dədir.
 */
export function addZombieRags(root: THREE.Object3D): void {
  if (root.getObjectByName('zombieClothRag')) return;

  const spine = findBone(root, 'spine2') ?? findBone(root, 'spine1');
  const hips = findBone(root, 'hips');
  if (!spine && !hips) return;

  const rag = clothMat(0x6b5538);
  const jean = clothMat(0x232833);

  if (spine) {
    const flap = new THREE.Mesh(new THREE.PlaneGeometry(18, 16), rag);
    flap.name = 'zombieClothRag';
    flap.position.set(-10, -22, 8);
    flap.rotation.set(0.4, 0.3, 0.5);
    flap.frustumCulled = false;
    spine.add(flap);

    const flap2 = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), rag);
    flap2.name = 'zombieClothRag2';
    flap2.position.set(12, -20, 7);
    flap2.rotation.set(0.35, -0.25, -0.4);
    flap2.frustumCulled = false;
    spine.add(flap2);
  }

  if (hips) {
    const belt = new THREE.Mesh(new THREE.TorusGeometry(16, 2.2, 6, 14), jean);
    belt.name = 'zombieClothBelt';
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 4;
    belt.frustumCulled = false;
    hips.add(belt);
  }
}

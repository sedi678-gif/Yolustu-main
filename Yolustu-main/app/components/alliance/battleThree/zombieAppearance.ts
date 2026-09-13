import * as THREE from 'three';

const SKIN = 0x6aa84f;
const SKIN_EMIT = 0x1a3d1a;

let shirtTex: THREE.CanvasTexture | null = null;
let pantsTex: THREE.CanvasTexture | null = null;

function paintMaterial(mat: THREE.Material, hex: number, emit = 0): THREE.Material {
  const next = mat.clone();
  if ('color' in next && next.color instanceof THREE.Color) {
    next.color.setHex(hex);
  }
  if ('emissive' in next && next.emissive instanceof THREE.Color) {
    next.emissive.setHex(emit);
    if ('emissiveIntensity' in next) next.emissiveIntensity = emit ? 0.18 : 0;
  }
  if ('roughness' in next) next.roughness = 0.88;
  if ('metalness' in next) next.metalness = 0.04;
  next.side = THREE.DoubleSide;
  next.needsUpdate = true;
  return next;
}

/** Yaşıl çürük dəri — paltar ayrıca sümüyə taxılır. */
export function applyZombieAppearance(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || mesh.name.startsWith('zombieCloth')) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mesh.material = mats.length === 1 ? paintMaterial(mats[0], SKIN, SKIN_EMIT) : mats.map((m) => paintMaterial(m, SKIN, SKIN_EMIT));
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

function localLen(bone: THREE.Object3D, worldLen: number): number {
  bone.updateWorldMatrix(true, false);
  const sc = new THREE.Vector3();
  bone.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), sc);
  const s = Math.max(Math.abs(sc.x), Math.abs(sc.y), Math.abs(sc.z), 0.0001);
  return worldLen / s;
}

function clothMat(map: THREE.Texture, tint: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map,
    color: tint,
    roughness: 0.94,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
}

function makeFabric(kind: 'shirt' | 'pants'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) {
    const t = new THREE.CanvasTexture(c);
    return t;
  }

  if (kind === 'shirt') {
    ctx.fillStyle = '#6b5a3c';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#4e4530';
    for (let i = 0; i < 40; i += 1) {
      ctx.globalAlpha = 0.35;
      ctx.fillRect(Math.random() * 128, Math.random() * 128, 18 + Math.random() * 28, 8 + Math.random() * 16);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#3a2f1c';
    ctx.fillRect(18, 40, 22, 36);
    ctx.fillRect(78, 70, 16, 28);
    ctx.fillRect(50, 8, 14, 20);
    ctx.strokeStyle = '#2a2418';
    ctx.lineWidth = 2;
    for (let y = 6; y < 128; y += 7) {
      ctx.beginPath();
      ctx.moveTo(0, y + Math.sin(y) * 1.5);
      ctx.lineTo(128, y);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#2c3340';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#1c222c';
    for (let i = 0; i < 28; i += 1) {
      ctx.globalAlpha = 0.4;
      ctx.fillRect(Math.random() * 128, Math.random() * 128, 12, 22);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#3d3424';
    ctx.fillRect(30, 50, 40, 18);
    ctx.fillRect(70, 90, 28, 14);
    ctx.fillStyle = '#151820';
    ctx.fillRect(48, 20, 18, 26);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function shirtMap(): THREE.Texture {
  if (!shirtTex) shirtTex = makeFabric('shirt');
  return shirtTex;
}

function pantsMap(): THREE.Texture {
  if (!pantsTex) pantsTex = makeFabric('pants');
  return pantsTex;
}

function addPiece(
  bone: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  name: string,
  pos: [number, number, number],
  rot: [number, number, number] = [0, 0, 0]
): void {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.rotation.set(rot[0], rot[1], rot[2]);
  mesh.frustumCulled = false;
  bone.add(mesh);
}

/**
 * Cırıq zombi paltarı — Mixamo sümüklərinə taxılır, hücum animasiyası ilə gəzir.
 */
export function addZombieRags(root: THREE.Object3D): void {
  if (root.getObjectByName('zombieClothShirt')) return;

  const bodyBox = new THREE.Box3().setFromObject(root);
  const body = bodyBox.getSize(new THREE.Vector3());
  if (body.y < 0.01) return;

  const spine = findBone(root, 'spine2') ?? findBone(root, 'spine1') ?? findBone(root, 'spine');
  const hips = findBone(root, 'hips');
  const lArm = findBone(root, 'leftarm');
  const rArm = findBone(root, 'rightarm');
  const lUp = findBone(root, 'leftupleg');
  const rUp = findBone(root, 'rightupleg');

  if (!spine && !hips) return;

  const shirt = clothMat(shirtMap(), 0xc4b089);
  const pants = clothMat(pantsMap(), 0x9aa3b2);

  if (spine) {
    const w = localLen(spine, body.x * 0.34);
    const h = localLen(spine, body.y * 0.3);
    const d = localLen(spine, body.z * 0.28 || body.x * 0.2);
    addPiece(
      spine,
      new THREE.CylinderGeometry(w * 0.72, w * 0.86, h, 12, 1, true),
      shirt,
      'zombieClothShirt',
      [0, -h * 0.18, d * 0.08]
    );
    addPiece(
      spine,
      new THREE.CylinderGeometry(w * 0.38, w * 0.5, h * 0.16, 10, 1, true),
      shirt,
      'zombieClothCollar',
      [0, h * 0.38, d * 0.04]
    );
    addPiece(
      spine,
      new THREE.PlaneGeometry(w * 0.28, h * 0.22),
      shirt,
      'zombieClothRagL',
      [-w * 0.35, -h * 0.52, d * 0.12],
      [0.35, 0.2, 0.4]
    );
    addPiece(
      spine,
      new THREE.PlaneGeometry(w * 0.22, h * 0.18),
      shirt,
      'zombieClothRagR',
      [w * 0.32, -h * 0.48, d * 0.1],
      [0.4, -0.25, -0.35]
    );
  }

  if (lArm) {
    const r = localLen(lArm, body.x * 0.1);
    const h = localLen(lArm, body.y * 0.14);
    addPiece(lArm, new THREE.CylinderGeometry(r, r * 1.08, h, 8, 1, true), shirt, 'zombieClothSleeveL', [0, h * 0.35, 0]);
  }
  if (rArm) {
    const r = localLen(rArm, body.x * 0.1);
    const h = localLen(rArm, body.y * 0.14);
    addPiece(rArm, new THREE.CylinderGeometry(r, r * 1.08, h, 8, 1, true), shirt, 'zombieClothSleeveR', [0, h * 0.35, 0]);
  }

  if (hips) {
    const w = localLen(hips, body.x * 0.3);
    const h = localLen(hips, body.y * 0.12);
    addPiece(hips, new THREE.CylinderGeometry(w * 0.7, w * 0.78, h, 12, 1, true), pants, 'zombieClothWaist', [0, -h * 0.15, 0]);
  }
  if (lUp) {
    const r = localLen(lUp, body.x * 0.11);
    const h = localLen(lUp, body.y * 0.22);
    addPiece(lUp, new THREE.CylinderGeometry(r * 0.95, r * 1.1, h, 8, 1, true), pants, 'zombieClothPantL', [0, h * 0.28, 0]);
  }
  if (rUp) {
    const r = localLen(rUp, body.x * 0.11);
    const h = localLen(rUp, body.y * 0.22);
    addPiece(rUp, new THREE.CylinderGeometry(r * 0.95, r * 1.1, h, 8, 1, true), pants, 'zombieClothPantR', [0, h * 0.28, 0]);
  }
}

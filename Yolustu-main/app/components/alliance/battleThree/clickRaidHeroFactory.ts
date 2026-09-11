import * as THREE from 'three';
import type { ClickRaidCardId } from '@/app/lib/clickRaidLogic';

export interface HeroRig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  extra: THREE.Object3D | null;
  materials: THREE.MeshStandardMaterial[];
  gait: 'biped' | 'quad';
}

function mat(color: number, extras?: Partial<THREE.MeshStandardMaterialParameters>) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.45,
    metalness: 0.12,
    ...extras,
  });
}

function mesh(
  geo: THREE.BufferGeometry,
  material: THREE.MeshStandardMaterial,
  x: number,
  y: number,
  z: number
) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = false;
  return m;
}

function addShadow(root: THREE.Group, radius: number) {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 20),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.4;
  root.add(shadow);
}

function collectMats(root: THREE.Object3D, bag: THREE.MeshStandardMaterial[]) {
  root.traverse((obj) => {
    const meshObj = obj as THREE.Mesh;
    if (meshObj.isMesh && meshObj.material) {
      const m = meshObj.material;
      if (Array.isArray(m)) {
        m.forEach((item) => {
          if (item instanceof THREE.MeshStandardMaterial) bag.push(item);
        });
      } else if (m instanceof THREE.MeshStandardMaterial) {
        bag.push(m);
      }
    }
  });
}

function makeBiped(cardId: ClickRaidCardId): HeroRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 10;
  root.add(body);

  const isMutant = cardId === 'mutant';
  const isMage = cardId === 'standing';
  const isZombie = cardId === 'zombi';

  const skin = isMutant ? 0x4ade80 : isMage ? 0xc4b5fd : 0x86efac;
  const cloth = isMutant ? 0x166534 : isMage ? 0x5b21b6 : 0x3f6212;
  const accent = isMutant ? 0x14532d : isMage ? 0xfbbf24 : 0x365314;
  const skinMat = mat(skin);
  const clothMat = mat(cloth);
  const accentMat = mat(accent);

  const torsoH = isMutant ? 18 : isMage ? 16 : 15;
  const torsoW = isMutant ? 14 : isMage ? 10 : 11;
  const torso = mesh(new THREE.BoxGeometry(torsoW, torsoH, 8), clothMat, 0, 16, 0);
  body.add(torso);

  if (isMage) {
    const robe = mesh(new THREE.ConeGeometry(9, 18, 8), mat(0x4c1d95), 0, 6, 0);
    body.add(robe);
  }

  const head = new THREE.Group();
  head.position.set(isZombie ? 1.4 : 0, 16 + torsoH * 0.55, 0);
  const skull = mesh(
    new THREE.SphereGeometry(isMutant ? 6.4 : 5.4, 12, 10),
    skinMat,
    0,
    0,
    0
  );
  head.add(skull);
  head.add(mesh(new THREE.SphereGeometry(0.9, 8, 8), mat(0x111827), -1.8, 1.2, 4.4));
  head.add(mesh(new THREE.SphereGeometry(0.9, 8, 8), mat(0x111827), 1.8, 1.2, 4.4));
  if (isMutant) {
    head.add(mesh(new THREE.ConeGeometry(1.4, 5, 6), accentMat, -3.2, 5.2, 0));
    head.add(mesh(new THREE.ConeGeometry(1.4, 5, 6), accentMat, 3.2, 5.2, 0));
  }
  if (isMage) {
    const hat = mesh(new THREE.ConeGeometry(5.2, 12, 8), mat(0x6d28d9), 0, 8, 0);
    head.add(hat);
  }
  if (isZombie) {
    head.rotation.z = 0.18;
    head.add(mesh(new THREE.BoxGeometry(3.2, 1.2, 2), mat(0x14532d), 0, -2.4, 4.2));
  }
  body.add(head);

  const armLen = isMutant ? 16 : 13;
  const leftArm = new THREE.Group();
  leftArm.position.set(-torsoW * 0.62, 20, 0);
  leftArm.add(mesh(new THREE.BoxGeometry(3.2, armLen, 3.2), skinMat, 0, -armLen * 0.45, 0));
  body.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(torsoW * 0.62, 20, 0);
  rightArm.add(mesh(new THREE.BoxGeometry(3.2, armLen, 3.2), skinMat, 0, -armLen * 0.45, 0));
  body.add(rightArm);

  let extra: THREE.Object3D | null = null;
  if (isMage) {
    extra = new THREE.Group();
    extra.position.set(0, -armLen * 0.7, 0);
    extra.add(mesh(new THREE.CylinderGeometry(0.7, 0.7, 22, 8), accentMat, 0, -6, 0));
    extra.add(mesh(new THREE.SphereGeometry(2.4, 10, 8), mat(0xf59e0b, { emissive: 0xf59e0b, emissiveIntensity: 0.45 }), 0, -16, 0));
    rightArm.add(extra);
  }

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-3.4, 8, 0);
  leftLeg.add(mesh(new THREE.BoxGeometry(3.6, 12, 3.6), clothMat, 0, -6, 0));
  body.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(3.4, 8, 0);
  rightLeg.add(mesh(new THREE.BoxGeometry(3.6, 12, 3.6), clothMat, 0, -6, 0));
  body.add(rightLeg);

  addShadow(root, isMutant ? 11 : 9);
  const materials: THREE.MeshStandardMaterial[] = [];
  collectMats(root, materials);

  root.scale.setScalar(isMutant ? 2.35 : 2.15);
  return {
    root,
    body,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    extra,
    materials,
    gait: 'biped',
  };
}

function makeDog(): HeroRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 10;
  root.add(body);

  const fur = mat(0xd97706);
  const dark = mat(0x78350f);
  const nose = mat(0x1c1917);

  const torso = mesh(new THREE.BoxGeometry(10, 8, 16), fur, 0, 8, 0);
  body.add(torso);

  const head = new THREE.Group();
  head.position.set(0, 11, 10);
  head.add(mesh(new THREE.BoxGeometry(7, 6, 7), fur, 0, 0, 0));
  head.add(mesh(new THREE.BoxGeometry(3.4, 2.4, 4.2), dark, 0, -1.2, 4.4));
  head.add(mesh(new THREE.SphereGeometry(0.7, 8, 8), nose, 0, -1.4, 6.4));
  head.add(mesh(new THREE.BoxGeometry(1.6, 3.4, 1.2), dark, -2.6, 4, -1));
  head.add(mesh(new THREE.BoxGeometry(1.6, 3.4, 1.2), dark, 2.6, 4, -1));
  body.add(head);

  const leftArm = new THREE.Group();
  leftArm.position.set(-3.6, 5, 5.6);
  leftArm.add(mesh(new THREE.BoxGeometry(2.2, 8, 2.2), dark, 0, -4, 0));
  body.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(3.6, 5, 5.6);
  rightArm.add(mesh(new THREE.BoxGeometry(2.2, 8, 2.2), dark, 0, -4, 0));
  body.add(rightArm);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-3.6, 5, -5.4);
  leftLeg.add(mesh(new THREE.BoxGeometry(2.2, 8, 2.2), dark, 0, -4, 0));
  body.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(3.6, 5, -5.4);
  rightLeg.add(mesh(new THREE.BoxGeometry(2.2, 8, 2.2), dark, 0, -4, 0));
  body.add(rightLeg);

  const extra = new THREE.Group();
  extra.position.set(0, 10, -8.4);
  extra.add(mesh(new THREE.BoxGeometry(1.6, 1.6, 8), fur, 0, 0, -3));
  body.add(extra);

  addShadow(root, 10);
  const materials: THREE.MeshStandardMaterial[] = [];
  collectMats(root, materials);
  root.scale.setScalar(1.5);

  return {
    root,
    body,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    extra,
    materials,
    gait: 'quad',
  };
}

export function createProceduralHero(cardId: ClickRaidCardId): HeroRig {
  return cardId === 'it' ? makeDog() : makeBiped(cardId);
}

export function poseHeroRig(
  rig: HeroRig,
  mode: 'run' | 'attack' | 'death',
  time: number,
  cardId: ClickRaidCardId
) {
  const t = time;
  if (mode === 'death') {
    const fall = Math.min(1, t * 1.6);
    rig.root.rotation.z = fall * (cardId === 'it' ? 1.15 : 1.35);
    rig.body.position.y = 10 - fall * 8;
    rig.materials.forEach((m) => {
      m.transparent = true;
      m.opacity = Math.max(0.15, 1 - fall);
    });
    return;
  }

  rig.root.rotation.z = 0;
  rig.materials.forEach((m) => {
    m.transparent = false;
    m.opacity = 1;
  });

  if (rig.gait === 'quad') {
    const gallop = mode === 'attack' ? 16 : 11;
    const s = Math.sin(t * gallop);
    const c = Math.cos(t * gallop);
    rig.body.position.y = 10 + Math.abs(s) * (mode === 'attack' ? 3.2 : 2.2);
    rig.body.rotation.x = s * 0.18;
    rig.leftArm.rotation.x = s * 0.9;
    rig.rightArm.rotation.x = c * 0.9;
    rig.leftLeg.rotation.x = c * 0.9;
    rig.rightLeg.rotation.x = s * 0.9;
    if (rig.extra) rig.extra.rotation.y = Math.sin(t * 10) * 0.6;
    rig.head.rotation.x = mode === 'attack' ? -0.35 + s * 0.2 : s * 0.12;
    return;
  }

  if (mode === 'attack') {
    const strike = Math.sin(t * 14);
    rig.body.position.y = 10 + Math.abs(strike) * 1.4;
    rig.body.rotation.y = strike * 0.25;
    rig.rightArm.rotation.x = -1.35 + strike * 0.85;
    rig.leftArm.rotation.x = 0.35;
    rig.leftLeg.rotation.x = -0.2;
    rig.rightLeg.rotation.x = 0.25;
    rig.head.rotation.y = strike * 0.15;
    if (cardId === 'standing' && rig.extra) {
      rig.extra.rotation.z = strike * 0.5;
    }
    return;
  }

  const cadence = cardId === 'mutant' ? 9.2 : cardId === 'zombi' ? 7.4 : 8.6;
  const swing = Math.sin(t * cadence);
  rig.body.position.y = 10 + Math.abs(swing) * 2.1;
  rig.body.rotation.z = swing * 0.06;
  rig.leftArm.rotation.x = swing * (cardId === 'mutant' ? 1.05 : 0.85);
  rig.rightArm.rotation.x = -swing * (cardId === 'mutant' ? 1.05 : 0.85);
  rig.leftLeg.rotation.x = -swing * 0.8;
  rig.rightLeg.rotation.x = swing * 0.8;
  rig.head.rotation.y = swing * 0.12;
  if (cardId === 'zombi') {
    rig.leftArm.rotation.x = -1.1 + swing * 0.2;
    rig.head.rotation.z = 0.16;
  }
}

/**
 * Kart atılan kimi: model preload → SkeletonUtils.clone → qala (X,Z)
 * radiusunda spawn → lookAt(qala) → Attack LoopRepeat → taymer bitəndə remove+dispose.
 *
 * Qeyd: export olunmuş .gltf faylları armature-dir (mesh/skin yoxdur).
 * Canlı görünüş üçün Mixamo FBX (skinned mesh + hücum klipi) yüklənir.
 */
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { ClickRaidCardId } from '@/app/lib/clickRaidLogic';
import type { ClickRaidAnimState } from './clickRaidModelPaths';
import { CLICK_RAID_FBX_SOURCES, CLICK_RAID_GLTF } from './clickRaidModelPaths';
import type { ClickRaidMapSlot } from './clickRaidMapEngineTypes';
import { createProceduralHero, poseHeroRig, type HeroRig } from './clickRaidHeroFactory';
import { computeRaidSpawnPoint } from './clickRaidMapMotion';

interface RaidInstance {
  slotId: string;
  attackId: string;
  cardId: ClickRaidCardId;
  root: THREE.Group;
  mesh: THREE.Object3D;
  mixer: THREE.AnimationMixer | null;
  attack: THREE.AnimationAction | null;
  death: THREE.AnimationAction | null;
  mode: ClickRaidAnimState;
  rig: HeroRig | null;
  fromGltf: boolean;
  castleX: number;
  castleY: number;
  ringIndex: number;
  ringTotal: number;
  bornAt: number;
}

type HeroTemplate = {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  unitScale: number;
};

const ATTACK_CLIP_ALIASES = ['attack', 'hücum', 'hucum', 'swiping', 'slash', 'strike', 'magic'];
const DEATH_CLIP_ALIASES = ['death', 'die', 'dying'];
const MAP_FBX_BOOST = 52;

export class ClickRaidThreeGltfEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private clock = new THREE.Clock();
  private rafId = 0;
  private width = 1;
  private height = 1;
  private raids = new Map<string, RaidInstance>();
  private templates = new Map<ClickRaidCardId, HeroTemplate>();
  private ready = false;
  private rings = new Map<string, THREE.Mesh>();
  private lookDummy = new THREE.Object3D();
  private castleTarget = new THREE.Vector3();
  private lastSlots: ClickRaidMapSlot[] = [];

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.OrthographicCamera(0, 1, 1, 0, -800, 800);
    this.camera.position.set(0, 0, 120);
    this.camera.lookAt(0, 0, 0);

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.15));
    const key = new THREE.DirectionalLight(0xfff7ed, 1.35);
    key.position.set(80, 140, 160);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x93c5fd, 0.7);
    fill.position.set(-120, 40, 80);
    this.scene.add(fill);
  }

  async init(): Promise<boolean> {
    this.ready = true;
    void this.preloadModels();
    return true;
  }

  private meshCount(root: THREE.Object3D): number {
    let n = 0;
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) n += 1;
    });
    return n;
  }

  private prepareRenderable(root: THREE.Object3D): void {
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (!mat) continue;
        mat.side = THREE.DoubleSide;
        mat.transparent = false;
        mat.opacity = 1;
        if ('emissive' in mat && mat.emissive instanceof THREE.Color) {
          if (mat.emissive.getHex() === 0) mat.emissive.setHex(0x1a1a1a);
        }
        mat.needsUpdate = true;
      }
    });
  }

  private async preloadModels(): Promise<void> {
    const gltfLoader = new GLTFLoader();
    const fbxLoader = new FBXLoader();
    const ids: ClickRaidCardId[] = ['mutant', 'standing', 'zombi', 'it'];
    await Promise.all(ids.map((id) => this.loadHero(id, gltfLoader, fbxLoader)));
    if (this.lastSlots.length) this.rebuildFromSlots(this.lastSlots);
  }

  private async loadHero(
    id: ClickRaidCardId,
    gltfLoader: GLTFLoader,
    fbxLoader: FBXLoader
  ): Promise<void> {
    const gltfCfg = CLICK_RAID_GLTF[id];
    const fbxCfg = CLICK_RAID_FBX_SOURCES[id];

    try {
      const gltf = await gltfLoader.loadAsync(gltfCfg.gltf);
      if (gltf?.scene && this.meshCount(gltf.scene) > 0) {
        this.templates.set(id, {
          scene: gltf.scene,
          animations: gltf.animations ?? [],
          unitScale: gltfCfg.displayScale * 18,
        });
        return;
      }
    } catch {
      /* glTF armature-only ola bilər — FBX-ə keç */
    }

    try {
      const attackRoot = await fbxLoader.loadAsync(fbxCfg.attack);
      const clips: THREE.AnimationClip[] = attackRoot.animations.map((c) => c.clone());
      if (clips[0] && !this.clipByAliases(clips, ATTACK_CLIP_ALIASES)) {
        clips[0].name = 'attack';
      }
      try {
        const deathRoot = await fbxLoader.loadAsync(fbxCfg.death);
        const deathClip = deathRoot.animations[0]?.clone() ?? null;
        if (deathClip) {
          deathClip.name = 'death';
          clips.push(deathClip);
        }
      } catch {
        /* death optional */
      }
      this.templates.set(id, {
        scene: attackRoot,
        animations: clips,
        unitScale: fbxCfg.meshScale * MAP_FBX_BOOST,
      });
    } catch (err) {
      console.warn(`[ClickRaid:${id}] FBX yüklənmədi:`, err);
    }
  }

  private rebuildFromSlots(slots: ClickRaidMapSlot[]): void {
    for (const [id, raid] of this.raids) {
      if (raid.fromGltf) continue;
      if (!this.templates.has(raid.cardId)) continue;
      this.disposeRaid(raid);
      this.raids.delete(id);
    }
    this.syncRaids(slots);
  }

  resize(w: number, h: number): void {
    this.width = Math.max(1, w);
    this.height = Math.max(1, h);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.left = 0;
    this.camera.right = this.width;
    this.camera.top = this.height;
    this.camera.bottom = 0;
    this.camera.updateProjectionMatrix();
  }

  private clipByAliases(clips: THREE.AnimationClip[], aliases: string[]) {
    for (const alias of aliases) {
      const lower = alias.toLowerCase();
      const found =
        clips.find((c) => c.name.toLowerCase() === lower) ??
        clips.find((c) => c.name.toLowerCase().includes(lower));
      if (found) return found;
    }
    return null;
  }

  private createFromTemplate(cardId: ClickRaidCardId): Omit<
    RaidInstance,
    'slotId' | 'attackId' | 'castleX' | 'castleY' | 'ringIndex' | 'ringTotal' | 'bornAt'
  > | null {
    const data = this.templates.get(cardId);
    if (!data || this.meshCount(data.scene) === 0) return null;

    const mesh = SkeletonUtils.clone(data.scene) as THREE.Group;
    mesh.scale.setScalar(data.unitScale);
    this.prepareRenderable(mesh);

    const mixer = new THREE.AnimationMixer(mesh);
    const attackSrc =
      this.clipByAliases(data.animations, ATTACK_CLIP_ALIASES) ?? data.animations[0] ?? null;
    const deathSrc = this.clipByAliases(data.animations, DEATH_CLIP_ALIASES);
    const attackClip = attackSrc?.clone() ?? null;
    const deathClip = deathSrc?.clone() ?? null;

    const attackAction = attackClip ? mixer.clipAction(attackClip) : null;
    if (attackAction) {
      attackAction.enabled = true;
      attackAction.setEffectiveWeight(1);
      attackAction.setLoop(THREE.LoopRepeat, Infinity);
      attackAction.play();
      mixer.update(0);
    }

    const root = new THREE.Group();
    root.add(mesh);

    return {
      cardId,
      root,
      mesh,
      mixer,
      attack: attackAction,
      death: deathClip ? mixer.clipAction(deathClip) : null,
      mode: 'attack',
      rig: null,
      fromGltf: true,
    };
  }

  private createRaid(slot: ClickRaidMapSlot): RaidInstance {
    const fromTemplate = this.createFromTemplate(slot.cardId);
    const rig = fromTemplate ? null : createProceduralHero(slot.cardId);
    const root = fromTemplate?.root ?? rig!.root;
    const mesh = fromTemplate?.mesh ?? rig!.root;

    const inst: RaidInstance = {
      slotId: slot.slotId,
      attackId: slot.attackId,
      cardId: slot.cardId,
      root,
      mesh,
      mixer: fromTemplate?.mixer ?? null,
      attack: fromTemplate?.attack ?? null,
      death: fromTemplate?.death ?? null,
      mode: 'attack',
      rig,
      fromGltf: Boolean(fromTemplate),
      castleX: slot.castleX,
      castleY: slot.castleY,
      ringIndex: slot.ringIndex,
      ringTotal: slot.ringTotal,
      bornAt: performance.now() / 1000,
    };

    this.placeAroundCastle(inst);
    this.scene.add(root);
    this.raids.set(slot.slotId, inst);
    return inst;
  }

  private placeAroundCastle(raid: RaidInstance) {
    const spawn = computeRaidSpawnPoint(raid.castleX, raid.castleY, raid.ringIndex, raid.ringTotal);
    const y = this.height - spawn.z;
    raid.root.position.set(spawn.x, y, 8);

    this.lookDummy.position.set(spawn.x, 0, spawn.z);
    this.castleTarget.set(raid.castleX, 0, raid.castleY);
    this.lookDummy.lookAt(this.castleTarget);
    raid.root.rotation.set(0.72, this.lookDummy.rotation.y + Math.PI, 0);
  }

  private ensureCastleRing(castleKey: string, x: number, y: number) {
    let ring = this.rings.get(castleKey);
    if (!ring) {
      ring = new THREE.Mesh(
        new THREE.RingGeometry(38, 44, 40),
        new THREE.MeshBasicMaterial({
          color: 0xef4444,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      ring.rotation.x = -0.9;
      this.scene.add(ring);
      this.rings.set(castleKey, ring);
    }
    ring.position.set(x, this.height - y, -2);
    const pulse = 0.85 + Math.sin(this.clock.elapsedTime * 3) * 0.12;
    ring.scale.setScalar(pulse);
  }

  private disposeObject3D(root: THREE.Object3D, disposeSharedAssets: boolean) {
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (disposeSharedAssets) mesh.geometry?.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of materials) {
        if (disposeSharedAssets) mat?.dispose();
      }
    });
  }

  private disposeRaid(raid: RaidInstance) {
    raid.mixer?.stopAllAction();
    raid.mixer?.uncacheRoot(raid.mesh);
    this.scene.remove(raid.root);
    this.disposeObject3D(raid.root, !raid.fromGltf);
  }

  private disposeRing(ring: THREE.Mesh) {
    this.scene.remove(ring);
    ring.geometry.dispose();
    (ring.material as THREE.Material).dispose();
  }

  syncRaids(slots: ClickRaidMapSlot[]): void {
    if (!this.ready) return;
    this.lastSlots = slots;
    const seen = new Set<string>();
    const castleSeen = new Set<string>();

    for (const slot of slots) {
      seen.add(slot.slotId);
      let raid = this.raids.get(slot.slotId);
      if (!raid) raid = this.createRaid(slot);

      raid.castleX = slot.castleX;
      raid.castleY = slot.castleY;
      raid.ringIndex = slot.ringIndex;
      raid.ringTotal = slot.ringTotal;
      raid.cardId = slot.cardId;
      this.placeAroundCastle(raid);

      const castleKey = `${Math.round(slot.castleX)}:${Math.round(slot.castleY)}`;
      castleSeen.add(castleKey);
      this.ensureCastleRing(castleKey, slot.castleX, slot.castleY);

      if (slot.mode === 'attack' && raid.mode !== 'attack' && raid.mode !== 'death') {
        this.playAttack(slot.attackId);
      }
      if (slot.mode === 'death' && raid.mode !== 'death') {
        this.playDeath(slot.attackId);
      }
    }

    for (const [id, raid] of this.raids) {
      if (!seen.has(id)) {
        this.disposeRaid(raid);
        this.raids.delete(id);
      }
    }

    for (const [key, ring] of this.rings) {
      if (!castleSeen.has(key)) {
        this.disposeRing(ring);
        this.rings.delete(key);
      }
    }
  }

  playAttack(attackId: string): void {
    for (const raid of this.raids.values()) {
      if (raid.attackId !== attackId || raid.mode === 'death') continue;
      raid.mode = 'attack';
      if (raid.attack && !raid.attack.isRunning()) {
        raid.attack.reset().setLoop(THREE.LoopRepeat, Infinity).play();
      }
    }
  }

  playDeath(attackId: string): void {
    for (const raid of this.raids.values()) {
      if (raid.attackId !== attackId) continue;
      raid.mode = 'death';
      raid.bornAt = performance.now() / 1000;
      if (raid.death) {
        raid.attack?.fadeOut(0.1);
        raid.death.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.1).play();
        raid.death.clampWhenFinished = true;
      }
    }
  }

  hitTest(clientX: number, clientY: number): string | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * this.width;
    const y = ((clientY - rect.top) / rect.height) * this.height;
    let best: { id: string; dist: number } | null = null;
    for (const raid of this.raids.values()) {
      if (raid.mode === 'death') continue;
      const wx = raid.root.position.x;
      const wy = this.height - raid.root.position.y;
      const dist = Math.hypot(x - wx, y - wy);
      if (dist < 56 && (!best || dist < best.dist)) {
        best = { id: raid.attackId, dist };
      }
    }
    return best?.id ?? null;
  }

  isReady(): boolean {
    return this.ready;
  }

  start(): void {
    if (this.width <= 1 || this.height <= 1) {
      this.resize(Math.max(1, this.canvas.clientWidth), Math.max(1, this.canvas.clientHeight));
    }
    const tick = () => {
      this.rafId = requestAnimationFrame(tick);
      const d = Math.min(this.clock.getDelta(), 0.05);
      const time = this.clock.elapsedTime;

      for (const raid of this.raids.values()) {
        raid.mixer?.update(d);
        if (raid.rig) {
          poseHeroRig(
            raid.rig,
            raid.mode === 'death' ? 'death' : 'attack',
            time - raid.bornAt + raid.ringIndex * 0.35,
            raid.cardId
          );
        }
      }

      for (const ring of this.rings.values()) {
        const pulse = 0.88 + Math.sin(time * 3.2) * 0.1;
        ring.scale.setScalar(pulse);
        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.22 + Math.abs(Math.sin(time * 3.2)) * 0.18;
      }

      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
    for (const raid of this.raids.values()) this.disposeRaid(raid);
    this.raids.clear();
    for (const ring of this.rings.values()) this.disposeRing(ring);
    this.rings.clear();
    this.renderer.dispose();
    this.ready = false;
  }
}

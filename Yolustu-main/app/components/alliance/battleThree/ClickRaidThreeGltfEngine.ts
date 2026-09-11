/**
 * Leaflet xəritəsi üzərində canlı 3D qəhrəmanlar.
 * glTF varsa istifadə olunur; yoxdursa procedural qəhrəman + öz animasiyası.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { ClickRaidCardId } from '@/app/lib/clickRaidLogic';
import type { ClickRaidAnimState } from './clickRaidModelPaths';
import { CLICK_RAID_GLTF } from './clickRaidModelPaths';
import type { ClickRaidMapSlot } from './clickRaidMapEngineTypes';
import { createProceduralHero, poseHeroRig, type HeroRig } from './clickRaidHeroFactory';
import { computeRaidHeroMotion, orbitSpeedForCard } from './clickRaidMapMotion';

interface RaidInstance {
  slotId: string;
  attackId: string;
  cardId: ClickRaidCardId;
  root: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  run: THREE.AnimationAction | null;
  attack: THREE.AnimationAction | null;
  death: THREE.AnimationAction | null;
  mode: ClickRaidAnimState;
  rig: HeroRig | null;
  castleX: number;
  castleY: number;
  ringIndex: number;
  ringTotal: number;
  spawnedAt: number;
  orbitSpeed: number;
  bornAt: number;
}

type HeroGltf = { scene: THREE.Group; animations: THREE.AnimationClip[] };

export class ClickRaidThreeGltfEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private clock = new THREE.Clock();
  private rafId = 0;
  private width = 1;
  private height = 1;
  private raids = new Map<string, RaidInstance>();
  private gltfData = new Map<ClickRaidCardId, HeroGltf>();
  private ready = false;
  private rings = new Map<string, THREE.Mesh>();

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

    this.camera = new THREE.OrthographicCamera(0, 1, 1, 0, -400, 400);
    this.camera.position.set(0, 0, 120);
    this.camera.lookAt(0, 0, 0);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.82));
    const key = new THREE.DirectionalLight(0xfff7ed, 1.15);
    key.position.set(80, 140, 160);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x93c5fd, 0.45);
    fill.position.set(-120, 40, 80);
    this.scene.add(fill);
  }

  async init(): Promise<boolean> {
    this.ready = true;
    void this.loadGltfInBackground();
    return true;
  }

  private async loadGltfInBackground(): Promise<void> {
    const loader = new GLTFLoader();
    const ids: ClickRaidCardId[] = ['mutant', 'standing', 'zombi', 'it'];
    await Promise.all(
      ids.map(async (id) => {
        try {
          const gltf = await loader.loadAsync(CLICK_RAID_GLTF[id].gltf);
          if (gltf?.scene) {
            this.gltfData.set(id, { scene: gltf.scene, animations: gltf.animations ?? [] });
          }
        } catch {
          /* public/models yoxdursa procedural qəhrəman işləyir */
        }
      })
    );
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

  private clipByName(clips: THREE.AnimationClip[], name: string) {
    const lower = name.toLowerCase();
    return (
      clips.find((c) => c.name.toLowerCase() === lower) ??
      clips.find((c) => c.name.toLowerCase().includes(lower)) ??
      null
    );
  }

  private createFromGltf(cardId: ClickRaidCardId): Omit<
    RaidInstance,
    | 'slotId'
    | 'attackId'
    | 'castleX'
    | 'castleY'
    | 'ringIndex'
    | 'ringTotal'
    | 'spawnedAt'
    | 'orbitSpeed'
    | 'bornAt'
  > | null {
    const data = this.gltfData.get(cardId);
    if (!data) return null;

    const mesh = SkeletonUtils.clone(data.scene) as THREE.Group;
    mesh.scale.setScalar(CLICK_RAID_GLTF[cardId].displayScale * 18);
    mesh.rotation.x = 0.38;
    const container = new THREE.Group();
    container.add(mesh);

    const mixer = new THREE.AnimationMixer(mesh);
    const runClip = this.clipByName(data.animations, 'run') ?? data.animations[0] ?? null;
    const attackClip = this.clipByName(data.animations, 'attack');
    const deathClip = this.clipByName(data.animations, 'death');

    let runAction: THREE.AnimationAction | null = null;
    if (runClip) {
      runAction = mixer.clipAction(runClip);
      runAction.setLoop(THREE.LoopRepeat, Infinity);
      runAction.play();
    }

    return {
      cardId,
      root: container,
      mixer,
      run: runAction,
      attack: attackClip ? mixer.clipAction(attackClip) : null,
      death: deathClip ? mixer.clipAction(deathClip) : null,
      mode: 'run',
      rig: null,
    };
  }

  private createRaid(slot: ClickRaidMapSlot): RaidInstance {
    const fromGltf = this.createFromGltf(slot.cardId);
    const rig = fromGltf ? null : createProceduralHero(slot.cardId);
    const root = fromGltf?.root ?? rig!.root;
    root.rotation.x = 0.42;

    const inst: RaidInstance = {
      slotId: slot.slotId,
      attackId: slot.attackId,
      cardId: slot.cardId,
      root,
      mixer: fromGltf?.mixer ?? null,
      run: fromGltf?.run ?? null,
      attack: fromGltf?.attack ?? null,
      death: fromGltf?.death ?? null,
      mode: 'run',
      rig,
      castleX: slot.castleX,
      castleY: slot.castleY,
      ringIndex: slot.ringIndex,
      ringTotal: slot.ringTotal,
      spawnedAt: slot.spawnedAt,
      orbitSpeed: slot.orbitSpeed || orbitSpeedForCard(slot.cardId),
      bornAt: performance.now() / 1000,
    };

    this.scene.add(root);
    this.raids.set(slot.slotId, inst);
    return inst;
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

  syncRaids(slots: ClickRaidMapSlot[]): void {
    if (!this.ready) return;
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
      raid.spawnedAt = slot.spawnedAt;
      raid.orbitSpeed = slot.orbitSpeed || raid.orbitSpeed;
      raid.cardId = slot.cardId;

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
        this.scene.remove(raid.root);
        this.raids.delete(id);
      }
    }

    for (const [key, ring] of this.rings) {
      if (!castleSeen.has(key)) {
        this.scene.remove(ring);
        this.rings.delete(key);
      }
    }
  }

  playAttack(attackId: string): void {
    for (const raid of this.raids.values()) {
      if (raid.attackId !== attackId || raid.mode === 'death') continue;
      raid.mode = 'attack';
      if (raid.attack) {
        raid.run?.fadeOut(0.1);
        raid.attack.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.1).play();
      }
    }
  }

  playDeath(attackId: string): void {
    for (const raid of this.raids.values()) {
      if (raid.attackId !== attackId) continue;
      raid.mode = 'death';
      raid.bornAt = performance.now() / 1000;
      if (raid.death) {
        raid.run?.fadeOut(0.1);
        raid.attack?.fadeOut(0.1);
        raid.death.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.1).play();
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
    const tick = () => {
      this.rafId = requestAnimationFrame(tick);
      const d = this.clock.getDelta();
      const now = Date.now();
      const time = this.clock.elapsedTime;

      for (const raid of this.raids.values()) {
        const motion = computeRaidHeroMotion(
          raid.castleX,
          raid.castleY,
          raid.ringIndex,
          raid.ringTotal,
          raid.spawnedAt,
          now,
          raid.orbitSpeed,
          raid.mode
        );
        raid.root.position.set(motion.x, this.height - motion.y, 8);
        raid.root.rotation.y = motion.rotationY;
        raid.mixer?.update(d);
        if (raid.rig) {
          poseHeroRig(raid.rig, raid.mode, time - raid.bornAt + raid.ringIndex * 0.35, raid.cardId);
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
    this.raids.clear();
    this.rings.clear();
    this.renderer.dispose();
    this.ready = false;
  }
}

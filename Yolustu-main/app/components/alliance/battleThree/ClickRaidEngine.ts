import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import type { ClickRaidCardId } from '@/app/lib/clickRaidLogic';
import { CLICK_RAID_FBX_SOURCES, type ClickRaidAnimState } from './clickRaidModelPaths';

interface RaidClips {
  run: THREE.AnimationClip | null;
  attack: THREE.AnimationClip | null;
  death: THREE.AnimationClip | null;
}

const meshTemplates = new Map<ClickRaidCardId, THREE.Group>();
const clipCache = new Map<ClickRaidCardId, RaidClips>();
const loadPromises = new Map<ClickRaidCardId, Promise<boolean>>();

async function ensureClickRaidAssets(cardId: ClickRaidCardId): Promise<boolean> {
  if (meshTemplates.has(cardId) && clipCache.get(cardId)?.run) return true;
  const pending = loadPromises.get(cardId);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const paths = CLICK_RAID_FBX_SOURCES[cardId];
      const loader = new FBXLoader();
      const [runFbx, attackFbx, deathFbx] = await Promise.all([
        loader.loadAsync(paths.run),
        loader.loadAsync(paths.attack),
        loader.loadAsync(paths.death),
      ]);
      meshTemplates.set(cardId, runFbx);
      clipCache.set(cardId, {
        run: runFbx.animations[0] ?? null,
        attack: attackFbx.animations[0] ?? runFbx.animations[0] ?? null,
        death: deathFbx.animations[0] ?? null,
      });
      return true;
    } catch (err) {
      console.warn(`[ClickRaid:${cardId}] FBX yüklənmədi:`, err);
      return false;
    }
  })();

  loadPromises.set(cardId, promise);
  return promise;
}

export class ClickRaidEngine {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private rafId = 0;
  private mesh: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private runAction: THREE.AnimationAction | null = null;
  private attackAction: THREE.AnimationAction | null = null;
  private deathAction: THREE.AnimationAction | null = null;
  private mode: ClickRaidAnimState = 'run';
  private progress = 0;
  private width = 1;
  private height = 1;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  constructor(
    private canvas: HTMLCanvasElement,
    private cardId: ClickRaidCardId
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.camera.position.set(0, 1.2, 4.2);

    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    const dirColor =
      cardId === 'standing'
        ? 0x93c5fd
        : cardId === 'zombi'
          ? 0x86efac
          : cardId === 'it'
            ? 0xfbbf24
            : 0xfca5a5;
    const dir = new THREE.DirectionalLight(dirColor, 1.2);
    dir.position.set(2, 4, 3);
    this.scene.add(ambient, dir);
  }

  async init(): Promise<boolean> {
    const ok = await ensureClickRaidAssets(this.cardId);
    const template = meshTemplates.get(this.cardId);
    const clips = clipCache.get(this.cardId);
    if (!ok || !template || !clips) return false;

    this.mesh = template.clone(true);
    this.mesh.scale.setScalar(CLICK_RAID_FBX_SOURCES[this.cardId].meshScale);
    this.mesh.position.set(-2.2, 0, 0);
    this.scene.add(this.mesh);

    this.mixer = new THREE.AnimationMixer(this.mesh);
    if (clips.run) {
      this.runAction = this.mixer.clipAction(clips.run);
      this.runAction.setLoop(THREE.LoopRepeat, Infinity);
      this.runAction.play();
    }
    if (clips.attack) this.attackAction = this.mixer.clipAction(clips.attack);
    if (clips.death) this.deathAction = this.mixer.clipAction(clips.death);

    return true;
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  setRunProgress(t: number): void {
    this.progress = Math.max(0, Math.min(1, t));
    if (this.mesh && this.mode === 'run') {
      this.mesh.position.x = -2.2 + this.progress * 2.4;
    }
  }

  playAttack(): void {
    if (!this.mixer || !this.attackAction) return;
    this.mode = 'attack';
    this.runAction?.fadeOut(0.1);
    this.attackAction.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.1).play();
    this.attackAction.clampWhenFinished = true;
  }

  playDeath(): void {
    if (!this.mixer || !this.deathAction) return;
    this.mode = 'death';
    this.runAction?.fadeOut(0.1);
    this.attackAction?.fadeOut(0.1);
    this.deathAction.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.1).play();
    this.deathAction.clampWhenFinished = true;
  }

  hitTest(clientX: number, clientY: number): boolean {
    if (!this.mesh || this.mode === 'death') return false;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.mesh, true);
    return hits.length > 0;
  }

  start(onFrame?: () => void): void {
    const tick = () => {
      this.rafId = requestAnimationFrame(tick);
      const delta = this.clock.getDelta();
      this.mixer?.update(delta);
      onFrame?.();
      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
    this.mixer?.stopAllAction();
    this.renderer.dispose();
  }
}

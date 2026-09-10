import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { SHIELD_DEFENDER_MODELS, type DefenderAnimState } from './defenderModelPaths';

export interface DefenderCastleSlot {
  allianceId: string;
  screenX: number;
  screenY: number;
  guardCount: number;
}

interface GuardInstance {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  idleAction: THREE.AnimationAction | null;
  blockAction: THREE.AnimationAction | null;
  mode: DefenderAnimState;
}

interface CastleGroup {
  allianceId: string;
  container: THREE.Group;
  guards: GuardInstance[];
}

let sharedIdleClip: THREE.AnimationClip | null = null;
let sharedBlockClip: THREE.AnimationClip | null = null;
let sharedMeshTemplate: THREE.Group | null = null;
let loadPromise: Promise<boolean> | null = null;

async function ensureDefenderAssets(): Promise<boolean> {
  if (sharedMeshTemplate && sharedIdleClip) return true;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const loader = new FBXLoader();
      const [idleFbx, blockFbx] = await Promise.all([
        loader.loadAsync(SHIELD_DEFENDER_MODELS.idle),
        loader.loadAsync(SHIELD_DEFENDER_MODELS.block),
      ]);

      sharedMeshTemplate = idleFbx;
      sharedIdleClip = idleFbx.animations[0] ?? null;
      sharedBlockClip = blockFbx.animations[0] ?? idleFbx.animations[0] ?? null;

      return Boolean(sharedMeshTemplate);
    } catch (err) {
      console.warn('[ShieldDefender] FBX yüklənmədi:', err);
      return false;
    }
  })();

  return loadPromise;
}

function cloneGuardMesh(): THREE.Group {
  if (!sharedMeshTemplate) {
    const fallback = new THREE.Group();
    const geo = new THREE.BoxGeometry(0.4, 0.9, 0.2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.35 });
    fallback.add(new THREE.Mesh(geo, mat));
    return fallback;
  }
  return SkeletonUtils.clone(sharedMeshTemplate) as THREE.Group;
}

/** Bloklama animasiyasını işə salır (Attack FBX klipi) */
export function playDefenderBlockAnimation(guard: GuardInstance): void {
  if (!guard.blockAction) return;
  guard.mode = 'block';
  guard.idleAction?.fadeOut(0.12);
  guard.blockAction.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.12).play();
  guard.blockAction.clampWhenFinished = true;
}

function playDefenderIdle(guard: GuardInstance): void {
  guard.mode = 'idle';
  guard.blockAction?.fadeOut(0.15);
  if (guard.idleAction) {
    guard.idleAction.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.15).play();
  }
}

function buildGuardInstance(offsetAngle: number, radius: number): GuardInstance {
  const root = new THREE.Group();
  const mesh = cloneGuardMesh();
  mesh.scale.setScalar(0.012);
  mesh.rotation.y = offsetAngle + Math.PI;
  root.add(mesh);

  root.position.set(Math.cos(offsetAngle) * radius, Math.sin(offsetAngle) * radius * 0.45, 0);

  const mixer = new THREE.AnimationMixer(mesh);
  let idleAction: THREE.AnimationAction | null = null;
  let blockAction: THREE.AnimationAction | null = null;

  if (sharedIdleClip) {
    idleAction = mixer.clipAction(sharedIdleClip);
    idleAction.timeScale = 0.35;
  }
  if (sharedBlockClip) {
    blockAction = mixer.clipAction(sharedBlockClip);
    blockAction.timeScale = 1.1;
  }

  const guard: GuardInstance = { root, mixer, idleAction, blockAction, mode: 'idle' };
  playDefenderIdle(guard);
  return guard;
}

export class ShieldDefenderEngine {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private clock = new THREE.Clock();
  private castles = new Map<string, CastleGroup>();
  private width = 1;
  private height = 1;
  private rafId = 0;
  private ready = false;
  private light: THREE.DirectionalLight;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1, 1, 0, 0.1, 500);
    this.camera.position.z = 100;

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    this.light = new THREE.DirectionalLight(0xf8fafc, 1.1);
    this.light.position.set(2, 4, 6);
    this.scene.add(ambient, this.light);
  }

  async init(): Promise<boolean> {
    this.ready = await ensureDefenderAssets();
    return this.ready;
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.left = 0;
    this.camera.right = this.width;
    this.camera.top = 0;
    this.camera.bottom = this.height;
    this.camera.updateProjectionMatrix();
  }

  /** Qala ətrafında idle/shield mövqeyində qoruyucular */
  syncCastles(slots: DefenderCastleSlot[]): void {
    const seen = new Set<string>();

    for (const slot of slots) {
      seen.add(slot.allianceId);
      let castle = this.castles.get(slot.allianceId);

      if (!castle) {
        castle = {
          allianceId: slot.allianceId,
          container: new THREE.Group(),
          guards: [],
        };
        this.scene.add(castle.container);
        this.castles.set(slot.allianceId, castle);
      }

      castle.container.position.set(slot.screenX, this.height - slot.screenY, 0);

      const needed = Math.max(1, Math.min(5, slot.guardCount));
      if (castle.guards.length !== needed) {
        castle.guards.forEach((g) => {
          castle!.container.remove(g.root);
          g.mixer.stopAllAction();
        });
        castle.guards = [];
        for (let i = 0; i < needed; i += 1) {
          const angle = (Math.PI * 1.2 * i) / Math.max(1, needed - 1) - Math.PI * 0.6;
          const guard = buildGuardInstance(angle, 42);
          castle.guards.push(guard);
          castle.container.add(guard.root);
        }
      }
    }

    for (const [id, castle] of this.castles) {
      if (!seen.has(id)) {
        castle.guards.forEach((g) => g.mixer.stopAllAction());
        this.scene.remove(castle.container);
        this.castles.delete(id);
      }
    }
  }

  /** Bloklama animasiyasını bütün qoruyucular üçün işə sal */
  triggerBlock(allianceId: string): void {
    const castle = this.castles.get(allianceId);
    if (!castle) return;
    castle.guards.forEach((guard) => {
      playDefenderBlockAnimation(guard);
      window.setTimeout(() => {
        if (guard.mode === 'block') playDefenderIdle(guard);
      }, 900);
    });
  }

  start(): void {
    const tick = () => {
      this.rafId = requestAnimationFrame(tick);
      const delta = this.clock.getDelta();
      for (const castle of this.castles.values()) {
        for (const guard of castle.guards) {
          guard.mixer.update(delta);
        }
      }
      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
    this.castles.forEach((castle) => {
      castle.guards.forEach((g) => g.mixer.stopAllAction());
    });
    this.castles.clear();
    this.renderer.dispose();
  }
}

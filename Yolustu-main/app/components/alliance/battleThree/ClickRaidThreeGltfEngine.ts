/**

 * Pixi3D uğursuz olanda ehtiyat: Three.js + tək glTF (qala markeri ətrafında).

 */

import * as THREE from 'three';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

import type { ClickRaidCardId } from '@/app/lib/clickRaidLogic';

import type { ClickRaidAnimState } from './clickRaidModelPaths';

import { CLICK_RAID_GLTF } from './clickRaidModelPaths';

import type { ClickRaidMapSlot } from './ClickRaidMapEngine';



interface RaidInstance {

  attackId: string;

  root: THREE.Group;

  mixer: THREE.AnimationMixer;

  run: THREE.AnimationAction | null;

  attack: THREE.AnimationAction | null;

  death: THREE.AnimationAction | null;

  mode: ClickRaidAnimState;

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



  constructor(private canvas: HTMLCanvasElement) {

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.camera = new THREE.OrthographicCamera(0, 1, 1, 0, 0.1, 500);

    this.camera.position.z = 100;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.95));

    const dir = new THREE.DirectionalLight(0xffffff, 1.1);

    dir.position.set(3, 6, 8);

    this.scene.add(dir);

  }



  async init(): Promise<boolean> {

    const loader = new GLTFLoader();

    const ids: ClickRaidCardId[] = ['mutant', 'standing', 'zombi', 'it'];

    for (const id of ids) {

      try {

        const gltf = await loader.loadAsync(CLICK_RAID_GLTF[id].gltf);

        this.gltfData.set(id, { scene: gltf.scene, animations: gltf.animations });

      } catch (e) {

        console.warn(`[ClickRaidThree:${id}]`, e);

      }

    }

    this.ready = this.gltfData.size > 0;

    return this.ready;

  }



  resize(w: number, h: number): void {

    this.width = Math.max(1, w);

    this.height = Math.max(1, h);

    this.renderer.setSize(this.width, this.height, false);

    this.camera.left = 0;

    this.camera.right = this.width;

    this.camera.top = 0;

    this.camera.bottom = this.height;

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



  private createRaid(attackId: string, cardId: ClickRaidCardId): RaidInstance | null {

    const data = this.gltfData.get(cardId);

    if (!data) return null;



    const mesh = SkeletonUtils.clone(data.scene) as THREE.Group;

    mesh.scale.setScalar(CLICK_RAID_GLTF[cardId].displayScale * 0.035);

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



    const inst: RaidInstance = {

      attackId,

      root: container,

      mixer,

      run: runAction,

      attack: attackClip ? mixer.clipAction(attackClip) : null,

      death: deathClip ? mixer.clipAction(deathClip) : null,

      mode: 'run',

    };

    this.scene.add(container);

    this.raids.set(attackId, inst);

    return inst;

  }



  syncRaids(slots: ClickRaidMapSlot[]): void {

    if (!this.ready) return;

    const seen = new Set<string>();

    for (const slot of slots) {

      seen.add(slot.attackId);

      let raid = this.raids.get(slot.attackId);

      if (!raid) raid = this.createRaid(slot.attackId, slot.cardId) ?? undefined;

      if (!raid) continue;

      raid.root.position.set(slot.screenX, this.height - slot.screenY, 0);
      raid.root.rotation.y = slot.rotationY;

      if (slot.mode === 'attack' && raid.mode !== 'attack' && raid.mode !== 'death') {

        this.playAttack(slot.attackId);

      }

      if (slot.mode === 'death' && raid.mode !== 'death') {

        this.playDeath(slot.attackId);

      }

    }

    for (const [id, r] of this.raids) {

      if (!seen.has(id)) {

        this.scene.remove(r.root);

        this.raids.delete(id);

      }

    }

  }



  playAttack(attackId: string): void {

    const r = this.raids.get(attackId);

    if (!r?.attack) return;

    r.mode = 'attack';

    r.run?.fadeOut(0.1);

    r.attack.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.1).play();

  }



  playDeath(attackId: string): void {

    const r = this.raids.get(attackId);

    if (!r?.death) return;

    r.mode = 'death';

    r.run?.fadeOut(0.1);

    r.attack?.fadeOut(0.1);

    r.death.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.1).play();

  }



  hitTest(clientX: number, clientY: number): string | null {

    const rect = this.canvas.getBoundingClientRect();

    const x = ((clientX - rect.left) / rect.width) * this.width;

    const y = ((clientY - rect.top) / rect.height) * this.height;

    for (const [id, raid] of this.raids) {

      if (raid.mode === 'death') continue;

      const wx = raid.root.position.x;

      const wy = this.height - raid.root.position.y;

      if (Math.hypot(x - wx, y - wy) < 52) return id;

    }

    return null;

  }



  isReady(): boolean {

    return this.ready;

  }



  start(): void {

    const tick = () => {

      this.rafId = requestAnimationFrame(tick);

      const d = this.clock.getDelta();

      for (const r of this.raids.values()) r.mixer.update(d);

      this.renderer.render(this.scene, this.camera);

    };

    tick();

  }



  stop(): void {

    cancelAnimationFrame(this.rafId);

    this.raids.clear();

    this.renderer.dispose();

    this.ready = false;

  }

}



/**
 * FBX (run/attack/death) → tək glTF (3 klip: run, attack, death)
 * node scripts/build-click-raid-gltf.mjs
 */
import fs from 'fs';

/** Three GLTFExporter Node.js üçün */
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    result = null;
    onloadend = null;
    readAsDataURL(blob) {
      void blob.arrayBuffer().then((buf) => {
        this.result = `data:application/octet-stream;base64,${Buffer.from(buf).toString('base64')}`;
        this.onloadend?.();
      });
    }
  };
}
import path from 'path';
import { fileURLToPath } from 'url';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');

const HEROES = {
  mutant: {
    dir: path.join(publicDir, 'models/mutant'),
    out: 'mutant.gltf',
    run: 'Mutant Run.fbx',
    attack: 'Mutant Swiping.fbx',
    death: 'Mutant Dying.fbx',
    scale: 0.011,
  },
  standing: {
    dir: path.join(publicDir, 'models/standing'),
    out: 'standing.gltf',
    run: 'Standing Run Forward.fbx',
    attack: 'Standing 2H Magic Attack 01.fbx',
    death: 'Standing React Death Backward.fbx',
    scale: 0.01,
  },
  zombi: {
    dir: path.join(publicDir, 'models/zombie'),
    out: 'zombi.gltf',
    run: 'Zombie Run.fbx',
    attack: 'Zombie Attack.fbx',
    death: 'Zombie Death.fbx',
    scale: 0.011,
  },
  it: {
    dir: path.join(publicDir, 'models/dog'),
    out: 'it.gltf',
    run: 'dog run.fbx',
    attack: 'dog attack.fbx',
    death: 'dog death.fbx',
    scale: 0.012,
  },
};

function loadFbx(loader, filePath) {
  const buf = fs.readFileSync(filePath);
  return loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), filePath);
}

async function buildOne(id, cfg) {
  const loader = new FBXLoader();
  const load = (name) => {
    const filePath = path.join(cfg.dir, name);
    return loadFbx(loader, filePath);
  };

  const runRoot = load(cfg.run);
  const attackRoot = load(cfg.attack);
  const deathRoot = load(cfg.death);

  const clips = [];
  if (runRoot.animations[0]) {
    const c = runRoot.animations[0].clone();
    c.name = 'run';
    clips.push(c);
  }
  if (attackRoot.animations[0]) {
    const c = attackRoot.animations[0].clone();
    c.name = 'attack';
    clips.push(c);
  }
  if (deathRoot.animations[0]) {
    const c = deathRoot.animations[0].clone();
    c.name = 'death';
    clips.push(c);
  }

  runRoot.animations = clips;
  runRoot.scale.setScalar(cfg.scale);

  const exporter = new GLTFExporter();
  const gltf = await exporter.parseAsync(runRoot, { binary: false, animations: clips });
  const outPath = path.join(cfg.dir, cfg.out);
  fs.writeFileSync(outPath, JSON.stringify(gltf));
  console.log('OK', id, outPath, `clips=${clips.length}`);
}

async function main() {
  for (const [id, cfg] of Object.entries(HEROES)) {
    await buildOne(id, cfg);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

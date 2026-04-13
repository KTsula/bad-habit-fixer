// Fetches MediaPipe WASM fileset + landmarker models into public/mediapipe/
// so the app runs fully offline. Idempotent; pass --force to re-download.
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = '@mediapipe/tasks-vision@0.10.14';
const JSDELIVR_FLAT = `https://data.jsdelivr.com/v1/package/npm/${PKG}/flat`;
const JSDELIVR_CDN = `https://cdn.jsdelivr.net/npm/${PKG}`;
const MODELS = [
  {
    url: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
    name: 'hand_landmarker.task',
  },
  {
    url: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
    name: 'face_landmarker.task',
  },
];

const force = process.argv.includes('--force');
const here = dirname(fileURLToPath(import.meta.url));
const outRoot = resolve(here, '..', 'public', 'mediapipe');
const wasmDir = join(outRoot, 'wasm');
const modelsDir = join(outRoot, 'models');

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function download(url, dest, label) {
  if (!force && (await exists(dest))) {
    const { size } = await stat(dest);
    console.log(`skip  ${label}  (exists, ${size} B)`);
    return;
  }
  console.log(`fetch ${label}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) throw new Error(`${url} returned empty body`);
  await writeFile(dest, buf);
  console.log(`  ok  ${label}  ${buf.length} B`);
}

async function listWasmFiles() {
  const res = await fetch(JSDELIVR_FLAT);
  if (!res.ok) throw new Error(`${JSDELIVR_FLAT} -> HTTP ${res.status}`);
  const json = await res.json();
  const files = (json.files ?? []).filter((f) => f.name.startsWith('/wasm/'));
  if (files.length === 0) throw new Error('no wasm files listed on jsdelivr');
  return files.map((f) => f.name);
}

async function main() {
  await mkdir(wasmDir, { recursive: true });
  await mkdir(modelsDir, { recursive: true });

  const wasmPaths = await listWasmFiles();
  console.log(`found ${wasmPaths.length} wasm files on jsdelivr`);
  for (const p of wasmPaths) {
    const base = p.split('/').pop();
    await download(`${JSDELIVR_CDN}${p}`, join(wasmDir, base), `wasm/${base}`);
  }

  for (const m of MODELS) {
    await download(m.url, join(modelsDir, m.name), `models/${m.name}`);
  }
  console.log('done.');
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});

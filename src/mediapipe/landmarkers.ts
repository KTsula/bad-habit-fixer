import {
  FilesetResolver,
  HandLandmarker,
  FaceLandmarker,
} from '@mediapipe/tasks-vision';

const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// In Tauri, assets are bundled locally. In browser, load from CDN so the
// web deploy stays small and doesn't need the ~30 MB of WASM/model files.
const WASM_BASE = IS_TAURI
  ? '/mediapipe/wasm'
  : 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';

const HAND_MODEL_URL = IS_TAURI
  ? '/mediapipe/models/hand_landmarker.task'
  : 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const FACE_MODEL_URL = IS_TAURI
  ? '/mediapipe/models/face_landmarker.task'
  : 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export interface Landmarkers {
  hand: HandLandmarker;
  face: FaceLandmarker;
}

// VIDEO running-mode: the feed source is an HTMLVideoElement consumed once per
// frame via requestVideoFrameCallback (see useVideoFrameLoop).
export async function createLandmarkers(): Promise<Landmarkers> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);

  const [hand, face] = await Promise.all([
    HandLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: HAND_MODEL_URL,
        delegate: 'GPU',
      },
      numHands: 2,
      runningMode: 'VIDEO',
    }),
    FaceLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: FACE_MODEL_URL,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
    }),
  ]);

  return { hand, face };
}

export function disposeLandmarkers(lm: Landmarkers): void {
  try {
    lm.hand.close();
  } catch {
    /* already closed */
  }
  try {
    lm.face.close();
  } catch {
    /* already closed */
  }
}

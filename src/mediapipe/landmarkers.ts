import {
  FilesetResolver,
  HandLandmarker,
  FaceLandmarker,
} from '@mediapipe/tasks-vision';

// Assets are bundled locally under public/mediapipe/ (see scripts/download-mediapipe.mjs).
const WASM_BASE = '/mediapipe/wasm';
const HAND_MODEL_URL = '/mediapipe/models/hand_landmarker.task';
const FACE_MODEL_URL = '/mediapipe/models/face_landmarker.task';

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

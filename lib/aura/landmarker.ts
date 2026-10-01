import type { FilesetResolver as FilesetResolverT, PoseLandmarker as PoseLandmarkerT } from "@mediapipe/tasks-vision";
import { MODEL_URL, WASM_URL } from "./config";

let PoseLandmarker: typeof PoseLandmarkerT;
let FilesetResolver: typeof FilesetResolverT;
let landmarker: PoseLandmarkerT | null = null;
let files: Awaited<ReturnType<typeof FilesetResolverT.forVisionTasks>> | null = null;
let delegate: "GPU" | "CPU" = "GPU";
let recovering = false;
let lastTs = 0;

export const nextTs = () => {
  const n = performance.now();
  lastTs = n > lastTs ? n : lastTs + 1;
  return lastTs;
};

const createLandmarker = (d: "GPU" | "CPU") =>
  PoseLandmarker.createFromOptions(files!, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: d },
    runningMode: "VIDEO",
    numPoses: 1,
  });

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("juge trop long")), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export async function loadModel() {
  if (landmarker) return;
  const vision = await import("@mediapipe/tasks-vision");
  PoseLandmarker = vision.PoseLandmarker;
  FilesetResolver = vision.FilesetResolver;
  files = await withTimeout(FilesetResolver.forVisionTasks(WASM_URL), 12000);
  const gpu = createLandmarker("GPU");
  try {
    landmarker = await withTimeout(gpu, 4000);
    delegate = "GPU";
  } catch {
    gpu.then((l) => {
      try {
        l.close();
      } catch {
        /* ignore */
      }
    }).catch(() => {});
    delegate = "CPU";
    landmarker = await withTimeout(createLandmarker("CPU"), 15000);
  }
}

export function detect(video: HTMLVideoElement) {
  if (!landmarker || recovering) return null;
  try {
    return landmarker.detectForVideo(video, nextTs());
  } catch (e) {
    console.warn("Détection impossible", e);
    if (delegate === "GPU") {
      recovering = true;
      delegate = "CPU";
      const old = landmarker;
      createLandmarker("CPU")
        .then((l) => {
          landmarker = l;
          try {
            old.close();
          } catch {
            /* ignore */
          }
        })
        .catch((err) => console.error(err))
        .finally(() => {
          recovering = false;
        });
    }
    return null;
  }
}

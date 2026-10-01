import { CALIB_RATE, SAMPLE_DT } from "./config";
import { detect } from "./landmarker";
import { angles, type Sample } from "./pose";

export function unlockMedia(video: HTMLVideoElement | null) {
  if (!video?.src) return;
  const wasMuted = video.muted;
  video.muted = false;
  const p = video.play();
  video.pause();
  video.muted = wasMuted;
  if (p) p.catch(() => {});
}

export async function keepAwake() {
  try {
    if ("wakeLock" in navigator) await navigator.wakeLock.request("screen");
  } catch {
    /* ignore */
  }
}

export function waitMeta(v: HTMLVideoElement) {
  if (v.readyState >= 1) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    v.addEventListener("loadedmetadata", () => resolve(), { once: true });
    v.addEventListener("error", () => reject(new Error("vidéo illisible")), { once: true });
  });
}

export function seekTo(video: HTMLVideoElement, t: number) {
  return new Promise<void>((resolve) => {
    if (video.readyState >= 1 && Math.abs(video.currentTime - t) < 0.04) {
      resolve();
      return;
    }
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    video.currentTime = t;
    window.setTimeout(done, 500);
  });
}

export async function startCamera(cam: HTMLVideoElement) {
  const live = cam.srcObject instanceof MediaStream && cam.srcObject.getVideoTracks().some((t) => t.readyState === "live");
  if (live) {
    if (cam.paused) await cam.play();
    return cam.srcObject as MediaStream;
  }
  const tries: MediaStreamConstraints[] = [
    { video: { facingMode: { ideal: "user" }, width: { ideal: 720 }, height: { ideal: 1280 } }, audio: false },
    { video: { facingMode: "user" }, audio: false },
    { video: true, audio: false },
  ];
  let last: unknown;
  for (const c of tries) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(c);
      cam.srcObject = stream;
      cam.muted = true;
      cam.playsInline = true;
      cam.setAttribute("playsinline", "true");
      cam.setAttribute("webkit-playsinline", "true");
      await cam.play();
      return stream;
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error("caméra refusée");
}

export async function analyseVideo(
  video: HTMLVideoElement,
  onProgress?: (p: number, message: string) => void,
): Promise<Sample[]> {
  const samples: Sample[] = [];
  video.muted = true;
  await waitMeta(video);
  const longClip = (video.duration || 0) > 20;
  video.playbackRate = longClip ? Math.max(CALIB_RATE, 4) : CALIB_RATE;
  await video.play();
  const aspect = video.videoWidth / (video.videoHeight || 1);
  await new Promise<void>((resolve) => {
    let lastT = -1;
    let lastKept = Number.NEGATIVE_INFINITY;
    const step = () => {
      if (video.ended) return resolve();
      if (video.readyState >= 2 && video.currentTime !== lastT) {
        lastT = video.currentTime;
        if (lastT - lastKept >= SAMPLE_DT) {
          lastKept = lastT;
          const res = detect(video);
          const lm = res?.landmarks?.[0];
          if (lm) samples.push({ t: lastT, a: angles(lm, aspect), lm: lm.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility })) });
        }
        onProgress?.(lastT / (video.duration || 1), "Calibration de l'aura du modèle…");
      }
      requestAnimationFrame(step);
    };
    video.addEventListener("ended", () => resolve(), { once: true });
    step();
  });
  video.pause();
  video.playbackRate = 1;
  if (samples.length < 10) throw new Error("modèle introuvable dans la vidéo");
  return samples;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

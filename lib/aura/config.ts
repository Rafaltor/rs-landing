export const WINDOW_MS = 700;
export const LAG = 0.45;
export const TOLERANCE_DEG = 50;
export const PICTO_LEAD = 1.2;
export const CALIB_RATE = 1;
/** Une pose toutes les 100 ms suffit au scoring (fenêtre 0,5 s) et tient dans Postgres. */
export const SAMPLE_DT = 0.1;
export const SAMPLE_UPSERT_CHUNK = 200;

export const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
export const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";

export const JOINTS = {
  lElbow: [11, 13, 15],
  rElbow: [12, 14, 16],
  lShoulder: [23, 11, 13],
  rShoulder: [24, 12, 14],
  lHip: [11, 23, 25],
  rHip: [12, 24, 26],
  lKnee: [23, 25, 27],
  rKnee: [24, 26, 28],
} as const;

export const SWAP: Record<keyof typeof JOINTS, keyof typeof JOINTS> = {
  lElbow: "rElbow",
  rElbow: "lElbow",
  lShoulder: "rShoulder",
  rShoulder: "lShoulder",
  lHip: "rHip",
  rHip: "lHip",
  lKnee: "rKnee",
  rKnee: "lKnee",
};

export const BONES: [number, number][] = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
];

export const JUDGMENTS = [
  { min: 0.8, word: "Mog parfait", aura: 1000, bad: false },
  { min: 0.62, word: "Propre", aura: 500, bad: false },
  { min: 0.42, word: "Moyen", aura: 100, bad: false },
  { min: 0, word: "Aura loss", aura: -300, bad: true },
] as const;

export const RANKS = [
  { min: 80, name: "Roi du mog", text: "Le trône vacille. Le modèle a trouvé son égal." },
  { min: 60, name: "Mogueur licencié", text: "Tu connais les lois de la jungle. Encore une session d'aura maxing." },
  { min: 40, name: "Civil éveillé", text: "L'aura est là, quelque part. Elle n'est pas encore sortie." },
  { min: 0, name: "NPC", text: "La revanche est un droit sacré. Rejoue." },
] as const;

export type MoveDef = { slug: string; src: string; title: string };

export const MOVES: MoveDef[] = [
  { slug: "move1", src: "/moves/move1.mp4", title: "Move 1" },
  { slug: "move2", src: "/moves/move2.mp4", title: "Move 2" },
  { slug: "move3", src: "/moves/move3.mp4", title: "Move 3" },
  { slug: "move4", src: "/moves/move4.mp4", title: "Move 4" },
  { slug: "move5", src: "/moves/move5.mp4", title: "Move 5" },
  { slug: "move6", src: "/moves/move6.mp4", title: "Move 6" },
  { slug: "move7", src: "/moves/move7.mp4", title: "Move 7" },
  { slug: "move8", src: "/moves/move8.mp4", title: "Move 8" },
  { slug: "move9", src: "/moves/move9.mp4", title: "Move 9" },
  { slug: "move10", src: "/moves/move10.mp4", title: "Move 10" },
  { slug: "move11", src: "/moves/move11.mp4", title: "Move 11" },
  { slug: "move12", src: "/moves/move12.mp4", title: "Move 12" },
  { slug: "move13", src: "/moves/move13.mp4", title: "Move 13" },
  { slug: "move14", src: "/moves/move14.mp4", title: "Move 14" },
  { slug: "move15", src: "/moves/move15.mp4", title: "Move 15" },
];

export const SYNTHETIC_DURATION = 6;

export const ROYALE: MoveDef = {
  slug: "royale",
  src: "/moves/royale.mp4",
  title: "Battle Royale",
};

/** Durée de repli (~2 min 51, IMG_0139) si la vidéo n’a pas encore de metadata. */
export const ROYALE_DURATION_FALLBACK = 171;

export type RoyaleWave = { frac: number; keep: number };

/** Coupes Fall Guys : du lobby vers 1 survivant, jusqu’à 7 vagues. */
export function royaleWaves(playerCount: number): RoyaleWave[] {
  const n = Math.max(1, playerCount);
  if (n <= 1) return [{ frac: 1, keep: 1 }];
  const waves = Math.min(7, n - 1);
  const raw: RoyaleWave[] = [];
  for (let i = 1; i <= waves; i++) {
    raw.push({
      frac: i / waves,
      keep: i === waves ? 1 : Math.max(1, Math.round(n * (1 - i / waves))),
    });
  }
  const out: RoyaleWave[] = [];
  let prev = n;
  for (const w of raw) {
    const keep = Math.max(1, Math.min(w.keep, prev - 1));
    if (keep >= prev) continue;
    out.push({ frac: w.frac, keep });
    prev = keep;
    if (prev === 1) break;
  }
  if (!out.length || out[out.length - 1].keep !== 1) {
    out.push({ frac: 1, keep: 1 });
  }
  return out;
}

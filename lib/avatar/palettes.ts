/** Teintes peau — source mii-corporate-3d.html */
export const SKIN = [
  0xffe0c7, 0xf6cda6, 0xe3b282, 0xc08a5a, 0x8c5a36, 0x5e3b22,
] as const;

/** Couleurs cheveux */
export const HAIRC = [
  0x211c18, 0x4b3320, 0x8a5a33, 0xc79a54, 0xb7bdc3, 0xe7e2d6, 0xa23b2f,
  0x3f6fbf,
] as const;

/** Costumes / vestes */
export const SUIT = [
  0x22344f, 0x3a3f47, 0x586571, 0x6d4b3a, 0x2f4f43, 0x5e2b39, 0x7a3d6b,
  0xb5b8bd, 0x8c9299, 0x5a1e2d, 0x1f3d2f, 0xa9763f, 0x4a7ba6, 0x1a1d22,
] as const;

/** Chemises */
export const SHIRT = [
  0xffffff, 0xe7f0fb, 0xdde5ec, 0xf3ece1, 0xd8b7c6,
] as const;

/** Accessoires (cravate, badge, etc.) */
export const ACCC = [
  0xb23b3b, 0x2c7fb8, 0xd8a33b, 0x3f8f57, 0x7c54ad, 0xc85a86,
] as const;

export const BODIES = ["Homme", "Femme"] as const;

export const HAIRS = [
  "Court",
  "Soigné (raie)",
  "Hérissé",
  "Bouclé",
  "Carré (bob)",
  "Long",
  "Queue de cheval",
  "Chignon",
  "Couettes",
  "Crête",
  "Afro",
  "Dégarni",
] as const;

export const EYESL = [
  "Ronds",
  "Points",
  "Ovales",
  "Amande",
  "Mi-clos",
  "Grands",
  "Tombants",
  "Relevés",
  "Étonnés",
  "Bridés",
] as const;

export const NOSES = [
  "Petit",
  "Pointu",
  "Rond",
  "Retroussé",
  "Aquilin",
  "Large",
  "Aucun",
] as const;

/** 0 = Cravate, 1 = Nœud pap', 2 = Badge, 3 = Aucun */
export const ACCS = ["Cravate", "Nœud pap'", "Badge", "Aucun"] as const;

export type AvatarConfig = {
  body: number;
  skin: number;
  hair: number;
  hairColor: number;
  eyes: number;
  nose: number;
  glasses: boolean;
  suit: number;
  shirt: number;
  acc: number;
  accColor: number;
  /** Pseudo affiché au-dessus du stagiaire dans le salon. */
  pseudo: string;
};

/** Look corporate soigné par défaut (HTML source). */
export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  body: 0,
  skin: 1,
  hair: 1,
  hairColor: 1,
  eyes: 0,
  nose: 0,
  glasses: true,
  suit: 0,
  shirt: 0,
  acc: 0,
  accColor: 1,
  pseudo: "",
};

export function paletteIndex<T extends readonly unknown[]>(
  list: T,
  index: number,
): number {
  if (list.length === 0) return 0;
  return ((index % list.length) + list.length) % list.length;
}

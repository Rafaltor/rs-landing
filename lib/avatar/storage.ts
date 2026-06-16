import { DEFAULT_AVATAR_CONFIG, type AvatarConfig } from "./palettes";
import { normalizeAvatarConfig as normalizeCfg } from "./avatarConfig";

export const AVATAR_STORAGE_KEY = "rs-avatar";

export const AVATAR_CHANGED_EVENT = "rs-avatar-changed";

export type AvatarChangedDetail = {
  cfg: AvatarConfig;
};

export type AvatarChangedEvent = CustomEvent<AvatarChangedDetail>;

let memoryStore: AvatarConfig | null = null;

function isLocalStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const probe = "__rs_avatar_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function isAvatarConfig(value: unknown): value is AvatarConfig {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.body === "number" &&
    typeof v.skin === "number" &&
    typeof v.hair === "number" &&
    typeof v.hairColor === "number" &&
    typeof v.eyes === "number" &&
    typeof v.nose === "number" &&
    typeof v.glasses === "boolean" &&
    typeof v.suit === "number" &&
    typeof v.shirt === "number" &&
    typeof v.acc === "number" &&
    typeof v.accColor === "number" &&
    (v.pseudo === undefined || typeof v.pseudo === "string")
  );
}

function normalizeAvatarConfig(cfg: AvatarConfig): AvatarConfig {
  return normalizeCfg(cfg);
}

function readFromLocalStorage(): AvatarConfig | null {
  if (!isLocalStorageAvailable()) return null;
  const raw = window.localStorage.getItem(AVATAR_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isAvatarConfig(parsed)) return null;
    return normalizeAvatarConfig(parsed);
  } catch {
    return null;
  }
}

function writeToLocalStorage(cfg: AvatarConfig): boolean {
  if (!isLocalStorageAvailable()) return false;
  try {
    window.localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(cfg));
    return true;
  } catch {
    return false;
  }
}

/** Lit la config avatar persistée (défaut si absente ou invalide). */
export function getAvatar(): AvatarConfig {
  const fromStorage = readFromLocalStorage();
  if (fromStorage) return fromStorage;
  if (memoryStore) return memoryStore;
  return DEFAULT_AVATAR_CONFIG;
}

/** Persiste la config et notifie les écrans panorama. */
export function setAvatar(cfg: AvatarConfig): void {
  if (typeof window === "undefined") return;

  const normalized = normalizeAvatarConfig(cfg);
  const persisted = writeToLocalStorage(normalized);
  if (!persisted) {
    memoryStore = normalized;
  } else {
    memoryStore = normalized;
  }

  window.dispatchEvent(
    new CustomEvent<AvatarChangedDetail>(AVATAR_CHANGED_EVENT, {
      detail: { cfg: normalized },
    }),
  );
}

/** Abonnement aux changements d'avatar (studio → panorama). */
export function subscribeAvatarChanged(
  handler: (cfg: AvatarConfig) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const listener = (event: Event) => {
    const detail = (event as AvatarChangedEvent).detail;
    if (detail?.cfg) handler(detail.cfg);
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== AVATAR_STORAGE_KEY || !event.newValue) return;
    try {
      const parsed: unknown = JSON.parse(event.newValue);
      if (isAvatarConfig(parsed)) {
        handler(normalizeAvatarConfig(parsed));
      }
    } catch {
      // ignore invalid cross-tab payload
    }
  };

  window.addEventListener(AVATAR_CHANGED_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(AVATAR_CHANGED_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

import { AvatarScene } from "./AvatarScene";
import { normalizePseudo } from "./avatarConfig";
import { clearAvatarWalkMotions } from "./avatarWalkHeading";
import {
  getAvatarPlacement,
  hotspotIdForPlacement,
  subscribeAvatarPlacements,
  type AvatarPlacement,
} from "./avatarPlacements";
import { registerAvatarHotspotElement } from "@/lib/panorama/avatarHotspotElements";

export type AvatarScreenHotspotArgs = {
  id: string;
  wander?: boolean;
};

const activeScreens = new Set<AvatarScene>();
const activeCleanups = new Set<() => void>();

export function disposeAllAvatarScreens(): void {
  for (const cleanup of activeCleanups) {
    cleanup();
  }
  activeCleanups.clear();
  activeScreens.clear();
  clearAvatarWalkMotions();
}

function resolvePlacement(id: string): AvatarPlacement | null {
  return getAvatarPlacement(id) ?? null;
}

export function createAvatarScreen(
  hotSpotDiv: HTMLElement,
  args: AvatarScreenHotspotArgs,
): void {
  const placement = resolvePlacement(args.id);
  if (!placement) return;

  const ghost = args.wander !== false;

  hotSpotDiv.classList.add(
    "rs-avatar-screen",
    ghost ? "rs-avatar-screen--ghost" : "rs-avatar-screen--hero",
  );
  hotSpotDiv.style.cssText = `
    background: transparent;
    border: none;
    overflow: visible;
    pointer-events: none;
  `;

  const viewport = document.createElement("div");
  viewport.className = ghost
    ? "rs-avatar-screen__viewport rs-avatar-screen__viewport--ghost"
    : "rs-avatar-screen__viewport rs-avatar-screen__viewport--hero";
  viewport.setAttribute("aria-hidden", "true");
  hotSpotDiv.appendChild(viewport);

  const pseudoEl = document.createElement("div");
  pseudoEl.className = "rs-avatar-screen__pseudo";
  pseudoEl.setAttribute("aria-hidden", "true");
  hotSpotDiv.appendChild(pseudoEl);

  const syncPseudo = (pseudo: string) => {
    const text = normalizePseudo(pseudo);
    if (text) {
      pseudoEl.textContent = text;
      pseudoEl.hidden = false;
    } else {
      pseudoEl.textContent = "";
      pseudoEl.hidden = true;
    }
  };
  syncPseudo(placement.config.pseudo);

  registerAvatarHotspotElement(
    hotspotIdForPlacement(placement.id),
    hotSpotDiv,
    placement.pitch,
    placement.yaw,
  );

  const scene = new AvatarScene(viewport, placement.config, {
    pixelRatio: ghost ? 1.2 : 1.5,
    lite: true,
    pauseWhenHidden: false,
    walk: ghost,
    ghost,
    placementId: placement.id,
  });
  scene.mount();
  activeScreens.add(scene);

  const unsubscribe = subscribeAvatarPlacements((placements) => {
    const next = placements.find((p) => p.id === args.id);
    if (next) {
      scene.setConfig(next.config);
      syncPseudo(next.config.pseudo);
    }
  });

  const disconnectObserver = new MutationObserver(() => {
    if (!hotSpotDiv.isConnected) {
      cleanup();
    }
  });
  disconnectObserver.observe(document.body, { childList: true, subtree: true });

  const cleanup = () => {
    unsubscribe();
    disconnectObserver.disconnect();
    scene.dispose();
    activeScreens.delete(scene);
    activeCleanups.delete(cleanup);
  };

  activeCleanups.add(cleanup);
}

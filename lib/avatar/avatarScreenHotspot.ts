import { normalizePseudo } from "./avatarConfig";
import { clearAvatarWalkMotions } from "./avatarWalkHeading";
import { avatarStage, type GhostHandle } from "./avatarStage";
import {
  getAvatarPlacement,
  hotspotIdForPlacement,
  subscribeAvatarPlacements,
} from "./avatarPlacements";
import { registerAvatarHotspotElement } from "@/lib/panorama/avatarHotspotElements";

export type AvatarScreenHotspotArgs = {
  id: string;
  wander?: boolean;
};

const activeCleanups = new Set<() => void>();

export function disposeAllAvatarScreens(): void {
  for (const cleanup of activeCleanups) {
    cleanup();
  }
  activeCleanups.clear();
  clearAvatarWalkMotions();
}

/** Crée le Mii d'un hotspot Pannellum (rendu via le renderer partagé). */
export function createAvatarScreen(
  hotSpotDiv: HTMLElement,
  args: AvatarScreenHotspotArgs,
): void {
  if (hotSpotDiv.dataset.rsAvatarMounted === "1") return;

  const placement = getAvatarPlacement(args.id);
  if (!placement) return;

  hotSpotDiv.dataset.rsAvatarMounted = "1";
  hotSpotDiv.classList.add("rs-avatar-screen", "rs-avatar-screen--ghost");
  hotSpotDiv.style.cssText =
    "background:transparent;border:none;overflow:visible;pointer-events:none;";

  const viewport = document.createElement("div");
  viewport.className = "rs-avatar-screen__viewport rs-avatar-screen__viewport--ghost";
  viewport.setAttribute("aria-hidden", "true");
  hotSpotDiv.appendChild(viewport);

  const pseudoEl = document.createElement("div");
  pseudoEl.className = "rs-avatar-screen__pseudo";
  pseudoEl.setAttribute("aria-hidden", "true");
  viewport.appendChild(pseudoEl);

  const syncPseudo = (pseudo: string) => {
    const text = normalizePseudo(pseudo);
    pseudoEl.textContent = text;
    pseudoEl.hidden = text.length === 0;
  };
  syncPseudo(placement.config.pseudo);

  registerAvatarHotspotElement(
    hotspotIdForPlacement(placement.id),
    hotSpotDiv,
    placement.pitch,
    placement.yaw,
  );

  const ghostMobile =
    typeof window !== "undefined" && window.innerWidth <= 768;

  const handle: GhostHandle = avatarStage.addGhost(viewport, placement.config, {
    ghostMobile,
    placementId: placement.id,
  });

  const unsubscribe = subscribeAvatarPlacements((placements) => {
    const next = placements.find((p) => p.id === args.id);
    if (next) {
      handle.setConfig(next.config);
      syncPseudo(next.config.pseudo);
    }
  });

  const disconnectObserver = new MutationObserver(() => {
    if (!hotSpotDiv.isConnected) cleanup();
  });
  disconnectObserver.observe(document.body, { childList: true, subtree: true });

  const cleanup = () => {
    unsubscribe();
    disconnectObserver.disconnect();
    delete hotSpotDiv.dataset.rsAvatarMounted;
    handle.dispose();
    activeCleanups.delete(cleanup);
  };

  activeCleanups.add(cleanup);
}

export const PANORAMA_HARD_REFRESH_EVENT = "rs-panorama-hard-refresh";

/** Reconstruit le viewer Pannellum (après fermeture du studio WebGL). */
export function requestPanoramaHardRefresh(): void {
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent(PANORAMA_HARD_REFRESH_EVENT));
  }, 64);
}

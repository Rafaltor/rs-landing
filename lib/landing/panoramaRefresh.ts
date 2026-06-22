export const PANORAMA_REFRESH_EVENT = "rs-panorama-refresh";

/** Relance le rendu Pannellum (ex. après fermeture du studio WebGL). */
export function requestPanoramaRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PANORAMA_REFRESH_EVENT));
}

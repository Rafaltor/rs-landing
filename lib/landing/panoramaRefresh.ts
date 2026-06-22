export const PANORAMA_SOFT_REFRESH_EVENT = "rs-panorama-soft-refresh";

/** Relance le rendu Pannellum sans recréer le viewer (évite d'épuiser WebGL). */
export function requestPanoramaSoftRefresh(): void {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    window.dispatchEvent(new CustomEvent(PANORAMA_SOFT_REFRESH_EVENT));
  });
}

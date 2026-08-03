/** URL canonique du site (apex, sans slash final). */
export function getCanonicalSiteUrl(): URL | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw.replace(/\/$/, ""));
  } catch {
    return null;
  }
}

export function getSiteName(): string {
  return process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "Landing 360°";
}

export function getPanoramaPath(): string {
  const path = process.env.NEXT_PUBLIC_PANORAMA_URL?.trim();
  if (!path) return "/background360.jpg";
  return path.startsWith("/") ? path : `/${path}`;
}

/** Hostname apex (sans www.) pour redirects www → canonique. */
export function getApexHostname(): string | null {
  const site = getCanonicalSiteUrl();
  if (!site) return null;
  return site.hostname.replace(/^www\./i, "");
}

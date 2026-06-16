export const OAUTH_RETURN_COOKIE = "rs_oauth_return";

/** Chemin interne uniquement (évite les open redirects). */
export function safeReturnPath(value: string | undefined | null): string {
  if (!value) return "/";
  try {
    const decoded = decodeURIComponent(value);
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return "/";
    return decoded;
  } catch {
    return "/";
  }
}

/** Origine canonique pour le callback OAuth (prod Vercel + localhost). */
export function getOAuthAppOrigin(): string {
  if (typeof window === "undefined") return "";

  const { hostname, origin } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  if (isLocal) return origin;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (siteUrl) {
    try {
      if (new URL(siteUrl).hostname === hostname) return siteUrl;
    } catch {
      /* ignore */
    }
  }

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (vercelUrl) {
    const resolved = vercelUrl.startsWith("http")
      ? vercelUrl
      : `https://${vercelUrl}`;
    try {
      if (new URL(resolved).hostname === hostname) {
        return resolved.replace(/\/$/, "");
      }
    } catch {
      /* ignore */
    }
  }

  return origin;
}

export function buildOAuthReturnPath(includeStudio = false): string {
  if (typeof window === "undefined") return "/";

  const params = new URLSearchParams(window.location.search);
  if (includeStudio) params.set("studio", "mii");
  const qs = params.toString();
  return qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
}

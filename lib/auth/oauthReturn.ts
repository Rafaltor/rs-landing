import type { NextRequest } from "next/server";

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

function devOAuthOriginOverride(): string | undefined {
  if (process.env.NODE_ENV !== "development") return undefined;
  const origin =
    process.env.OAUTH_CALLBACK_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_OAUTH_CALLBACK_ORIGIN?.trim();
  return origin?.replace(/\/$/, "");
}

/** Origine du callback pour une requête entrante (route handler / API). */
export function resolveRequestOrigin(request: NextRequest): string {
  const devOverride = devOAuthOriginOverride();
  if (devOverride) return devOverride;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;

  return new URL(request.url).origin;
}

/** Origine côté navigateur (fallback si pas de route serveur). */
export function getOAuthAppOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function buildOAuthReturnPath(includeStudio = false): string {
  if (typeof window === "undefined") return "/";

  const params = new URLSearchParams(window.location.search);
  if (includeStudio) params.set("studio", "mii");
  const qs = params.toString();
  return qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
}

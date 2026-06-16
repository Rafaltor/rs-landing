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

/** Origine du callback pour une requête entrante (route handler / API). */
export function resolveRequestOrigin(request: NextRequest): string {
  const envOrigin = process.env.NEXT_PUBLIC_OAUTH_CALLBACK_ORIGIN?.trim();
  if (envOrigin) return envOrigin.replace(/\/$/, "");

  const { origin } = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (isLocalEnv) return origin;
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;
  return origin;
}

/** Origine côté navigateur (fallback si pas de route serveur). */
export function getOAuthAppOrigin(): string {
  if (typeof window === "undefined") return "";

  const envOrigin = process.env.NEXT_PUBLIC_OAUTH_CALLBACK_ORIGIN?.trim();
  if (envOrigin) return envOrigin.replace(/\/$/, "");

  return window.location.origin;
}

export function buildOAuthReturnPath(includeStudio = false): string {
  if (typeof window === "undefined") return "/";

  const params = new URLSearchParams(window.location.search);
  if (includeStudio) params.set("studio", "mii");
  const qs = params.toString();
  return qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
}

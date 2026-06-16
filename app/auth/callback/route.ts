import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const RETURN_COOKIE = "rs_oauth_return";

/** Chemin interne uniquement (évite les open redirects). */
function safeReturnPath(value: string | undefined): string {
  if (!value) return "/";
  try {
    const decoded = decodeURIComponent(value);
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return "/";
    return decoded;
  } catch {
    return "/";
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(RETURN_COOKIE)?.value;
  const fromQuery = searchParams.get("next") ?? undefined;
  const returnPath = safeReturnPath(fromCookie ?? fromQuery);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(`${origin}${returnPath}`);
      response.cookies.set(RETURN_COOKIE, "", { path: "/", maxAge: 0 });
      return response;
    }
  }

  const response = NextResponse.redirect(`${origin}/?auth=error`);
  response.cookies.set(RETURN_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

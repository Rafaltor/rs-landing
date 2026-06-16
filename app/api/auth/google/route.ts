import {
  OAUTH_RETURN_COOKIE,
  resolveRequestOrigin,
  safeReturnPath,
} from "@/lib/auth/oauthReturn";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Supabase non configuré" },
      { status: 500 },
    );
  }

  const returnPath = safeReturnPath(request.nextUrl.searchParams.get("next"));
  const origin = resolveRequestOrigin(request);
  const redirectTo = `${origin}/auth/callback`;

  let cookieResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/?auth=error", request.url));
  }

  const response = NextResponse.redirect(data.url);
  cookieResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });
  response.cookies.set(OAUTH_RETURN_COOKIE, encodeURIComponent(returnPath), {
    path: "/",
    maxAge: 600,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
  });

  return response;
}

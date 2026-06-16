import {
  OAUTH_RETURN_COOKIE,
  safeReturnPath,
} from "@/lib/auth/oauthReturn";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function redirectTarget(request: NextRequest, path: string): string {
  const { origin } = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (isLocalEnv) return `${origin}${path}`;
  if (forwardedHost) return `https://${forwardedHost}${path}`;
  return `${origin}${path}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  const fromCookie = request.cookies.get(OAUTH_RETURN_COOKIE)?.value;
  const fromQuery = searchParams.get("next");
  const returnPath = safeReturnPath(fromCookie ?? fromQuery);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!code || !supabaseUrl || !supabaseKey) {
    const response = NextResponse.redirect(
      redirectTarget(request, "/?auth=error"),
    );
    response.cookies.set(OAUTH_RETURN_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }

  let response = NextResponse.redirect(redirectTarget(request, returnPath));

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    response = NextResponse.redirect(redirectTarget(request, "/?auth=error"));
  }

  response.cookies.set(OAUTH_RETURN_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

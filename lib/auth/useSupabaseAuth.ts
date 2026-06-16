"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  buildOAuthReturnPath,
  OAUTH_RETURN_COOKIE,
} from "@/lib/auth/oauthReturn";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

function setOAuthReturnCookie(returnPath: string): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${OAUTH_RETURN_COOKIE}=${encodeURIComponent(returnPath)}; Path=/; Max-Age=600; SameSite=Lax${secure}`;
}

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => {
    if (!isSupabaseConfigured()) return null;
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) {
        setUser(data.user ?? null);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithGoogle = useCallback(() => {
    const returnPath = buildOAuthReturnPath(true);
    setOAuthReturnCookie(returnPath);
    const next = encodeURIComponent(returnPath);
    window.location.assign(`/api/auth/google?next=${next}`);
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, [supabase]);

  return {
    user,
    loading,
    configured: Boolean(supabase),
    signInWithGoogle,
    signOut,
  };
}

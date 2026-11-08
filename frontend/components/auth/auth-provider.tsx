"use client";

import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { STORAGE_KEYS } from "@/lib/config";
import { getSupabase } from "@/lib/supabase/client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function clearLocalState() {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Storage blocked: nothing to clear.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabase();
    // getUser() checks the session with Supabase instead of trusting the cookie.
    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (event === "SIGNED_OUT") clearLocalState();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    clearLocalState();
    // The proxy also runs on client navigations, so it sees the cleared cookie.
    router.replace("/login");
    router.refresh();
  }, [router]);

  const value = useMemo(() => ({ user, loading, signOut }), [user, loading, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

/** Display name and avatar from the Supabase user (Google fills these in). */
export function userProfile(user: User) {
  const meta = user.user_metadata ?? {};
  const name: string = meta.full_name ?? meta.name ?? user.email?.split("@")[0] ?? "Account";
  const avatarUrl: string | undefined = meta.avatar_url ?? meta.picture;
  const initials = name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return { name, email: user.email ?? "", avatarUrl, initials: initials || "?" };
}

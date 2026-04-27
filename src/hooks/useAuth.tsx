import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "doctor" | "nurse";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  profile: { full_name: string; avatar_url: string | null } | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

// Fallback mock — used only when no real Supabase session is available.
const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";
const MOCK_USER = {
  id: MOCK_USER_ID,
  email: "dr.laine@clinic.local",
  app_metadata: {},
  user_metadata: { full_name: "Dr. Laine" },
  aud: "authenticated",
  created_at: new Date().toISOString(),
} as unknown as User;

const MOCK_SESSION = {
  access_token: "mock",
  refresh_token: "mock",
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: "bearer",
  user: MOCK_USER,
} as unknown as Session;

const DEFAULT_CONTEXT: AuthContextType = {
  session: MOCK_SESSION,
  user: MOCK_USER,
  role: "doctor",
  profile: { full_name: "Dr. Laine", avatar_url: null },
  loading: false,
  signOut: async () => {
    await supabase.auth.signOut().catch(() => {});
  },
};

const AuthContext = createContext<AuthContextType>(DEFAULT_CONTEXT);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(MOCK_SESSION);
  const [user, setUser] = useState<User | null>(MOCK_USER);
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(
    DEFAULT_CONTEXT.profile,
  );

  useEffect(() => {
    // Pick up the real Supabase session if one exists, so writes pass RLS.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setSession(data.session);
        setUser(data.session.user);
        const meta = data.session.user.user_metadata as { full_name?: string; avatar_url?: string | null } | null;
        setProfile({
          full_name: meta?.full_name || "Dr. Laine",
          avatar_url: meta?.avatar_url ?? null,
        });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s?.user) {
        setSession(s);
        setUser(s.user);
        const meta = s.user.user_metadata as { full_name?: string; avatar_url?: string | null } | null;
        setProfile({
          full_name: meta?.full_name || "Dr. Laine",
          avatar_url: meta?.avatar_url ?? null,
        });
      } else {
        setSession(MOCK_SESSION);
        setUser(MOCK_USER);
        setProfile(DEFAULT_CONTEXT.profile);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthContextType = {
    session,
    user,
    role: "doctor",
    profile,
    loading: false,
    signOut: async () => {
      await supabase.auth.signOut().catch(() => {});
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

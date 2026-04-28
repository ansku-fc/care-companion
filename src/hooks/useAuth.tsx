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
  session: null,
  user: null,
  role: "doctor",
  profile: { full_name: "Dr. Laine", avatar_url: null },
  loading: true,
  signOut: async () => {
    await supabase.auth.signOut().catch(() => {});
  },
};

const AuthContext = createContext<AuthContextType>(DEFAULT_CONTEXT);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Start with NO session — components must wait for auth to resolve before
  // writing. Otherwise writes get stamped with the mock UUID and RLS hides
  // the rows from the real user, which manifests as "data disappears on
  // reload" in Preview.
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile] = useState<{ full_name: string; avatar_url: string | null } | null>(
    DEFAULT_CONTEXT.profile,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // CRITICAL: subscribe BEFORE getSession() so the initial SIGNED_IN event
    // isn't missed. Do NOT await any Supabase call inside this callback — it
    // can deadlock subsequent auth events.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s?.user) {
        setSession(s);
        setUser(s.user);
      } else {
        // No real session — fall back to mock so the demo UI still renders
        // for fully unauthenticated previews.
        setSession(MOCK_SESSION);
        setUser(MOCK_USER);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setSession(data.session);
        setUser(data.session.user);
      } else {
        setSession(MOCK_SESSION);
        setUser(MOCK_USER);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthContextType = {
    session,
    user,
    role: "doctor",
    profile,
    loading,
    signOut: async () => {
      await supabase.auth.signOut().catch(() => {});
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

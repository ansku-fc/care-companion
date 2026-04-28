import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "doctor" | "nurse";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  profile: { full_name: string; avatar_url: string | null } | null;
  isAuthenticated: boolean | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const DEFAULT_PROFILE = { full_name: "Dr. Laine", avatar_url: null };

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: "doctor",
  profile: DEFAULT_PROFILE,
  isAuthenticated: null,
  loading: true,
  signOut: async () => {
    await supabase.auth.signOut().catch(() => {});
  },
});

export const useAuth = () => useContext(AuthContext);

function checkAuth(s: Session | null): boolean {
  return !!s?.user?.email;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(
    DEFAULT_PROFILE,
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const apply = (s: Session | null) => {
      setSession(s);
      setUser(s?.user ?? null);
      setIsAuthenticated(checkAuth(s));
      if (s?.user?.email) {
        setTimeout(() => {
          supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", s.user.id)
            .maybeSingle()
            .then(({ data }) => {
              if (data)
                setProfile({
                  full_name: data.full_name || "Dr. Laine",
                  avatar_url: data.avatar_url,
                });
            });
        }, 0);
      } else {
        setProfile(DEFAULT_PROFILE);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => apply(s));
    supabase.auth.getSession().then(({ data }) => apply(data.session));

    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        role: "doctor",
        profile,
        isAuthenticated,
        loading: isAuthenticated === null,
        signOut: async () => {
          await supabase.auth.signOut().catch(() => {});
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

import { createContext, useContext, ReactNode } from "react";
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

// Mock Dr. Laine — auth is bypassed for now.
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

const MOCK_CONTEXT: AuthContextType = {
  session: MOCK_SESSION,
  user: MOCK_USER,
  role: "doctor",
  profile: { full_name: "Dr. Laine", avatar_url: null },
  loading: false,
  signOut: async () => {
    await supabase.auth.signOut().catch(() => {});
  },
};

const AuthContext = createContext<AuthContextType>(MOCK_CONTEXT);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={MOCK_CONTEXT}>{children}</AuthContext.Provider>;
}

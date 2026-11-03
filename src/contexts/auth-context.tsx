import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { ProfileRow, Role } from "@/lib/portal-types";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: ProfileRow | null;
  role: Role | null;
  loading: boolean;
  canEdit: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadProfile(userId: string): Promise<ProfileRow | null> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data, error } = await supabase
      .from("portal_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (!error && data) return data;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const applySession = (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (!nextSession?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setTimeout(() => {
        void loadProfile(nextSession.user.id).then((nextProfile) => {
          if (!active) return;
          setProfile(nextProfile);
          setLoading(false);
        });
      }, 0);
    };

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    // A session delivered in the URL hash (OAuth or link handoff) arrives
    // after the first getSession() call. Wait for it instead of bouncing to
    // the login screen before it is processed.
    const hashHasSession =
      typeof window !== "undefined" && /(access_token|refresh_token)=/.test(window.location.hash);

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        applySession(data.session);
        return;
      }
      if (hashHasSession) {
        window.setTimeout(() => {
          if (active) applySession(null);
        }, 2500);
        return;
      }
      applySession(null);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName },
      },
    });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const role = (profile?.role as Role | undefined) ?? null;
    return {
      user,
      session,
      profile,
      role,
      loading,
      canEdit: role === "admin" || role === "editor",
      isAdmin: role === "admin",
      signIn,
      signUp,
      signOut,
    };
  }, [user, session, profile, loading, signIn, signUp, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}

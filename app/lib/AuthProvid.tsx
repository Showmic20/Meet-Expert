// lib/AuthProvid.tsx  (your AuthProvider2)
import { PropsWithChildren, createContext, useContext, useEffect, useState } from "react";
import supabase from "./superbase";
import { Session } from "@supabase/supabase-js";

type AuthData = {
  session: Session | null;
  loading: boolean;            // auth loading
  onboarded: boolean;          // from DB
  profileLoading: boolean;     // users row loading
  setOnboarded: (v: boolean) => void;
  refreshProfile: () => Promise<void>;       // auth/session loading
  onboarded: boolean;          // from DB
  profileLoading: boolean;     // users row loading
  setOnboarded: (v: boolean) => void;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthData>({
  session: null, loading: true,
  onboarded: false, profileLoading: true,
  setOnboarded: () => {}, refreshProfile: async () => {}
});

export default function AuthProvider2({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session|null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  async function ensureUserRow(userId: string) {
    await supabase.from("users").upsert({
      id: userId,
      first_name: "Unknown",
      last_name: "Unknown",
    }, { onConflict: "id" });
  }

  async function loadProfile(userId: string) {
    setProfileLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("has_onboarded")
      .eq("id", userId)
      .maybeSingle();
    if (!error && data) setOnboarded(!!data.has_onboarded);
    setProfileLoading(false);
  }

  const refreshProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await loadProfile(user.id);
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);

      const userId = data.session?.user?.id;
      if (userId) {
        await ensureUserRow(userId);
        await loadProfile(userId);
      } else {
        setProfileLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(prev => prev?.access_token === newSession?.access_token ? prev : newSession);
      const userId = newSession?.user?.id;
      if (userId) {
        await ensureUserRow(userId);
        await loadProfile(userId);
      } else {
        setOnboarded(false);
        setProfileLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription?.unsubscribe?.();
    };
  }, []);

  return (
    <AuthContext.Provider value={{
      session, loading, onboarded, profileLoading,
      setOnboarded, refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

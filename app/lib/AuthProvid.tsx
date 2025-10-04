// lib/AuthProvid.tsx  (your AuthProvider2)
import { PropsWithChildren, createContext, useContext, useEffect, useState } from "react";
import supabase from "./superbase";
import { Session } from "@supabase/supabase-js";

type AuthData = {
     session: Session | null;
     loading : boolean;
     // auth/session loading
     onboarded: boolean; // 🔹 new 
     setOnboarded: (v: boolean) => void;

}
const AuthContext = createContext<AuthData>({session:null, loading: true, onboarded: false, setOnboarded:() =>{},});

export default function AuthProvider2({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session|null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);


  // async function loadProfile(userId: string) {
  //   setProfileLoading(true);
  //   const { data, error } = await supabase
  //     .from("users")
  //     .select("has_onboarded")
  //     .eq("id", userId)
  //     .maybeSingle();
  //   if (!error && data) setOnboarded(!!data.has_onboarded);
  //   setProfileLoading(false);
  // }

  // const refreshProfile = async () => {
  //   const { data: { user } } = await supabase.auth.getUser();
  //   if (user) await loadProfile(user.id);
  // };


async function ensureUserRow(userId: string) {
  const { data, error } = await supabase.from("users").upsert({
    id: userId,
    first_name: "Unknown",
    last_name: "Unknown",
  //  has_onboarded: false,  // Make sure we set the default value
  }, {  onConflict: "id", ignoreDuplicates: true });


  if (error) {
    console.error("Error creating user profile:", error);
  } else {
    console.log("User profile ensured:", data);
  }
}

useEffect(() => {
  let mounted = true;

  // Initial session load
  (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(data.session);
      console.log("initial load session ",data.session);
      if (data.session?.user) {
        await ensureUserRow(data.session.user.id);

        const { data: profile, error } = await supabase
          .from("users")
          .select("has_onboarded")
          .eq("id", data.session.user.id)
          .maybeSingle();
          console.log("Database response for has_onboarded:", profile);

        if (!error && profile) setOnboarded(!!profile.has_onboarded);
        else setOnboarded(false);
      } 
      else {
        setOnboarded(false);
      }
    } catch (e) {
      console.error("Initial session load error:", e);
      setOnboarded(false);
    } finally {
      setLoading(false);
    }
  })();

  // Listen to auth state changes
  const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
    (async () => {
      try {
        setSession(newSession);
        console.log("new load session ",sub);
        
        if (newSession?.user) {
          await ensureUserRow(newSession.user.id);

          const { data: profile, error } = await supabase
            .from("users")
            .select("has_onboarded")
            .eq("id", newSession.user.id)
            .maybeSingle();

          if (!error && profile) setOnboarded(!!profile.has_onboarded);
          else setOnboarded(false);

        } 
        else {
          setOnboarded(false);
        }
      } catch (e) {
        console.error("Auth state change error:", e);
        setOnboarded(false);
      }
    })();
  });

  return () => {
    mounted = false;
    sub.subscription?.unsubscribe?.();
  };
}, []);


return ( <AuthContext.Provider value={{session,loading,onboarded, setOnboarded }}>
   {children} 
   </AuthContext.Provider> ); }

export const useAuth = () => useContext(AuthContext);
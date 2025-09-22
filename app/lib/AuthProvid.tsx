import { PropsWithChildren, createContext, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";  // For showing logout confirmation alert
import supabase from "./superbase";
import { Session } from "@supabase/supabase-js";

// Define the AuthData type (optional, for better types in your app)
type AuthData = {
     session: Session | null;
     loading : boolean;


};

const AuthContext = createContext<AuthData>({session:null, loading: true});

export default function AuthProvider2({ children }: PropsWithChildren) {
     const [session, setSession] = useState<Session|null>(null);
     const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      console.log("Session data:", data);
      setSession (data.session);
      setLoading(false);
    };
    fetchSession();

    supabase.auth.onAuthStateChange((_event, session)=>{
     setSession(session);
    });

}, []);

  const logout = async () => {
    try {
      // Call the Supabase signOut function to clear the session
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error logging out:", error.message);
      } else {
        // Optionally, you can show a success message
        Alert.alert("Logged out fsfhhsf!");
        console.log("User logged out");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  return (
    <AuthContext.Provider value={{session,loading}}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
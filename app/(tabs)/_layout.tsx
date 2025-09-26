import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { supabase } from "../lib/superbase";   // adjust path
import { useAuth } from "../lib/AuthProvid";
import { Provider } from "react-native-paper/lib/typescript/core/settings";
import { PaperProvider } from "react-native-paper";

export default function TabsLayout() {
  const { session, loading } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checking, setChecking] = useState(true);

  // useEffect(() => {
  //   const checkOnboard = async () => {
  //     if (!session?.user) {
  //       setChecking(false);
  //       return;
  //     }
  //     const { data } = await supabase
  //       .from("users")
  //       .select("has_onboarded")
  //       .eq("id", session.user.id)
  //       .single();
  //     setNeedsOnboarding(!data?.has_onboarded);
  //     setChecking(false);
  //   };
  //   checkOnboard();
  // }, [session]);

  // if (loading || checking) return null; // or a splash screen

  // if (!session) return <Redirect href="/(auth)/login" />;

  // if (needsOnboarding) return <Redirect href="/(auth)/onBoarding" />;

  return (
  <PaperProvider>
    <Tabs>
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
    </PaperProvider>
  );
}

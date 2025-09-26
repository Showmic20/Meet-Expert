import { Tabs, Redirect, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { IconButton } from "react-native-paper";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/superbase";
import { useAuth } from "../../lib/AuthProvid";

export default function TabsLayout() {
  const { session, loading } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigation: any = useNavigation();

  // if (loading || checking) return null;
  // if (!session) return <Redirect href="/(auth)/login" />;
  // if (needsOnboarding) return <Redirect href="/(auth)/onBoarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,   // 👈 enable header
        headerTitleAlign: "center",
        headerLeft: () => (
          <IconButton
            icon="menu"
            size={22}
            onPress={() => navigation.openDrawer()} // 👈 opens drawer
          />
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

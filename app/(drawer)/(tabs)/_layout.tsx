import { Tabs, Redirect, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { IconButton } from "react-native-paper";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/superbase";
import { useAuth } from "../../lib/AuthProvid";
import { useLanguage } from '../../lib/LanguageContext';

export default function TabsLayout() {
  const { t } = useLanguage();
  const { session, loading } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigation: any = useNavigation();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,   
        headerTitleAlign: "center",
        headerLeft: () => (
          <IconButton
            icon="menu"
            size={22}
            onPress={() => navigation.openDrawer()} 
          />
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('home'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t('chat'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
       <Tabs.Screen name="user/[id]" options={{ href: null, headerShown:false }} />
         <Tabs.Screen name="chats/[id]" options={{ href: null, headerShown:false }} />
    </Tabs>
  );
}

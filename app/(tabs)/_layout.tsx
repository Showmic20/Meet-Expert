// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from '@expo/vector-icons'

export default function TabsLayout() {
  return (
    <Tabs>
      {/* These names must match files INSIDE app/(tabs)/ */}
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
  );
}

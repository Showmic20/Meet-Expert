import React, { useEffect, useState } from "react";
import { supabase } from "./lib/superbase";  // Import supabase client
import { Stack, Redirect } from "expo-router";  // Redirect for navigation
import { AuthProvider } from "./lib/authContext";  // Import AuthProvider
import { Text, View } from "react-native";  // Import Text and View components for rendering
import AuthProvider2 from "./lib/AuthProvid";

const RootLayout = () => {
  const [session, setSession] = useState<any>(null);  // State to store the session

 
  return (
    <AuthProvider2>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />  {/* Login/signup screens */}
        <Stack.Screen name="(tabs)" />  {/* Tabs screen */}
      </Stack>
    </AuthProvider2>
  );
};

export default RootLayout;
  
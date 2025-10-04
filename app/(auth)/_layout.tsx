import React, { useEffect } from "react";
import { useAuth } from "../lib/AuthProvid";
import { router, Stack } from "expo-router";

export default function AuthLayout() {
  const { session, loading, onboarded } = useAuth();

  // Always call hooks first
  useEffect(() => {
    if (loading || onboarded === null) return; // wait until data is loaded

    if (!session) {
      router.replace("/(auth)/login");
    } else if (!onboarded) {
      router.replace("/(auth)/onboarding");
    } else {
      router.replace("/(tabs)/home");
    }
  }, [loading, session, onboarded]);

  // Conditional rendering is fine here
  if (loading || onboarded === null) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
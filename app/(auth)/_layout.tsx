// app/(auth)/_layout.tsx
import { Stack, usePathname, router } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "../lib/AuthProvid";

export default function AuthLayout() {
  const { session, loading, onboarded, profileLoading } = useAuth();
  const pathname = usePathname();
  const isOnboarding = pathname === "/(auth)/onboarding";

  useEffect(() => {
    if (loading || profileLoading) return;

    if (session) {
      if (!onboarded && !isOnboarding) {
        router.replace("/(auth)/onboarding");
      } else if (onboarded && isOnboarding) {
        router.replace("/(tabs)/home");
      }
    }
  }, [session, loading, profileLoading, onboarded, isOnboarding]);

  if (loading || profileLoading) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}

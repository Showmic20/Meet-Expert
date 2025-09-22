import { Redirect, Stack } from "expo-router";
import { useAuth } from "../lib/AuthProvid";

export default function AuthLayout() {
  const { session } = useAuth();  // Access session from the AuthContext

  // Redirect user to home if they are already logged in
  if (session) {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <>
      {/* If no session, show the login/signup screens */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="onboarding" />

      </Stack>
    </>
  );
}

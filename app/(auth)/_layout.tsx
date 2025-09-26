import { Redirect, Stack, usePathname } from "expo-router";
import { useAuth } from "../lib/AuthProvid";

export default function AuthLayout() {

  const { session, loading } = useAuth();
  const pathname = usePathname();

  if (loading) return null;

  // Allow staying on onboarding even if logged in
   const isOnboarding = pathname === "/(auth)/onboarding"; // adjust case to your file
  // console.Console;
  if (session && !isOnboarding) {
    console.log("I am accessing");
    return <Redirect href="/(tabs)/home" />;
    
  }




  return (
    <>
      {/* If no session, show the login/signup screens */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name = "onboarding"/>

      </Stack>
    </>
  );
}






// import { Redirect, Stack, usePathname } from "expo-router";
// import { useAuth } from "../lib/AuthProvid";
// import { useEffect, useState } from "react";
// import { supabase } from "../lib/superbase"; // adjust path

// export default function AuthLayout() {
//   const { session, loading } = useAuth();
//   const pathname = usePathname();

//   const [needsOnboarding, setNeedsOnboarding] = useState(false);
//   const [checking, setChecking] = useState(true);

//   useEffect(() => {
//     const check = async () => {
//       if (!session?.user) {
//         setChecking(false);
//         return;
//       }
//       const { data, error } = await supabase
//         .from("users")
//         .select("has_onboarded")
//         .eq("id", session.user.id)
//         .single();

//       if (error) {
//         console.error("error fetching user:", error.message);
//       }
//       else 
//       {
//         console.log("Fetched user row:", data);
//       }

//       setNeedsOnboarding(!data?.has_onboarded);
//       setChecking(false);
//     };

//     check();
//   }, [session]);

//   if (loading || checking) return null;

//   const isOnboarding = pathname === "/(auth)/onboarding"; // must match file name

//   if (session) {
//     if (needsOnboarding && !isOnboarding) {
//       // logged in but not onboarded → force onboarding
//       return <Redirect href="/(auth)/onboarding" />;
//     }
//     if (!needsOnboarding && !isOnboarding) {
//       // logged in + already onboarded → go straight home
//       return <Redirect href="/(tabs)/home" />;
//     }
//   }

//   return (
//     <Stack screenOptions={{ headerShown: false }}>
//       <Stack.Screen name="login" />
//       <Stack.Screen name="signup" />
//       <Stack.Screen name="onboarding" />
//     </Stack>
//   );
// }


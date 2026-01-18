import React, { useMemo, useState } from "react";
import { Stack } from "expo-router";
import AuthProvider2 from "./lib/AuthProvid";
// 🟢 1. Import NotificationProvider
import { NotificationProvider } from "./lib/NotificationProvider"; 
import { Provider as PaperProvider, MD3LightTheme, MD3DarkTheme } from "react-native-paper";
import { StatusBar } from "react-native";

export const ThemeCtx = React.createContext({ dark: false, toggle: () => {} });

export default function RootLayout() {
  const [dark, setDark] = useState(false);
  const toggle = () => setDark(v => !v);
  const theme = useMemo(() => (dark ? MD3DarkTheme : MD3LightTheme), [dark]);

  return (
    <AuthProvider2>
      {/* 🟢 2. Add NotificationProvider inside AuthProvider */}
      <NotificationProvider>
        <ThemeCtx.Provider value={{ dark, toggle }}>
          <PaperProvider theme={theme}>
            <StatusBar barStyle={dark ? "light-content" : "dark-content"} />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              {/* নিশ্চিত করুন notification পেজটি যেন Stack এ থাকে, অথবা অটোমেটিক পেয়ে যাবে */}
            </Stack>
          </PaperProvider>
        </ThemeCtx.Provider>
      </NotificationProvider>
    </AuthProvider2>
  );
}
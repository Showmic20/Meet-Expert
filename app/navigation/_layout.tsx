import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { ThemeProvider, useAppTheme } from "../lib/ThemeContext"; // Check path


function RootNavigator() {
  const { isDarkMode } = useAppTheme();

  return (
    <>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={isDarkMode ? "#121212" : "#ffffff"} 
      />
      <Stack screenOptions={{ headerShown: false }}>
       
        <Stack.Screen name="drawer" /> 
      </Stack>
    </>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <RootNavigator />
      
    </ThemeProvider>
  );
}
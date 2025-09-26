import React, { useContext, useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { List, Switch, Divider, Text } from "react-native-paper";
import { Redirect, router } from "expo-router";
import { supabase } from "../lib/superbase";
import { ThemeCtx } from "../../app/_layout";

export default function CustomDrawerContent(props: any) {
  const { dark, toggle } = useContext(ThemeCtx);
  const [loggedOut, setLoggedOut] = useState(false);  // State to track if the user has logged out

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error logging out:", error.message);
      } else {
        // Optionally, you can show a success message
        Alert.alert("Logged out successfully!");
        console.log("User logged out");

        // After logging out, set the state to trigger redirect
        setLoggedOut(true);
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  // If the user has logged out, redirect to the login page
  if (loggedOut) {
    return <Redirect href="/(auth)/login" />;  // Use `href` instead of `to`
  }

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
      <View style={styles.header}><Text variant="titleMedium">Settings</Text></View>

      <List.Section>
        {/* 1) Dark theme */}
        <List.Item
          title="Dark Theme"
          right={() => <Switch value={dark} onValueChange={toggle} />}
          onPress={toggle}
        />
        <Divider />

        {/* 2) Language */}
        <DrawerItem
          label="Language"
          onPress={() => router.push("/(drawer)/(tabs)/settings/language")} // point to your language screen/page
        />
        <Divider />

        {/* 3) Logout */}
        <DrawerItem label="Logout" onPress={handleLogout} />
      </List.Section>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 0 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
});

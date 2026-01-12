import React, { useContext, useState, useEffect } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { List, Switch, Divider, Text } from "react-native-paper";
import { Redirect, router } from "expo-router";
import { supabase } from "../lib/superbase"; // পাথ ঠিক আছে কিনা চেক করুন
import { ThemeCtx } from "../../app/_layout";
import { Ionicons } from '@expo/vector-icons'; // আইকনের জন্য

export default function CustomDrawerContent(props: any) {
  const { dark, toggle } = useContext(ThemeCtx);
  const [loggedOut, setLoggedOut] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); // অ্যাডমিন চেক করার স্টেট

  // ১. ইউজার অ্যাডমিন কিনা চেক করা (অপশনাল)
  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // এখানে আপনি আপনার অ্যাডমিন ইমেইলটি বসান
      // অথবা যদি ডাটাবেসে role কলাম থাকে সেটা চেক করতে পারেন
      const adminEmail = "admin@example.com"; 

      if (user?.email === adminEmail) {
        setIsAdmin(true);
      }
      
      // নোট: আপাতত টেস্টিংয়ের জন্য সব সময় true করে রাখতে পারেন
      // setIsAdmin(true); 
    };
    
    checkUserRole();
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error logging out:", error.message);
      } else {
        Alert.alert("Logged out successfully!");
        setLoggedOut(true);
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  if (loggedOut) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium">Settings</Text>
      </View>

      <List.Section>
        {/* 1) Dark theme */}
        <List.Item
          title="Dark Theme"
          left={() => <List.Icon icon="theme-light-dark" />} // আইকন দিলে সুন্দর লাগে
          right={() => <Switch value={dark} onValueChange={toggle} />}
          onPress={toggle}
        />
        <Divider />

        {/* 2) Language */}
        <DrawerItem
          label="Language"
          icon={({ color, size }) => (
            <Ionicons name="language-outline" size={size} color={color} />
          )}
          onPress={() => router.push("/(drawer)/(tabs)/settings/language")}
        />
        <Divider />

        {/* 🔴 ৩) অ্যাডমিন প্যানেল বাটন (NEW) */}
        {/* আপনি চাইলে {isAdmin && ...} দিয়ে এটি সাধারণ ইউজারদের থেকে লুকাতে পারেন */}
        <DrawerItem
          label="Admin Panel"
          icon={({ color, size }) => (
            <Ionicons name="shield-checkmark-outline" size={size} color="red" />
          )}
          onPress={() => router.push("/admin-requests")} 
        />
        <Divider />

        {/* 4) Logout */}
        <DrawerItem 
          label="Logout" 
          icon={({ color, size }) => (
            <Ionicons name="log-out-outline" size={size} color={color} />
          )}
          onPress={handleLogout} 
        />
      </List.Section>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 0 },
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f4f4f4' },
});
// navigation/drawerContent.tsx (বা আপনার ফাইলের লোকেশন অনুযায়ী)
import React, { useContext, useState, useEffect } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { List, Switch, Divider, Text } from "react-native-paper";
import { Redirect, router } from "expo-router";
import { supabase } from "../lib/superbase"; 
import { ThemeCtx } from "../_layout"; // পাথ ঠিক আছে কিনা চেক করুন (app/_layout হলে ../_layout হতে পারে)
import { Ionicons } from '@expo/vector-icons'; 
// 🟢 Import Language Hook
import { useLanguage } from "../lib/LanguageContext"; 

export default function CustomDrawerContent(props: any) {
  const { dark, toggle } = useContext(ThemeCtx);
  const [loggedOut, setLoggedOut] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // 🟢 ভাষা ব্যবহারের জন্য হুক
  const { language, toggleLanguage, t } = useLanguage();

  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const adminEmail = "admin@example.com"; 
      if (user?.email === adminEmail) {
        setIsAdmin(true);
      }
    };
    checkUserRole();
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error logging out:", error.message);
      } else {
        // 🟢 বাংলা/ইংরেজি মেসেজ
        Alert.alert(t('logoutSuccess'));
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
        {/* 🟢 সেটিংস টাইটেল */}
        <Text variant="titleMedium">{t('settings')}</Text>
      </View>

      <List.Section>
        {/* 1) Dark theme */}
        <List.Item
          title={t('darkTheme')} // 🟢 বাংলা সাপোর্ট
          left={() => <List.Icon icon="theme-light-dark" />}
          right={() => <Switch value={dark} onValueChange={toggle} />}
          onPress={toggle}
        />
        <Divider />

        {/* 🟢 2) Language Toggle (Direct Switch) */}
        <List.Item
          title={t('language')}
          description={language === 'en' ? "English" : "বাংলা"} // নিচে ছোট করে বর্তমান ভাষা দেখাবে
          left={props => <List.Icon {...props} icon="translate" />}
          right={() => (
            <Switch 
              value={language === 'bn'} // বাংলা হলে অন থাকবে
              onValueChange={toggleLanguage} 
              color="green" 
            />
          )}
        />
        <Divider />

        {/* 3) Admin Panel Items */}
        <DrawerItem
          label={t('verificationRequests')}
          icon={({ color, size }) => (
            <Ionicons name="shield-checkmark-outline" size={size} color="blue" />
          )}
          onPress={() => router.push("/admin-requests")} 
        />

        <DrawerItem
          label={t('complaints')}
          icon={({ color, size }) => (
            <Ionicons name="alert-circle-outline" size={size} color="red" />
          )}
          onPress={() => router.push("/admin-complain")} 
        />
        <Divider />

        {/* 4) Logout */}
        <DrawerItem 
          label={t('logout')}
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
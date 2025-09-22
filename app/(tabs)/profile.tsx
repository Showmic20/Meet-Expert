import React, { useState } from "react";
import { View, Text, Button, Alert } from "react-native";
import supabase from "../lib/superbase";  // Adjust the import based on your file structure
import { Redirect } from "expo-router"; // Import Redirect correctly

export default function Profile() {
  const [loggedOut, setLoggedOut] = useState(false);  // State to track if the user has logged out

  const logout = async () => {
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
    <View style={{ padding: 20 }}>
      <Text>Welcome to your profile!</Text>
      <Button title="Logout" onPress={logout} />
    </View>
  );
}

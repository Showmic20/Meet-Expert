// app/(auth)/login.tsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Keyboard, TouchableWithoutFeedback } from "react-native";
import { TextInput, Button, Paragraph } from "react-native-paper"; // Import Paper components
import { supabase } from "../lib/superbase"; // Import Supabase client
import { router } from "expo-router";
import { KeyboardAvoidingView, Platform } from "react-native";
import { StyleSheet } from "react-native";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

const handleLogin = async () => {
  console.log("Login button clicked");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // show error to user
    return;
  }
  if (data.user) {
    await supabase.from("users").upsert({
      id: data.user.id,
      first_name: "Unknown",
      last_name: "Unknown",
      // leave everything else null
    });
    console.log("in front of on board");
    router.replace("/(auth)/onboarding");
  }
};

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"} // Adjust behavior based on platform
    >
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            style={[styles.input,styles.shadowinput]}
            keyboardType="email-address"
          />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            style={[styles.input,styles.shadowinput]}
            secureTextEntry
          />
          <Button mode="contained" onPress={handleLogin} style={[styles.button, styles.shadowbutton]}>
            Log In
          </Button>
          {error && <Paragraph style={{ color: "red", textAlign: "center" }}>{error}</Paragraph>}
          <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
            <Text style={{ color: "#1E90FF" }}>Don't have an account? Sign Up</Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  input: {
    width: "100%",
    marginBottom: 20,
    backgroundColor:"#d3e4f7ff"
  },
  button: {
    height:40,
    width: "100%",
    marginBottom: 20,
    backgroundColor:"#4195f5ff",
  },
  shadowbutton: {
    elevation: 5, // For Android shadow
    shadowColor: "#000", // iOS shadow color
    shadowOffset: { width: 0, height: 4 }, // iOS shadow offset
    shadowOpacity: 0.5, // iOS shadow opacity
    shadowRadius: 4, // iOS shadow radius
  },
  shadowinput: {
    elevation: 5, // For Android shadow
    shadowColor: "#000", // iOS shadow color
    shadowOffset: { width: 0, height: 4 }, // iOS shadow offset
    shadowOpacity: 0.3, // iOS shadow opacity
    shadowRadius: 4, // iOS shadow radius
  },
  error: {
    color: "red",
    textAlign: "center",
  },
  success: {
    color: "green",
    textAlign: "center",
  },
  link: {
    color: "#1E90FF",
    marginTop: 20,
  },
});


export default Login;

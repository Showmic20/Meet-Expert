// app/(auth)/signup.tsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Keyboard, TouchableWithoutFeedback, Image } from "react-native";
import { TextInput, Button, Paragraph } from "react-native-paper"; // Import Paper components
import { supabase } from "../lib/superbase"; // Import Supabase client
import { router } from "expo-router";
import { KeyboardAvoidingView, Platform } from "react-native";
import { StyleSheet } from "react-native";
const logo = require("assets/images/meetexpertlogo.png")
const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSignup = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess("Signup successful! Please check your email to confirm.");
      const userId = data.user?.id;
     
      setTimeout(() => {
        //router.push("/(auth)/onBoarding");
        router.push("/(auth)/login");
      }, 2000);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"} // Adjust behavior based on platform
    >
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>

          <Image source ={logo} style ={[styles.imagestyle]}/>

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            style={{ width: "100%", marginBottom: 20 }}
            keyboardType="email-address"
          />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            style={{ width: "100%", marginBottom: 20 }}
            secureTextEntry
          />
          <Button mode="contained" onPress={handleSignup} style={{ width: "100%", marginBottom: 20 }}>
            Sign Up
          </Button>
          {error && <Paragraph style={{ color: "red", textAlign: "center" }}>{error}</Paragraph>}
          {success && <Paragraph style={{ color: "green", textAlign: "center" }}>{success}</Paragraph>}
          <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
            <Text style={{ color: "#1E90FF" }}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default Signup;
const styles = StyleSheet.create({
  shadowBox: {
      elevation: 5, // For Android shadow
    shadowColor: "#000", // iOS shadow color
    shadowOffset: { width: 0, height: 4 }, // iOS shadow offset
    shadowOpacity: 0.5, // iOS shadow opacity
    shadowRadius: 4, // iOS shadow radius
  },
  imagestyle:
  {height: 100, width: 100, marginBottom: 100, shadowColor:"black"} ,
});
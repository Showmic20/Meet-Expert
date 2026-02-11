// app/(auth)/login.tsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Keyboard, TouchableWithoutFeedback, Alert } from "react-native";
import { TextInput, Button, Paragraph } from "react-native-paper"; // Import Paper components
import { supabase } from "../lib/superbase"; // Import Supabase client
import { router } from "expo-router";
import { KeyboardAvoidingView, Platform } from "react-native";
import { StyleSheet, Image } from "react-native";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const logo = require("assets/images/meetexpertlogo.png");

// handleLogin
const handleLogin = async () => {
  console.log("Login button clicked");
  if (!email || !password) {
    Alert.alert("Missing Fields", "Please enter both email and password.");
    return;
  }
  try{
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
   if (error) throw error;
   //{
  //    Alert.alert("Check your Connectin!!!");
  //  // console.error(error);
  //   return;
  // }
    if (data.user) {
    await supabase.from("users").upsert({
      id: data.user.id,
      first_name: "Unknown",
      last_name: "Unknown",
    },{ onConflict: "id", ignoreDuplicates: true});

    // Fetch session immediately
    const { data: sessionData } = await supabase.auth.getSession();
    console.log("Session after login:", sessionData.session);

    // Redirect to onboarding
    router.replace("/(auth)/onboarding");
  }
  } catch (error:any){
  console.log("Login Error:", error.message);

    // Case 1: Wrong Email or Password
    if (error.message.includes("Invalid login credentials")) {
      Alert.alert(
        "Login Failed", 
        "The email or password you entered is incorrect. Please try again."
      );
    } 
    // Case 2: Network / Internet Issues
    else if (
      error.message.includes("Network request failed") || 
      error.message.includes("connection")
    ) {
      Alert.alert(
        "Connection Error", 
        "Could not connect to the server. Please check your internet connection."
      );
    } 
    // Case 3: Email not confirmed (Supabase specific)
    else if (error.message.includes("Email not confirmed")) {
      Alert.alert(
        "Verification Needed", 
        "Please check your email and verify your account before logging in."
      );
    }
    // Case 4: Any other unknown error
    else {
      Alert.alert("Error", error.message || "Something went wrong. Please try again.");
    }
  } 
  // Ensure user row exists

};



  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"} // Adjust behavior based on platform
    > 
      <TouchableWithoutFeedback onPress={Platform.OS !== 'web' ? Keyboard.dismiss : undefined}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
          <Image source={logo}  style={styles.imagestyel}/>
              

          <TextInput
            testID="email_input"
            label="Email"
            value={email}
            onChangeText={setEmail}
            style={[styles.input,styles.shadowinput]}
            keyboardType="email-address"
          />
          <TextInput
          testID="password_input"
            label="Password"
            value={password}
            onChangeText={setPassword}
            style={[styles.input,styles.shadowinput]}
            secureTextEntry
          />
          <Button mode="contained"testID="login_button" onPress={handleLogin} style={[styles.button, styles.shadowbutton]}>
            Log In
          </Button>
          {error && <Paragraph style={{ color: "red", textAlign: "center" }}>{error}</Paragraph>}
          <TouchableOpacity testID="go_to_signup" onPress={() => router.push("/(auth)/signup")}>
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
  imagestyel :{
    height: 100,
    width: 100,
    marginBottom: 100
  }
});


export default Login;

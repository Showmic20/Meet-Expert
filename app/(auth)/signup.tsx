import React, { useState } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Keyboard, 
  TouchableWithoutFeedback, 
  Image, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform 
} from "react-native";
import { TextInput, Button, Paragraph } from "react-native-paper"; 
import { supabase } from "../lib/superbase"; 
import { router } from "expo-router";


const logo = require("assets/images/meetexpertlogo.png");

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSignup = async () => {
    
    setError(null);
    setSuccess(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess("Signup successful! Please check your email to confirm.");
      setTimeout(() => {
        router.push("/(auth)/login");
      }, 2000);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
    > 
    
      <TouchableWithoutFeedback onPress={Platform.OS !== 'web' ? Keyboard.dismiss : undefined}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16, backgroundColor: '#fff' }}>

          <Image source={logo} style={styles.imagestyle} resizeMode="contain" />

          <TextInput
            testID="signup_email" // Cypress ID
            label="Email"
            value={email}
            onChangeText={setEmail}
            style={{ width: "100%", marginBottom: 20, backgroundColor: 'white' }}
            keyboardType="email-address"
            autoCapitalize="none"
            mode="outlined" 
          />
          
          <TextInput
            testID="signup_password" // Cypress ID
            label="Password"
            value={password}
            onChangeText={setPassword}
            style={{ width: "100%", marginBottom: 20, backgroundColor: 'white' }}
            secureTextEntry
            mode="outlined"
          />
          
          <Button 
            testID="signup_button" // Cypress ID
            mode="contained" 
            onPress={handleSignup} 
            style={{ width: "100%", marginBottom: 20 }}
          >
            Sign Up
          </Button>

          {error && <Paragraph style={{ color: "red", textAlign: "center", marginBottom: 10 }}>{error}</Paragraph>}
          {success && <Paragraph style={{ color: "green", textAlign: "center", marginBottom: 10 }}>{success}</Paragraph>}
          
          <TouchableOpacity 
            testID="go_to_login" //  Cypress ID
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={{ color: "#1E90FF", marginTop: 10 }}>Already have an account? Login</Text>
          </TouchableOpacity>

        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default Signup;

const styles = StyleSheet.create({
  shadowBox: {
    elevation: 5, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.5, 
    shadowRadius: 4, 
  },
  imagestyle: {
    width: 100, 
    height: 100, 
    marginBottom: 50, 
    shadowColor:"black"
  },
});
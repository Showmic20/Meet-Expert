import React, { useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { Text, TextInput, Button, Checkbox, Appbar, ActivityIndicator } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../app/lib/superbase"; 
import { useAuth } from "../app/lib/AuthProvid"; // আপনার পাথ অনুযায়ী ঠিক করে নিন

const REASONS = [
  "Technical Failure (caused by Expert or Platform)",
  "Misrepresentation of Credentials or Scope",
  "Unprofessional or abusive behavior",
  "Expert didn’t show up or respond",
  "Others"
];

export default function ReportScreen() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId: string }>(); // চ্যাট পেজ থেকে roomId পাব
  const { session } = useAuth();
  
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert("Required", "Please select a reason for the complaint.");
      return;
    }
    if (!accepted) {
      Alert.alert("Required", "Please accept the terms and conditions.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: session?.user?.id,
        room_id: roomId, // চ্যাট রুম আইডি
        reason: selectedReason,
        details: details,
      });

      if (error) throw error;

      Alert.alert("Submitted", "We have received your report. We will reach out shortly.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Complain and Report" titleStyle={styles.headerTitle} />
      </Appbar.Header>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.subHeader}>
            For valid you will get your payment back
          </Text>

          {/* Reason Checkboxes */}
          <View style={styles.reasonContainer}>
            {REASONS.map((reason, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.checkboxRow} 
                onPress={() => setSelectedReason(reason)}
                activeOpacity={0.7}
              >
                <View style={[styles.customCheckbox, selectedReason === reason && styles.customCheckboxSelected]}>
                    {selectedReason === reason && <View style={styles.innerCheck} />}
                </View>
                <Text style={styles.reasonText}>{reason}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Details Input */}
          <TextInput
            mode="outlined"
            placeholder="Write here in details"
            placeholderTextColor="#aaa"
            multiline
            numberOfLines={6}
            value={details}
            onChangeText={setDetails}
            style={styles.textInput}
            outlineStyle={styles.inputOutline}
            theme={{ colors: { primary: '#9575CD', background: '#F0EFF5' } }} // Purple focus color
          />

          {/* Footer Terms */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerTitle}>For verification we will reach out the expert</Text>
            <TouchableOpacity onPress={() => Alert.alert("Info", "Terms and conditions modal...")}>
              <Text style={styles.linkText}>Read terms and conditions</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={styles.acceptRow} 
                onPress={() => setAccepted(!accepted)}
            >
               <View style={[styles.customCheckbox, accepted && styles.customCheckboxSelected]}>
                    {accepted && <View style={styles.innerCheck} />}
                </View>
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <Button 
            mode="contained" 
            onPress={handleSubmit} 
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
            contentStyle={{ height: 50 }}
            labelStyle={{ fontSize: 16, fontWeight: "bold" }}
          >
            Submit
          </Button>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { backgroundColor: "#fff", elevation: 0, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#000" },
  
  content: { padding: 20, paddingBottom: 40 },
  subHeader: { fontSize: 14, color: "#666", marginBottom: 20 },

  reasonContainer: { marginBottom: 20 },
  checkboxRow: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  reasonText: { fontSize: 14, color: "#333", flex: 1 },

  // Custom Checkbox Styling to match image (Square)
  customCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#ccc",
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  customCheckboxSelected: {
    borderColor: "#9575CD", // Purple hint
    backgroundColor: "#9575CD", 
  },
  innerCheck: {
    width: 10,
    height: 10,
    backgroundColor: 'white',
  },

  textInput: { 
    backgroundColor: "#F0EFF5", 
    height: 120, 
    textAlignVertical: 'top',
    marginBottom: 20
  },
  inputOutline: { 
    borderRadius: 12, 
    borderColor: "#9575CD", // Purple border as shown in image
    borderWidth: 1 
  },

  footerContainer: { marginBottom: 30 },
  footerTitle: { fontSize: 14, fontWeight: "600", color: "#000", marginBottom: 5 },
  linkText: { fontSize: 14, color: "#7E57C2", marginBottom: 15, textDecorationLine: "underline" }, // Purple link
  
  acceptRow: { flexDirection: "row", alignItems: "center" },
  acceptText: { fontSize: 14, color: "#333" },

  submitButton: { 
    backgroundColor: "#FF3B30", // Red color as shown in image
    borderRadius: 25,
    marginTop: 10
  }
});
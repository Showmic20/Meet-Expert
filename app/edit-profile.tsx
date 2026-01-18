import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { TextInput, Button, Avatar, ActivityIndicator, useTheme, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { supabase } from '../app/lib/superbase'; // পাথ ঠিক আছে কিনা চেক করুন (superbase vs supabase)
import { useAuth } from '../app/lib/AuthProvid'; // পাথ ঠিক আছে কিনা চেক করুন

export default function EditProfileScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const theme = useTheme();

  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [occupation, setOccupation] = useState('');
  const [company, setCompany] = useState('');
  const [bio, setBio] = useState('');
  const [availability, setAvailability] = useState(''); // 🟢 নতুন ফিল্ড
  const [location, setLocation] = useState('');

  // ─── ১. ডাটা লোড করা ─────────────────────────────
  useEffect(() => {
    if (session?.user) fetchProfile();
  }, [session]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session?.user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setOccupation(data.occupation || '');
        setCompany(data.company_name || '');
        setBio(data.bio || '');
        setAvailability(data.availability || ''); // 🟢 ডাটাবেস থেকে টাইম আনা
        setLocation(data.location || '');
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Could not load profile data.');
    } finally {
      setLoading(false);
    }
  };

  // ─── ২. প্রোফাইল আপডেট করা ──────────────────────────
  const handleUpdate = async () => {
    try {
      setLoading(true);
      const updates = {
        first_name: firstName,
        last_name: lastName,
        occupation: occupation,
        company_name: company,
        bio: bio,
        availability: availability, // 🟢 ডাটাবেসে সেভ করা
        location: location,
        updated_at: new Date(),
      };

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', session?.user?.id);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() } // সেভ হওয়ার পর ব্যাকে যাবে
      ]);
      
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !firstName) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={{ flex: 1, backgroundColor: 'white' }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Header Title */}
        <Text variant="headlineSmall" style={styles.headerTitle}>Edit Profile</Text>

        <View style={styles.inputContainer}>
            <TextInput
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
              mode="outlined"
              style={styles.input}
            />
            
            <TextInput
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Occupation / Job Title"
              value={occupation}
              onChangeText={setOccupation}
              mode="outlined"
              style={styles.input}
              placeholder="e.g. Software Engineer"
            />

            <TextInput
              label="Company / Institution"
              value={company}
              onChangeText={setCompany}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Location"
              value={location}
              onChangeText={setLocation}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="map-marker" />}
            />

            {/* 🟢 Preferred Available Time Field */}
            <View style={styles.availabilitySection}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 5, color: theme.colors.primary }}>
                    Availability
                </Text>
                <TextInput
                    label="Preferred Available Time"
                    value={availability}
                    onChangeText={setAvailability}
                    mode="outlined"
                    placeholder="e.g. Mon-Fri, 9 PM - 11 PM"
                    style={styles.input}
                    left={<TextInput.Icon icon="clock-outline" />}
                />
                <Text style={styles.helperText}>
                    Mention the time when you are usually free for consultations.
                </Text>
            </View>

            <TextInput
              label="Bio"
              value={bio}
              onChangeText={setBio}
              mode="outlined"
              multiline
              numberOfLines={4}
              style={[styles.input, { height: 100 }]}
            />
        </View>

        <Button 
          mode="contained" 
          onPress={handleUpdate} 
          loading={loading} 
          disabled={loading}
          style={styles.saveButton}
          contentStyle={{ height: 50 }}
        >
          Save Changes
        </Button>
        
        {/* Cancel Button */}
        <Button 
          mode="text" 
          onPress={() => router.back()} 
          style={{ marginTop: 10 }}
          disabled={loading}
        >
          Cancel
        </Button>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  headerTitle: {
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
    backgroundColor: 'white',
  },
  availabilitySection: {
    marginTop: 10,
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  helperText: {
    fontSize: 12,
    color: 'gray',
    marginTop: 5,
    fontStyle: 'italic',
  },
  saveButton: {
    borderRadius: 30,
    marginTop: 10,
  },
});
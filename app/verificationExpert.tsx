import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Alert, 
  SafeAreaView,
  Platform 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

export default function VerificationScreen() {
  // State to store image URIs
  const [idImage, setIdImage] = useState<string | null>(null);
  const [docImage, setDocImage] = useState<string | null>(null);
  const [faceImage, setFaceImage] = useState<string | null>(null);

  // Function to pick image
  const pickImage = async (setImage: (uri: string) => void, useCamera: boolean = false) => {
    // Permission request
    const permissionResult = useCamera 
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You need to grant permission to access photos/camera.");
      return;
    }

    const result = useCamera 
      ? await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1], // Square aspect for face
          quality: 0.5,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.5,
        });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    if (!idImage || !faceImage) {
      Alert.alert("Error", "Please upload ID and complete Face Verification.");
      return;
    }
    // Here you will call your backend API
    console.log("Submitting:", { idImage, docImage, faceImage });
    Alert.alert("Success", "Documents submitted for verification!");
  };

  // Reusable Component for Upload Box
  const UploadBox = ({ title, subtitle, imageUri, onPress }: any) => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      
      <TouchableOpacity style={styles.uploadBox} onPress={onPress}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.uploadedImage} />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <View style={styles.iconCircle}>
              <Ionicons name="cloud-upload-outline" size={32} color="#888" />
            </View>
            <Text style={styles.uploadTextBlue}>Tap to upload a photo</Text>
            <Text style={styles.uploadTextGray}>png, jpg or pdf (max 800 X 400 pxl)</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => console.log('Back')}>
          <Ionicons name="chevron-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Document for Verification</Text>
        <View style={{ width: 24 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 1. Upload ID Section */}
        <UploadBox 
          title="Upload ID" 
          subtitle="Upload a photo of your NID, Passport or Driving license for verification"
          imageUri={idImage}
          onPress={() => pickImage(setIdImage)}
        />

        {/* 2. Upload Official Documents Section */}
        <UploadBox 
          title="Upload Official Documents" 
          subtitle="Upload a photo of your Business or Tax Documents, Professional & Experience Documents."
          imageUri={docImage}
          onPress={() => pickImage(setDocImage)}
        />

        {/* 3. Start Face Verification Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Start Face verification</Text>
          <Text style={styles.sectionSubtitle}>Open your camera and verify your face in live</Text>
          
          <View style={styles.faceVerificationContainer}>
            <TouchableOpacity onPress={() => pickImage(setFaceImage, true)}> 
              <View style={[styles.faceCircle, faceImage ? styles.faceCircleActive : null]}>
                 {faceImage ? (
                   <Image source={{ uri: faceImage }} style={styles.faceImage} />
                 ) : (
                   // Placeholder Illustration (Simulated with Icon)
                   <MaterialIcons name="face" size={80} color="#FFB6C1" />
                 )}
              </View>
            </TouchableOpacity>
            
            {/* Dashed ring effect around the face */}
            <View style={styles.dashedRing} pointerEvents="none" />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginTop: Platform.OS === 'android' ? 30 : 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionContainer: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
    lineHeight: 18,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: '#ccc',
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadTextBlue: {
    color: '#4169E1', // Royal Blue shade
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  uploadTextGray: {
    color: '#888',
    fontSize: 12,
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  
  // Face Verification Styles
  faceVerificationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    position: 'relative',
    height: 150,
  },
  faceCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF0F5', // Light pinkish bg
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    zIndex: 2,
  },
  faceCircleActive: {
    backgroundColor: '#fff',
  },
  faceImage: {
    width: 100,
    height: 100,
  },
  dashedRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: '#4169E1',
    borderStyle: 'dashed',
    zIndex: 1,
  },
  
  // Button
  submitButton: {
    backgroundColor: '#2495ff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#2495ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
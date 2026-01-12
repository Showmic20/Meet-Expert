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
  Platform,
  ActivityIndicator 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from "../app/lib/superbase"; 

// ⚠️ আপনার প্রজেক্টের supabase ক্লায়েন্ট ইমপোর্ট করুন
// যদি আপনার ফাইলটি অন্য ফোল্ডারে থাকে তবে পাথ ঠিক করে নিন

export default function VerificationScreen() {
  const router = useRouter();
  
  // লোডিং স্টেট (আপলোডের সময় চাকা ঘোরার জন্য)
  const [loading, setLoading] = useState(false);

  // ইমেজের স্টেট
  const [idImage, setIdImage] = useState<string | null>(null);
  const [docImage, setDocImage] = useState<string | null>(null);
  const [faceImage, setFaceImage] = useState<string | null>(null);

  // ১. ইমেজ সিলেক্ট করার ফাংশন
  const pickImage = async (setImage: (uri: string) => void, useCamera: boolean = false) => {
    // পারমিশন চেক
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
          aspect: [1, 1],
          quality: 0.5, // ইমেজ সাইজ কমানোর জন্য কোয়ালিটি ০.৫ রাখা ভালো
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

  // ২. সুপাবেসে ইমেজ আপলোড করার হেল্পার ফাংশন
// ২. সুপাবেসে ইমেজ আপলোড করার হেল্পার ফাংশন
  // ২. (নতুন পদ্ধতি) সুপাবেসে ইমেজ আপলোড করার হেল্পার ফাংশন
  const uploadImageToSupabase = async (uri: string, folderName: string) => {
    try {
      // ইমেজের এক্সটেনশন বের করা
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${folderName}/${fileName}`;

      // 🟢 পরিবর্তন: FileSystem এর বদলে fetch ব্যবহার করা হচ্ছে
      // এটি সরাসরি ইমেজটিকে বাইনারি ফরম্যাটে নিয়ে আসে
      const response = await fetch(uri);
      const blob = await response.arrayBuffer();

      // সুপাবেস স্টোরেজে আপলোড
      const { data, error } = await supabase.storage
        .from('verification-docs')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
        });

      if (error) throw error;

      // পাবলিক URL বের করা
      const { data: urlData } = supabase.storage
        .from('verification-docs')
        .getPublicUrl(filePath);

      return urlData.publicUrl;

    } catch (error) {
      console.error("Upload Error:", error);
      throw error;
    }
  };
  // ৩. ফাইনাল সাবমিট ফাংশন
  const handleSubmit = async () => {
    // ভ্যালিডেশন
    if (!idImage || !faceImage) {
      Alert.alert("Incomplete", "Please upload ID and complete Face Verification.");
      return;
    }

    setLoading(true);

    try {
      // ক. বর্তমানে লগইন করা ইউজারকে খোঁজা
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Error", "User not found. Please log in again.");
        setLoading(false);
        return;
      }

      console.log("Starting upload for user:", user.id);

      // খ. ছবিগুলো আপলোড করা (Promise.all দিয়ে একসাথে করা যায়, তবে ধাপে ধাপে সহজ)
      const nidUrl = await uploadImageToSupabase(idImage, 'nids');
      const faceUrl = await uploadImageToSupabase(faceImage, 'faces');
      
      let docUrl = null;
      if (docImage) {
        docUrl = await uploadImageToSupabase(docImage, 'documents');
      }

      // গ. ডেটাবেসে রেকর্ড জমা দেওয়া
      const { error: dbError } = await supabase
        .from('verification_requests') // ⚠️ নিশ্চিত করুন এই নামে Table আছে
        .insert({
          user_id: user.id,
          nid_image_path: nidUrl,
          live_image_path: faceUrl,
          doc_image_path: docUrl,
          status: 'pending' // ডিফল্ট স্ট্যাটাস
        });

      if (dbError) throw dbError;

      // সফল হলে
      Alert.alert("Success", "Verification request submitted successfully!", [
        { text: "OK", onPress: () => router.back() }
      ]);

    } catch (error: any) {
      console.error(error);
      Alert.alert("Upload Failed", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // UI Components (আপনার আগের কোডই)
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
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
                   <MaterialIcons name="face" size={80} color="#FFB6C1" />
                 )}
              </View>
            </TouchableOpacity>
            
            <View style={styles.dashedRing} pointerEvents="none" />
          </View>
        </View>

        {/* Submit Button with Loading Indicator */}
        <TouchableOpacity 
          style={[styles.submitButton, loading && { opacity: 0.7 }]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
             <ActivityIndicator size="small" color="#fff" />
          ) : (
             <Text style={styles.submitButtonText}>Submit</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ... আপনার আগের স্টাইলগুলো এখানে হুবহু একই থাকবে
  // আমি শুধু জায়গার স্বার্থে রিপিট করলাম না, আপনি আপনার আগের styles ব্লকটি এখানে রেখে দেবেন
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
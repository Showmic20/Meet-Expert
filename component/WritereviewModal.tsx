import React, { useState } from 'react';
import { 
  View, StyleSheet, Modal, TouchableOpacity, TextInput, Alert, 
  TouchableWithoutFeedback, Keyboard // 🔴 ১. ইমপোর্ট করা হলো
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/superbase'; 
import { useAuth } from '../app/lib/AuthProvid'; 

interface WriteReviewModalProps {
  visible: boolean;
  onClose: () => void;
  expertId: string | null;
}

export default function WriteReviewModal({ visible, onClose, expertId }: WriteReviewModalProps) {
  const { session } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!expertId) { onClose(); return; }
    if (rating === 0) { Alert.alert("Rate please", "Please select at least 1 star."); return; }
    
    setLoading(true);

    const { error } = await supabase.from('reviews').insert({
      reviewer_id: session?.user?.id,
      expert_id: expertId,
      rating: rating,
      comment: comment
    });

    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert(
        "🎉 Review Submitted!", 
        "Thank you for your feedback. You have earned 10 coins!",
        [{ text: "OK", onPress: onClose }]
      );
      setRating(0);
      setComment('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* 🔴 ২. কীবোর্ড ডিসমিস করার লজিক যোগ করা হলো */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <View style={styles.container}>
            
            <View style={styles.header}>
              <Text style={styles.title}>Rate Experience</Text>
              <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.subtitle}>How was your session with the expert?</Text>

            {/* Star Rating Section */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                  <Ionicons 
                    name={star <= rating ? "star" : "star-outline"} 
                    size={36} 
                    color={star <= rating ? "#FFD700" : "#ccc"} 
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Comment Input */}
            <TextInput
              style={styles.input}
              placeholder="Write a comment (optional)..."
              placeholderTextColor="#aaa"
              multiline
              value={comment}
              onChangeText={setComment}
              // কীবোর্ড যাতে মেসেজ বক্সের নিচে না ঢাকা পড়ে (Android)
              textAlignVertical="top" 
            />

            {/* Submit Button */}
            <Button 
              mode="contained" 
              onPress={handleSubmit} 
              loading={loading} 
              disabled={loading}
              style={styles.submitBtn}
              contentStyle={{ height: 48 }}
            >
              Submit Review
            </Button>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  container: { backgroundColor: 'white', borderRadius: 16, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  subtitle: { color: 'gray', marginBottom: 20, fontSize: 14 },
  starsRow: { flexDirection: 'row', gap: 12, marginBottom: 25, justifyContent: 'center' },
  input: { 
    width: '100%', backgroundColor: '#f9f9f9', borderRadius: 12, 
    padding: 15, height: 100, textAlignVertical: 'top', marginBottom: 20,
    fontSize: 16, color: '#333'
  },
  submitBtn: { borderRadius: 8, backgroundColor: '#2196F3' }
});
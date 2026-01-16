import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Appbar, Text, Avatar, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

// reviews ফোল্ডার app এর মধ্যে, তাই lib পেতে ২ ধাপ উপরে (../../)
import { supabase } from '../../app/lib/superbase';

export default function ReviewsListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); 
  const router = useRouter();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expertName, setExpertName] = useState("Expert");

  useEffect(() => {
    const fetchReviews = async () => {
      if (!id) return;
      
      const { data: userData } = await supabase.from('users').select('first_name, last_name').eq('id', id).single();
      if(userData) setExpertName(`${userData.first_name} ${userData.last_name}`);

      const { data } = await supabase
        .from('reviews')
        .select(`*, reviewer:reviewer_id (first_name, last_name, profile_picture_url)`)
        .eq('expert_id', id)
        .order('created_at', { ascending: false });

      if (data) setReviews(data);
      setLoading(false);
    };
    fetchReviews();
  }, [id]);

  const renderItem = ({ item }: any) => (
    <View style={styles.reviewItem}>
      <View style={styles.headerRow}>
        <Avatar.Image 
            size={40} 
            source={{ uri: item.reviewer?.profile_picture_url || 'https://via.placeholder.com/150' }} 
            style={{backgroundColor: '#eee'}}
        />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.name}>
             {item.reviewer?.first_name || 'Anonymous'} {item.reviewer?.last_name || ''}
          </Text>
          <View style={{ flexDirection: 'row', marginTop: 2 }}>
            {[...Array(5)].map((_, i) => (
              <Ionicons key={i} name={i < item.rating ? "star" : "star-outline"} size={14} color="#FFD700" />
            ))}
          </View>
        </View>
        <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      {item.comment ? (
        <Text style={styles.comment}>{item.comment}</Text>
      ) : (
        <Text style={styles.noComment}>No comment provided.</Text>
      )}
      <Divider style={{ marginTop: 15 }} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <Appbar.Header style={{ backgroundColor: 'white', elevation: 0 }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={`Reviews for ${expertName}`} />
      </Appbar.Header>

      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-ellipses-outline" size={60} color="#ddd" />
                <Text style={styles.emptyText}>No reviews yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  reviewItem: { marginBottom: 15 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  name: { fontWeight: 'bold', fontSize: 15, color: '#333' },
  comment: { color: '#444', lineHeight: 22, fontSize: 14 },
  noComment: { color: '#999', fontStyle: 'italic', fontSize: 13 },
  date: { fontSize: 12, color: 'gray' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 10, color: 'gray', fontSize: 16 }
});
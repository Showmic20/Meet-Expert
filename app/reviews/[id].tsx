import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Appbar, Text, Avatar, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../app/lib/superbase';

export default function ReviewsListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); 
  const router = useRouter();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expertName, setExpertName] = useState("Expert");
  const [stats, setStats] = useState({ average: 0, total: 0 });

  useEffect(() => {
    const fetchReviews = async () => {
      if (!id) return;
      
      // Fetch Expert Name
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', id)
        .single();
        
      if(userData) setExpertName(`${userData.first_name} ${userData.last_name}`);

      // Fetch Reviews with correct relationship
      const { data, error } = await supabase
        .from('reviews')
        .select(`
            id,
            rating,
            comment,
            created_at,
            reviewer:users!reviewer_id (first_name, last_name, profile_picture_url)
        `)
        .eq('expert_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching reviews:", error);
      } else if (data) {
        setReviews(data);
        if (data.length > 0) {
            const totalRating = data.reduce((acc, curr) => acc + curr.rating, 0);
            setStats({
                average: totalRating / data.length,
                total: data.length
            });
        }
      }
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
            style={{backgroundColor: '#e0e0e0'}}
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
    // 🔴 পরিবর্তন ১: মেইন কন্টেইনার এখন সাধারণ View (backgroundColor: 'white' সহ)
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      
      {/* 🔴 পরিবর্তন ২: Appbar.Header এখন SafeAreaView এর বাইরে */}
      <Appbar.Header style={{ backgroundColor: 'white', elevation: 0 }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Reviews & Ratings" /> 
        {/* যদি টাইটেল বামে চান তবে নিচের লাইনটি ব্যবহার করুন */}
        {/* <Appbar.Content title="Reviews & Ratings" style={{ alignItems: 'flex-start' }} /> */}
      </Appbar.Header>

      {/* 🔴 পরিবর্তন ৩: শুধু বডি কন্টেন্ট SafeAreaView এর ভেতরে থাকবে (নিচের দিক সেফ রাখার জন্য) */}
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        
        {!loading && reviews.length > 0 && (
            <View style={styles.summaryContainer}>
                <Text style={styles.bigRating}>{stats.average.toFixed(1)}</Text>
                <View>
                    <View style={{flexDirection:'row'}}>
                        {[...Array(5)].map((_, i) => (
                            <Ionicons key={i} name={i < Math.round(stats.average) ? "star" : "star-outline"} size={16} color="#FFD700" />
                        ))}
                    </View>
                    <Text style={{color:'gray', fontSize: 12}}>{stats.total} Reviews</Text>
                </View>
            </View>
        )}

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
                    <Text style={styles.subText}>Start a chat to give a review!</Text>
                </View>
            }
            />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryContainer: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      padding: 15, backgroundColor: '#f9f9f9', marginBottom: 10, gap: 10
  },
  bigRating: { fontSize: 32, fontWeight: 'bold', color: '#333' },
  
  reviewItem: { marginBottom: 15 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  name: { fontWeight: 'bold', fontSize: 15, color: '#333' },
  comment: { color: '#444', lineHeight: 22, fontSize: 14 },
  noComment: { color: '#999', fontStyle: 'italic', fontSize: 13 },
  date: { fontSize: 12, color: 'gray' },
  
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 10, color: 'gray', fontSize: 16, fontWeight: 'bold' },
  subText: { color: '#999', fontSize: 14 }
});
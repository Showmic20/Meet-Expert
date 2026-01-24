import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Text, Button, Avatar, useTheme, ActivityIndicator, Divider, Surface } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '../../app/lib/superbase'; 
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; // ✅ ১. ইমপোর্ট

const { width } = Dimensions.get('window');

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams(); 
  const theme = useTheme();
  const router = useRouter();
  
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creator, setCreator] = useState<any>(null);

  useEffect(() => {
    if(id) fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      const { data: eventData, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setEvent(eventData);

      if (eventData.creator_id) {
        const { data: userData } = await supabase
          .from('users') 
          .select('first_name, last_name, profile_picture_url')
          .eq('id', eventData.creator_id)
          .single();
        setCreator(userData);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ ২. গ্রেডিয়েন্ট লজিক (ID এর শেষ অক্ষর চেক করে কালার ঠিক করা)
  // এটি নিশ্চিত করে যে একই ইভেন্ট সবসময় একই কালার দেখাবে
  const getGradientColors = () => {
    if (!id) return ['#8E2DE2', '#4A00E0']; // ডিফল্ট (Purple)
    
    // ID এর শেষ অক্ষরটি নিই এবং তার কোড বের করি
    const lastChar = String(id).slice(-1).charCodeAt(0);
    const isEven = lastChar % 2 === 0;

    return isEven 
      ? ['#8E2DE2', '#4A00E0']  // Purple (জোড় হলে)
      : ['#fc4a1a', '#f7b733']; // Orange (বিজোড় হলে)
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Text>Event not found.</Text>
      </View>
    );
  }

  const eventDate = new Date(event.start_at);
  const dateStr = eventDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} showsVerticalScrollIndicator={false}>
        
        {/* 🟢 ৩. ইমেজ কন্টেইনার এর বদলে গ্রেডিয়েন্ট হেডার */}
        <View style={styles.headerContainer}>
            <LinearGradient
                colors={getGradientColors() as [string, string]} // টাইপ ফিক্স
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientHeader}
            >
                {/* ক্লোজ বাটন */}
                <TouchableOpacity 
                    style={styles.closeBtn} 
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back-circle" size={40} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>

                {/* ইভেন্ট টাইটেল হেডারের ভেতরেই দেখালে সুন্দর লাগে */}
                <View style={styles.headerTitleArea}>
                    <Text style={styles.bigTitle}>{event.title}</Text>
                    <View style={styles.dateChip}>
                        <MaterialCommunityIcons name="calendar-clock" size={16} color="white" />
                        <Text style={styles.dateChipText}>{dateStr} • {timeStr}</Text>
                    </View>
                </View>

            </LinearGradient>
        </View>

        {/* 🟢 ৪. মেইন কন্টেন্ট বডি (সাদা অংশ) */}
        <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]}>
            
            {/* জয়েন বাটন এবং লোকেশন */}
            <View style={styles.actionRow}>
                <View style={styles.locationBox}>
                    <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.primary} />
                    <Text style={[styles.infoText, {color: theme.colors.onSurfaceVariant}]} numberOfLines={1}>
                        {event.location || "Online Event"}
                    </Text>
                </View>

                <Button 
                    mode="contained" 
                    onPress={() => console.log('Join Pressed')}
                    style={{borderRadius: 20}}
                    contentStyle={{paddingHorizontal: 10}}
                >
                    Join Now
                </Button>
            </View>

            <Divider style={{marginVertical: 20}} />

            {/* ক্রিয়েটর সেকশন */}
            <View style={styles.participantRow}>
                <Text style={{marginRight: 10, color: theme.colors.onSurfaceVariant}}>Hosted by</Text>
                {creator ? (
                    <View style={styles.creatorChip}>
                         <Avatar.Image size={28} source={{ uri: creator.profile_picture_url || 'https://via.placeholder.com/30' }} />
                         <Text style={{marginLeft: 8, fontWeight: 'bold', color: theme.colors.onSurface}}>{creator.first_name} {creator.last_name}</Text>
                    </View>
                ) : (
                    <Text style={{fontWeight: 'bold'}}>Unknown Host</Text>
                )}
            </View>

            {/* ডেসক্রিপশন */}
            <Text variant="titleMedium" style={{fontWeight: 'bold', marginTop: 20, marginBottom: 8, color: theme.colors.onSurface}}>About Event</Text>
            <Text style={{color: theme.colors.onSurfaceVariant, lineHeight: 24, fontSize: 15}}>
                {event.description}
            </Text>

            {/* রুলস সেকশন */}
            <Surface style={[styles.rulesContainer, {backgroundColor: theme.dark ? theme.colors.elevation.level1 : '#F5F5F5'}]} elevation={0}>
                <View style={styles.rulesHeader}>
                    <MaterialCommunityIcons name="shield-check-outline" size={24} color={theme.colors.primary} />
                    <Text variant="titleMedium" style={{fontWeight: 'bold', marginLeft: 8, color: theme.colors.onSurface}}>Requirements</Text>
                </View>
                
                <View style={styles.ruleItem}>
                    <Text style={{fontSize: 14, color: theme.colors.onSurfaceVariant}}>• Please join 10 minutes before start.</Text>
                </View>
                <View style={styles.ruleItem}>
                     <Text style={{fontSize: 14, color: theme.colors.onSurfaceVariant}}>• Keep your microphone muted during the session.</Text>
                </View>
            </Surface>

            <View style={{height: 40}} />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // ✅ নতুন হেডার স্টাইল
  headerContainer: {
    height: 280, // হেডারের উচ্চতা
    width: '100%',
  },
  gradientHeader: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-end', // কন্টেন্ট নিচে থাকবে
    paddingBottom: 40, // সাদা বক্সের নিচে যাতে ঢাকা না পড়ে
  },
  
  closeBtn: {
      position: 'absolute',
      top: 50,
      left: 20,
      zIndex: 10,
  },
  
  // হেডারের ভেতরের টেক্সট
  headerTitleArea: {
      marginBottom: 10,
  },
  bigTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: 'white',
      marginBottom: 10,
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 5,
  },
  dateChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)', // গ্লাস ইফেক্ট
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
  },
  dateChipText: {
      color: 'white',
      marginLeft: 6,
      fontWeight: '600',
      fontSize: 13,
  },

  // ✅ সাদা কন্টেন্ট বক্স (ওপরে কার্ভ করা)
  contentContainer: {
      flex: 1,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      marginTop: -30, // গ্রেডিয়েন্ট এর ওপর উঠে থাকবে
      padding: 25,
      minHeight: 500,
  },

  actionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 5,
  },
  locationBox: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 10,
  },
  infoText: {
      marginLeft: 5,
      fontSize: 15,
      fontWeight: '500',
  },
  participantRow: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  creatorChip: {
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: '#f0f0f0', 
      paddingRight: 12, 
      paddingVertical: 4, 
      paddingLeft: 4, 
      borderRadius: 50
  },
  rulesContainer: {
      padding: 20,
      borderRadius: 16,
      marginTop: 25,
  },
  rulesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0,0,0,0.05)',
      paddingBottom: 10,
  },
  ruleItem: {
      marginBottom: 8,
  },
});
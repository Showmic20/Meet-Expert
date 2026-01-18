import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, ImageBackground, Dimensions } from 'react-native';
import { Text, Button, Avatar, useTheme, ActivityIndicator, IconButton, Divider, Surface } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '../../app/lib/superbase'; // পাথ চেক করুন
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams(); // URL থেকে ID নেওয়া
  const theme = useTheme();
  const router = useRouter();
  
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creator, setCreator] = useState<any>(null);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      // ১. ইভেন্ট ডেটা আনা
      const { data: eventData, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setEvent(eventData);

      // ২. ক্রিয়েটর ইনফো আনা (অপশনাল, যদি ইউজার টেবিল থাকে)
      if (eventData.creator_id) {
        const { data: userData } = await supabase
          .from('users') // অথবা 'profiles'
          .select('first_name, last_name, profile_picture_url') // আপনার টেবিল কলাম অনুযায়ী
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

  // তারিখ ফরম্যাট করা
  const eventDate = new Date(event.start_at);
  const dateStr = eventDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });

  return (
    <>
      {/* হেডার হাইড করা কারণ আমরা কাস্টম ইমেজ হেডার ব্যবহার করব */}
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} showsVerticalScrollIndicator={false}>
        
        {/* 🟢 ১. কভার ইমেজ ও ক্লোজ বাটন */}
        <View style={styles.imageContainer}>
            <Image 
                source={{ uri: event.cover_url || 'https://via.placeholder.com/400x200' }} 
                style={styles.coverImage} 
                resizeMode="cover"
            />
            {/* ওভারলে গ্রেডিয়েন্ট বা টিন্ট */}
            <View style={styles.overlay} />
            
            <TouchableOpacity 
                style={styles.closeBtn} 
                onPress={() => router.back()}
            >
                <Ionicons name="close-circle" size={32} color="white" />
            </TouchableOpacity>
        </View>

        {/* 🟢 ২. মেইন কন্টেন্ট বডি */}
        <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]}>
            
            {/* টাইটেল এবং জয়েন বাটন */}
            <View style={styles.headerRow}>
                <View style={{flex: 1}}>
                    <Text variant="headlineMedium" style={{fontWeight: 'bold', color: theme.colors.onSurface}}>{event.title}</Text>
                    {/* একটি ছোট আইকন টাইটেলের পাশে (স্যাম্পল ইমেজের মতো) */}
                    <MaterialCommunityIcons name="calendar-check" size={20} color={theme.colors.primary} style={{marginTop: 5}}/>
                </View>
                <Button 
                    mode="contained" 
                    onPress={() => console.log('Join Pressed')}
                    style={{borderRadius: 8}}
                    contentStyle={{paddingHorizontal: 10}}
                >
                    Join
                </Button>
            </View>

            {/* ইনফো রো (তারিখ ও লোকেশন) */}
            <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="calendar-blank-outline" size={20} color={theme.colors.onSurfaceVariant} />
                    <Text style={[styles.infoText, {color: theme.colors.onSurfaceVariant}]}>{dateStr} • {timeStr}</Text>
                </View>
                <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="map-marker-outline" size={20} color={theme.colors.onSurfaceVariant} />
                    <Text style={[styles.infoText, {color: theme.colors.onSurfaceVariant}]}>{event.location}</Text>
                </View>
            </View>

            {/* পার্টিসিপেন্ট এবং ক্রিয়েটর সেকশন */}
            <View style={styles.participantRow}>
                <Text style={{marginRight: 10, color: theme.colors.onSurface}}>Created by:</Text>
                {creator ? (
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                         <Avatar.Image size={30} source={{ uri: creator.profile_picture_url || 'https://via.placeholder.com/30' }} />
                         <Text style={{marginLeft: 8, fontWeight: 'bold', color: theme.colors.onSurface}}>{creator.first_name} {creator.last_name}</Text>
                    </View>
                ) : (
                    <Avatar.Icon size={30} icon="account" />
                )}
            </View>

            <Divider style={{marginVertical: 15}} />

            {/* 🟢 ৩. ডেসক্রিপশন সেকশন */}
            <Text variant="titleMedium" style={{fontWeight: 'bold', marginBottom: 8, color: theme.colors.onSurface}}>Description</Text>
            <Text style={{color: theme.colors.onSurfaceVariant, lineHeight: 22, marginBottom: 20}}>
                {event.description}
            </Text>

            {/* 🟢 ৪. রুলস সেকশন (স্যাম্পল ইমেজের মতো স্টাইল) */}
            <Surface style={[styles.rulesContainer, {backgroundColor: theme.dark ? theme.colors.elevation.level1 : '#F5F5F5'}]} elevation={0}>
                <View style={styles.rulesHeader}>
                    <MaterialCommunityIcons name="cog-outline" size={24} color={theme.colors.onSurface} />
                    <Text variant="titleMedium" style={{fontWeight: 'bold', marginLeft: 8, color: theme.colors.onSurface}}>Event Rules & Requirements</Text>
                </View>
                
                {/* যেহেতু আমাদের DB তে রুলস এবং ডিটেইলস একসাথে, আমরা পুরো টেক্সট দেখাব বা আলাদা করতে পারি। 
                    নিচে ডামি ডাটা দিয়ে ডিজাইনটি দেখানো হলো */}
                
                <View style={styles.ruleItem}>
                    <Text style={{fontWeight: 'bold', color: theme.colors.primary}}>1. Attendance:</Text>
                    <Text style={{color: theme.colors.onSurfaceVariant}}>Be on time — late entries may not be allowed.</Text>
                </View>
                
                <View style={styles.ruleItem}>
                     <Text style={{fontWeight: 'bold', color: theme.colors.primary}}>2. Respect:</Text>
                     <Text style={{color: theme.colors.onSurfaceVariant}}>Maintain a professional attitude toward all attendees.</Text>
                </View>

            </Surface>

            {/* এক্সট্রা স্পেস নিচে */}
            <View style={{height: 40}} />

        </View>
      </ScrollView>

      {/* নিচের ফ্লোটিং বাটন (অপশনাল, যদি স্যাম্পল ইমেজের মতো উপরে বাটন না চান) */}
      {/* <View style={[styles.bottomBar, {backgroundColor: theme.colors.surface}]}>
          <Button mode="contained" fullWidth onPress={() => {}}>Join Event</Button>
      </View> */}
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageContainer: {
    height: 250,
    width: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.2)'
  },
  closeBtn: {
      position: 'absolute',
      top: 40,
      right: 20,
      zIndex: 10,
  },
  contentContainer: {
      flex: 1,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      marginTop: -25, // ইমেজ এর উপর একটু উঠে থাকবে
      padding: 20,
      minHeight: 500,
  },
  headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 15,
  },
  infoSection: {
      marginBottom: 15,
  },
  infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
  },
  infoText: {
      marginLeft: 8,
      fontSize: 14,
  },
  participantRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
  },
  rulesContainer: {
      padding: 15,
      borderRadius: 12,
      marginTop: 10,
  },
  rulesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#ddd',
      paddingBottom: 10,
  },
  ruleItem: {
      marginBottom: 10,
  },
});
import React, { useCallback, useEffect, useState, useLayoutEffect } from "react";
import { View, StyleSheet, FlatList, RefreshControl, Text, TouchableOpacity, Alert } from "react-native";
import {
  Card,
  Avatar,
  ActivityIndicator,
  Searchbar,
  Button,
  TextInput,
  Portal,
  Modal,
  FAB,
  IconButton,
  useTheme,
  Badge // 🟢 Added Badge for notification count
} from "react-native-paper";
import { useNavigation, DrawerActions } from "@react-navigation/native"; 
import { SafeAreaView } from "react-native-safe-area-context"; 
import { supabase } from "../../lib/superbase"; 
import { router } from "expo-router";

import WalletChip from "../../../component/Walletchip"; 
import { useAuth } from "../../lib/AuthProvid"; 
// 🟢 Import Notification Hook
import { useNotifications } from "../../lib/NotificationProvider";
import { useLanguage } from "../../lib/LanguageContext";

// ───────────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────────
export type UserListItem = {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  occupation: string | null;
  is_expert: boolean;
};

export type EventItem = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string | null;
  cover_url: string | null;
  created_at: string;
};

const PAGE_SIZE = 20;

export default function HomeScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();
  const theme = useTheme();
  const { t } = useLanguage();
  
  // 🟢 Get Notification Data
  const { unreadCount } = useNotifications();

  // 🟢 1. Hide Default Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false, 
    });
  }, [navigation]);

  // ── users state
  const [items, setItems] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  // ── events state
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState<boolean>(false);
  const [eventsPage, setEventsPage] = useState<number>(0);
  const [eventsHasMore, setEventsHasMore] = useState<boolean>(true);

  // ── general state
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");

  // ────────────────────────────────────────────────────────────────────────────
  // Fetch Functions
  // ────────────────────────────────────────────────────────────────────────────
  const fetchExperts = useCallback(async () => {
    try {
      setLoading(true);
      let q = supabase
        .from("users")
        .select("id, first_name, last_name, profile_picture_url, occupation, is_expert")
        .eq("is_expert", true) 
        .order("created_at", { ascending: false })
        .limit(10);

      if (query.trim().length > 0) {
        q = q.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      setItems((data ?? []) as UserListItem[]);
    } catch (e) {
      console.warn("fetch experts error", e);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const fetchEventsPage = useCallback(async (pageIndex: number, replace = false) => {
    try {
      if (eventsLoading && !replace) return;
      setEventsLoading(true);

      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let q = supabase
        .from("events")
        .select("*", { count: "exact" })
        .order("start_at", { ascending: true })
        .range(from, to);

      if (query.trim().length > 0) {
        q = q.or(`title.ilike.%${query}%,location.ilike.%${query}%`);
      }

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data ?? []) as EventItem[];
      setEventsHasMore(rows.length === PAGE_SIZE);
      setEventsPage(pageIndex);
      setEvents((prev) => (replace ? rows : [...prev, ...rows]));
    } catch (e) {
      console.warn("fetch events error", e);
    } finally {
      setEventsLoading(false);
    }
  }, [eventsLoading, query]);

  // ── Initial Data Load
  useEffect(() => {
    fetchExperts();
    fetchEventsPage(0, true);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchExperts(), fetchEventsPage(0, true)]);
    setRefreshing(false);
  }, [fetchExperts, fetchEventsPage]);

  const onEndReached = useCallback(() => {
    if (eventsLoading || !eventsHasMore) return;
    fetchEventsPage(eventsPage + 1);
  }, [eventsLoading, eventsHasMore, eventsPage, fetchEventsPage]);

  // ────────────────────────────────────────────────────────────────────────────
  // RENDERERS
  // ────────────────────────────────────────────────────────────────────────────

  const renderExpertItem = useCallback(({ item }: { item: UserListItem }) => {
    const name = `${item.first_name} ${item.last_name}`.trim();
    const avatar = item.profile_picture_url || "https://via.placeholder.com/150";

    return (
      <TouchableOpacity
        onPress={() => router.push({ pathname: "/user/[id]", params: { id: item.id } })}
        style={{ marginRight: 15 }}
      >
        <Card style={styles.cardHorizontal}>
          <View style={styles.cardContent}>
            <Avatar.Image size={80} source={{ uri: avatar }} style={{ marginBottom: 10 }} />
            <Text style={styles.expertName} numberOfLines={1}>{name}</Text>
            <Text style={styles.expertRole} numberOfLines={1}>
              {item.occupation || "Expert"}
            </Text>
          </View>
          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <Avatar.Icon size={20} icon="star" color="orange" style={{ backgroundColor: 'transparent' }} />
              <Text style={styles.footerText}>4.5</Text>
            </View>
            <View style={styles.footerItem}>
              <Avatar.Icon size={20} icon="trophy" color="#DAA520" style={{ backgroundColor: 'transparent' }} />
              <Text style={[styles.footerText, { color: '#555' }]}>Gold</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }, []);

  const renderEventItem = useCallback(({ item, index }: { item: EventItem; index: number }) => {
    const start = new Date(item.start_at);
    const isEven = index % 2 === 0;
    const cardColor = isEven ? '#6A1B9A' : '#E65100'; 
    
    return (
      <Card 
        style={[styles.eventCard, { backgroundColor: cardColor }]}
        onPress={() => router.push({ pathname: "/event/[id]", params: { id: item.id } })}
      >
        <View style={styles.eventCardInner}>
          <View style={{flex: 1}}>
             <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
             <Text style={styles.eventSubtitle}>{start.toDateString()} • {start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
             <View style={styles.locationRow}>
                <Avatar.Icon size={20} icon="map-marker" color="white" style={{backgroundColor:'transparent'}} />
                <Text style={styles.eventLocation}>{item.location || "Online"}</Text>
             </View>
          </View>
          
          <Button 
            mode="contained" 
            onPress={() => console.log('Join Event')} 
            buttonColor="rgba(255,255,255,0.2)"
            compact
            labelStyle={{ fontSize: 12 }}
          >
            Join
          </Button>
        </View>
      </Card>
    );
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // Page Structure
  // ────────────────────────────────────────────────────────────────────────────

  const ListHeader = (
    <View>
      <View style={styles.headerContainer}>
        
        <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
                <IconButton icon="menu" size={28} iconColor="#333" style={{ margin: 0 }} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('home')}</Text>
        </View>

        <View style={styles.headerRight}>
            <WalletChip /> 

            {/* 🟢 Notification Bell with Count */}
            <View style={styles.iconButton}>
                <IconButton 
                    icon="bell-outline" 
                    size={24} 
                    iconColor="#333" 
                    onPress={() => router.push('/notifications')} // Navigate to notification screen
                />
                {unreadCount > 0 && (
                    <Badge 
                        size={16} 
                        style={{ position: 'absolute', top: 5, right: 5, backgroundColor: 'red' }}
                    >
                        {unreadCount}
                    </Badge>
                )}
            </View>

            <TouchableOpacity onPress={() => router.push('/(drawer)/(tabs)/profile')}>
                <Avatar.Image 
                    size={34} 
                    source={{ uri: session?.user?.user_metadata?.avatar_url || 'https://i.pravatar.cc/150?img=12' }} 
                />
            </TouchableOpacity>
        </View>

      </View>

      <Searchbar
       placeholder={t('searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
        style={styles.search}
        inputStyle={{minHeight: 0}}
      />

      <View style={styles.sectionHeader}>
         <Text style={styles.sectionTitle}>{t('expertsForYou')}</Text>
      </View>
      
      <FlatList
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={renderExpertItem}
        contentContainerStyle={styles.horizontalListContent}
      />

      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
         <Text style={styles.sectionTitle}>{t('upcomingEvents')}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderEventItem}
        ListHeaderComponent={ListHeader} 
        contentContainerStyle={styles.mainScrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          eventsLoading ? <ActivityIndicator style={{ margin: 20 }} /> : <View style={{height: 80}} />
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => router.push('/CreateEvent')} 
      />
   
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12, 
    backgroundColor: 'white',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24, 
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 0,
  },
  iconButton: {
    position: 'relative',
    marginRight: 5
  },
  // redDot removed in favor of Paper Badge, keeping style just in case of revert
  redDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'red',
    borderWidth: 1,
    borderColor: 'white'
  },

  search: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    elevation: 0,
    height: 45,
  },

  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },

  horizontalListContent: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  mainScrollContent: {
    paddingBottom: 20,
  },

  // Expert Card
  cardHorizontal: {
    backgroundColor: '#fff',
    width: 160,
    height: 210,
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'column',
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingHorizontal: 5,
    width: '100%',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 8,
    paddingHorizontal: 10,
    height: 40,
    width: '100%',
    marginTop: 20,
  },
  expertName: { fontSize: 15, fontWeight: 'bold', color: '#000', marginTop: 8, textAlign: 'center' },
  expertRole: { fontSize: 12, color: '#666', marginTop: 2, textAlign: 'center' },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 12, fontWeight: 'bold', color: '#444' },

  // Event Card
  eventCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    elevation: 4,
    height: 110, 
  },
  eventCardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  eventSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventLocation: {
    color: '#ffffff',
    fontSize: 12,
    marginLeft: 4,
  },

  // FAB
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#4A90E2', 
    borderRadius: 50, 
  },
  
  // Modal
  modal: {
    margin: 20,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
  }
});
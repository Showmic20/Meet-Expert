import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, SectionList, TouchableOpacity, Alert, Image, StyleSheet, SafeAreaView, StatusBar } from "react-native";
import {
  ActivityIndicator,
  Avatar,
  IconButton,
  Snackbar,
  Text,
  Divider,
} from "react-native-paper";
import { supabase } from "../../lib/superbase";
import { useAuth } from "../../lib/AuthProvid";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type RequestRowBase = {
  id: number;
  requester_id: string;
  expert_id: string;
  plan: string | null;
  status: "pending" | "accepted" | "rejected" | "canceled";
  room_id: string | null;
  created_at: string;
};
type IncomingRow = RequestRowBase & {
  requester: { first_name: string; last_name: string; profile_picture_url: string | null } | null;
};
type OutgoingRow = RequestRowBase & {
  expert: { first_name: string; last_name: string; profile_picture_url: string | null } | null;
};

export default function ChatsTab() {
  const { session } = useAuth();
  const me = session?.user?.id;

  const [incoming, setIncoming] = useState<IncomingRow[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [snack, setSnack] = useState<{ visible: boolean; text: string }>({ visible: false, text: "" });

  const showSnack = (text: string) => setSnack({ visible: true, text });

  const normalizePair = (a: string, b: string) => (a < b ? { a, b } : { a: b, b: a });

  const getOrCreateRoom = useCallback(async (u1: string, u2: string) => {
    const { a, b } = normalizePair(u1, u2);

    const { data: existing, error: findErr } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("participant_a", a)
      .eq("participant_b", b)
      .maybeSingle();

    if (findErr) console.warn("find room error", findErr);
    if (existing) return existing.id;

    const { data: created, error: createErr } = await supabase
      .from("chat_rooms")
      .insert({ participant_a: a, participant_b: b })
      .select("id")
      .single();

    if (createErr) throw createErr;
    return created.id;
  }, []);

  const fetchIncoming = useCallback(async () => {
    if (!me) return;
    const { data, error } = await supabase
      .from("chat_requests")
      .select(`
        id, requester_id, expert_id, plan, status, room_id, created_at,
        requester:requester_id ( first_name, last_name, profile_picture_url )
      `)
      .eq("expert_id", me)
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("fetchIncoming error", error);
      return;
    }
    setIncoming((data ?? []) as any);
  }, [me]);

  const fetchOutgoing = useCallback(async () => {
    if (!me) return;
    const { data, error } = await supabase
      .from("chat_requests")
      .select(`
        id, requester_id, expert_id, plan, status, room_id, created_at,
        expert:expert_id ( first_name, last_name, profile_picture_url )
      `)
      .eq("requester_id", me) // ← requester is me
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("fetchOutgoing error", error);
      return;
    }
    setOutgoing((data ?? []) as any);
  }, [me]);

  const fetchAll = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    await Promise.all([fetchIncoming(), fetchOutgoing()]);
    setLoading(false);
  }, [me, fetchIncoming, fetchOutgoing]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // realtime for incoming (as expert)
  useEffect(() => {
    if (!me) return;
    const chIn = supabase
      .channel(`chat-requests-in-${me}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_requests", filter: `expert_id=eq.${me}` },
        fetchIncoming
      )
      .subscribe();
    return () => { supabase.removeChannel(chIn); };
  }, [me, fetchIncoming]);

  // realtime for outgoing (as requester)
  useEffect(() => {
    if (!me) return;
    const chOut = supabase
      .channel(`chat-requests-out-${me}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_requests", filter: `requester_id=eq.${me}` },
        fetchOutgoing
      )
      .subscribe();
    return () => { supabase.removeChannel(chOut); };
  }, [me, fetchOutgoing]);

  const acceptRequest = useCallback(
    async (row: IncomingRow) => {
      try {
        if (!me) return;
        setBusyId(row.id);
        const roomId = await getOrCreateRoom(me, row.requester_id);
        const { error } = await supabase
          .from("chat_requests")
          .update({ status: "accepted", room_id: roomId })
          .eq("id", row.id);
        if (error) throw error;
        showSnack("Request accepted");
        router.push({ pathname: "/chats/[id]", params: { id: roomId } });
      } catch (e) {
        console.warn("accept error", e);
        Alert.alert("Error", "Could not accept request.");
      } finally {
        setBusyId(null);
      }
    },
    [me, getOrCreateRoom]
  );

  const rejectRequest = useCallback(
    async (row: IncomingRow) => {
      try {
        setBusyId(row.id);
        const { error } = await supabase
          .from("chat_requests")
          .update({ status: "rejected" })
          .eq("id", row.id);
        if (error) throw error;
        showSnack("Request rejected");
      } catch (e) {
        console.warn("reject error", e);
        Alert.alert("Error", "Could not reject request.");
      } finally {
        setBusyId(null);
      }
    },
    []
  );

  const onCardPress = useCallback((row: RequestRowBase) => {
    if (row.status === "accepted" && row.room_id) {
      router.push({ pathname: "/chats/[id]", params: { id: row.room_id } });
    } else {
      setSnack({ visible: true, text: "Waiting for acceptance." });
    }
  }, []);

  const sections = useMemo(
    () => [
      { title: "Incoming", data: incoming as RequestRowBase[], kind: "incoming" as const },
      { title: "Outgoing", data: outgoing as RequestRowBase[], kind: "outgoing" as const },
    ],
    [incoming, outgoing]
  );

  if (!me) return <View style={styles.centerContainer}><Text>Sign in</Text></View>;
  if (loading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#000" /></View>;

  // ─────────────────────────────────────────────────────────────────────────────
  // UI COMPONENTS
  // ─────────────────────────────────────────────────────────────────────────────

  // 1. Top Header mimicking the image
  const ChatHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>Chats</Text>
      <View style={styles.headerIcons}>
        <View style={styles.iconWrapper}>
            <MaterialCommunityIcons name="database" size={20} color="#FFA500" />
        </View>
        <TouchableOpacity style={{marginLeft: 15}}>
             <MaterialCommunityIcons name="bell-outline" size={24} color="#5C6BC0" />
        </TouchableOpacity>
        <TouchableOpacity style={{marginLeft: 15}}>
             <Avatar.Image size={30} source={{uri: 'https://i.pravatar.cc/100'}} /> 
        </TouchableOpacity>
      </View>
    </View>
  );

  // 2. Banner for "Chat Requests" (Gray Box)
  const RequestsBanner = () => {
    // Filter only pending incoming for the banner count/visuals
    const pendingReqs = incoming.filter(i => i.status === 'pending');
    if (pendingReqs.length === 0) return null;

    return (
      <View style={styles.bannerContainer}>
        <Text style={styles.bannerText}>{pendingReqs.length} Chat requests</Text>
        <View style={styles.avatarPile}>
          {pendingReqs.slice(0, 3).map((req, index) => (
             <Avatar.Image 
                key={req.id} 
                size={30} 
                source={{uri: req.requester?.profile_picture_url || "https://via.placeholder.com/150"}}
                style={[styles.pileAvatar, { right: index * 18, zIndex: 10 - index }]} // Overlap logic
             />
          ))}
          {pendingReqs.length > 0 && (
             <View style={[styles.pileAvatar, { right: -5, zIndex: 20, backgroundColor: '#4CAF50', width: 10, height: 10, borderRadius: 5, position: 'absolute', bottom: 0 }]} />
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <ChatHeader />

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<RequestsBanner />}
        stickySectionHeadersEnabled={false} // Disable sticky to match flat look
        renderSectionHeader={({ section }) => {
            // Optional: Hide textual headers if you only want the banner, 
            // or keep them subtle.
            if(section.data.length === 0) return null;
            return <Text style={styles.sectionHeader}>{section.title}</Text>;
        }}
        ItemSeparatorComponent={() => <Divider style={styles.divider} />}
        renderItem={({ item, section }) => {
          const isIncoming = section.kind === "incoming";
          const rowData = isIncoming ? (item as IncomingRow) : (item as OutgoingRow);
          
          const person = isIncoming ? (rowData as IncomingRow).requester : (rowData as OutgoingRow).expert;
          const name = person ? `${person.first_name} ${person.last_name}`.trim() : "Unknown User";
          const avatarUri = person?.profile_picture_url || "https://i.pravatar.cc/150?img=12";
          
          // Mimic "I have done this" or Last message style
          const subText = item.status === 'accepted' ? "Tap to chat" : `Plan: ${item.plan || '-'} min`;
          const time = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          const isAccepted = item.status === 'accepted';
          const isPending = item.status === 'pending';

          return (
            <TouchableOpacity onPress={() => onCardPress(item)} activeOpacity={0.7} style={styles.rowItem}>
              {/* Avatar Section */}
              <View style={styles.avatarContainer}>
                <Avatar.Image size={55} source={{ uri: avatarUri }} />
                {/* Green Dot for Accepted (Online simulation) */}
                {isAccepted && <View style={styles.onlineDot} />}
              </View>

              {/* Text Section */}
              <View style={styles.textContainer}>
                <Text style={styles.nameText} numberOfLines={1}>{name}</Text>
                <Text style={styles.messageText} numberOfLines={1}>
                    {isPending ? "Request Pending..." : subText}
                </Text>
              </View>

              {/* Right Side: Time or Actions */}
              <View style={styles.rightContainer}>
                {isIncoming && isPending ? (
                    // Actions for Pending Requests (Inline to keep list clean)
                    <View style={{flexDirection: 'row'}}>
                        <IconButton 
                            icon="check" size={20} 
                            containerColor="#E8F5E9" iconColor="#4CAF50"
                            onPress={() => acceptRequest(rowData as IncomingRow)} 
                            disabled={busyId === item.id}
                        />
                         <IconButton 
                            icon="close" size={20} 
                            containerColor="#FFEBEE" iconColor="#F44336"
                            onPress={() => rejectRequest(rowData as IncomingRow)} 
                            disabled={busyId === item.id}
                        />
                    </View>
                ) : (
                    // Normal Chat View
                    <Text style={styles.timeText}>{time}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>No chats found.</Text>}
      />

      <Snackbar visible={snack.visible} onDismiss={() => setSnack({ visible: false, text: "" })} duration={2200}>
        {snack.text}
      </Snackbar>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Header
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
     // Optional: mimic the coin stack icon background if needed
  },

  // Banner
  bannerContainer: {
    backgroundColor: '#E0E0E0', // Gray color from image
    borderRadius: 15,
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 70,
  },
  bannerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  avatarPile: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80, 
    height: 40,
    position: 'relative',
  },
  pileAvatar: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#E0E0E0', // Blend with background
  },

  // List
  listContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#888',
    backgroundColor: '#FAFAFA',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 80, // Indent divider to align with text
  },
  
  // Row Parts
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  onlineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50', // Green dot
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#fff',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#757575',
  },
  rightContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    color: '#999',
  },
});
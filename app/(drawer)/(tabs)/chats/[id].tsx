import React, { useCallback, useEffect, useRef, useState } from "react";
import { 
  View, FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, 
  TouchableOpacity, Alert 
} from "react-native";
import { 
  Appbar, ActivityIndicator, IconButton, Text, Avatar, Menu, Divider, Provider 
} from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";

// 🟢 ৪ লেভেল উপরে গিয়ে Root ফোল্ডার থেকে ফাইল নেওয়া হচ্ছে
import { supabase } from "../../../../app/lib/superbase"; 
import { useAuth } from "../../../../app/lib/AuthProvid";
import WriteReviewModal  from "../../../../component/WritereviewModal"; // component (singular)

type Message = {
  id: number;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
};

export default function ChatRoomScreen() {
  const router = useRouter();
  const { id: roomId } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const me = session?.user?.id;

  const [msgs, setMsgs] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const listRef = useRef<FlatList>(null);

  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [targetExpertId, setTargetExpertId] = useState<string | null>(null);

  // Menu State
  const [visible, setVisible] = useState(false);
  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  // ১. চ্যাট রুম ও ইউজার লোড
// ১. চ্যাট রুম এবং ইউজার লোড করা (Error Handling সহ)
 // ১. চ্যাট রুম এবং ইউজার লোড করা (আপনার টেবিল কলাম অনুযায়ী ফিক্সড)
  useEffect(() => {
    const fetchRoomAndUser = async () => {
      if (!roomId || !me) return;

      console.log("Fetching Room Data for:", roomId);

      // 🔴 পরিবর্তন: user_id/expert_id এর বদলে participant_a/participant_b কল করা হচ্ছে
      const { data: roomData, error: roomError } = await supabase
        .from('chat_rooms')
        .select('participant_a, participant_b') 
        .eq('id', roomId)
        .single();

      if (roomError) {
        console.error("Room Fetch Error:", roomError);
        Alert.alert("Error", "Could not load chat room.");
        return;
      }

      if (roomData) {
        console.log("Room Data Found:", roomData);
        
        // 🟢 লজিক: আমি যদি 'A' হই, তবে অপরপক্ষ 'B'। আর আমি 'B' হলে অপরপক্ষ 'A'।
        const otherUserId = roomData.participant_a === me ? roomData.participant_b : roomData.participant_a;
        
        // 🟢 টার্গেট সেট করা: আমরা অপরপক্ষকেই রিভিউ দেব
        setTargetExpertId(otherUserId);

        // অপরপক্ষের প্রোফাইল লোড করা
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, first_name, last_name, profile_picture_url')
            .eq('id', otherUserId)
            .single();
        
        if (userData) {
            setOtherUser(userData);
        } else if (userError) {
             console.error("User Fetch Error:", userError);
        }
      }
    };
    fetchRoomAndUser();
  }, [roomId, me]);

  const handleViewProfile = () => {
    closeMenu();
    if (otherUser?.id) {
        Alert.alert("Action", `Viewing ${otherUser.first_name}'s profile`);
    }
  };

  const handleReport = () => {
    closeMenu();
    router.push({
      pathname: "/report",
      params: { roomId: roomId } 
    });
  };

const handleReview = () => {
    closeMenu();

    // ডিবাগিং: যদি টার্গেট আইডি না থাকে, তবে আমরা দেখব কেন নেই
    if (!targetExpertId) {
        Alert.alert(
            "Debug Info (Why Failed?)",
            `Me (My ID): ${me}
            \nRoom ID: ${roomId}
            \nData Loaded?: ${loading ? "No, Loading..." : "Yes"}
            \nExpert ID Found?: ${targetExpertId ? "Yes" : "No (Null)"}`,
            [{ text: "OK" }]
        );
        return;
    }

    setReviewModalVisible(true);
  };
  const loadMessages = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, room_id, sender_id, content, created_at")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });
    if (!error) setMsgs((data ?? []) as any);
    setLoading(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
  }, [roomId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  useEffect(() => {
    if (!roomId) return;
    const ch = supabase
      .channel(`chat-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMsgs((prev) => [...prev, payload.new as Message]);
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId]);

  const send = useCallback(async () => {
    if (!text.trim() || !roomId || !me) return;
    const content = text.trim();
    setText("");

    const optimistic: Message = {
      id: -Date.now(),
      room_id: roomId,
      sender_id: me,
      content,
      created_at: new Date().toISOString(),
    };
    setMsgs((prev) => [...prev, optimistic]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    const { error } = await supabase.from("chat_messages").insert({
      room_id: roomId,
      sender_id: me,
      content,
    });
    
    if (error) {
      setMsgs((prev) => prev.filter((m) => m.id !== optimistic.id));
      Alert.alert("Error", "Failed to send message");
    } else {
      await supabase.from("chat_rooms").update({ last_message_at: new Date().toISOString() }).eq("id", roomId);
    }
  }, [text, roomId, me]);

  const renderItem = ({ item }: { item: Message }) => {
    const isSystem = item.sender_id === "system";
    const mine = item.sender_id === me;

    if (isSystem) {
      return (
        <View style={styles.systemMsgContainer}>
          <Text style={styles.systemMsgText}>{item.content}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
        {!mine && (
           <Avatar.Image 
             size={28} 
             source={{ uri: otherUser?.profile_picture_url || 'https://via.placeholder.com/150' }} 
             style={{marginRight: 8, backgroundColor: '#e0e0e0'}} 
           />
        )}
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={[styles.msgText, mine ? styles.msgTextMine : styles.msgTextTheirs]}>{item.content}</Text>
          <Text style={[styles.timeText, mine ? { color: '#bbdefb' } : { color: '#888' }]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Provider>
      <View style={styles.screen}>
        <Appbar.Header style={styles.header}>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content 
            title={
                <View style={styles.headerContent}>
                    <Avatar.Image size={35} source={{ uri: otherUser?.profile_picture_url || 'https://via.placeholder.com/150' }} /> 
                    <View style={{marginLeft: 10}}>
                        <Text style={styles.headerName}>{otherUser ? `${otherUser.first_name} ${otherUser.last_name}` : 'Chat'}</Text>
                        <Text style={styles.headerStatus}>Active Now</Text>
                    </View>
                </View>
            } 
          />
          {/* Menu Button */}
          <Menu
            visible={visible}
            onDismiss={closeMenu}
            contentStyle={{ backgroundColor: 'white', borderRadius: 12 }}
            anchor={
              // 🔴 ফিক্স: বাটনটিকে একটি View এর ভেতর রাখা হয়েছে যাতে এটি হারিয়ে না যায়
              <View>
                <Appbar.Action 
                  icon="dots-vertical" 
                  color="black" // 🔴 ফিক্স: কালার ফিক্স করা হয়েছে (অনেক সময় সাদা হয়ে যায়)
                  onPress={openMenu} 
                />
              </View>
            }
          >
            <Menu.Item leadingIcon="alert-circle-outline" onPress={handleReport} title="Report" />
            <Divider />
            <Menu.Item leadingIcon="star-outline" onPress={handleReview} title="Write Review" />
          </Menu>
        </Appbar.Header>

        {loading ? (
          <View style={styles.loadingContainer}><ActivityIndicator animating color="#2196F3" size="large" /></View>
        ) : (
          <FlatList
            ref={listRef}
            data={msgs}
            keyExtractor={(m) => String(m.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} keyboardVerticalOffset={0}>
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
                <TextInput style={styles.input} placeholder="Type a message..." value={text} onChangeText={setText} multiline />
                <TouchableOpacity onPress={send} disabled={!text.trim()} style={styles.sendBtn}>
                    <IconButton icon="send" iconColor="white" size={20} style={{margin:0}} />
                </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        <WriteReviewModal visible={reviewModalVisible} onClose={() => setReviewModalVisible(false)} expertId={targetExpertId} />
      </View>
    </Provider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f7fb" },
  header: { backgroundColor: "white", elevation: 2 },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  headerName: { fontSize: 16, fontWeight: 'bold' },
  headerStatus: { fontSize: 10, color: 'green' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 20 },
  row: { width: "100%", marginVertical: 6, flexDirection: "row", alignItems: 'flex-end' },
  rowMine: { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start" },
  bubble: { maxWidth: "75%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, elevation: 1 },
  bubbleMine: { backgroundColor: "#2196F3", borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: "white", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#eee' },
  msgText: { fontSize: 15, lineHeight: 22 },
  msgTextMine: { color: "white" },
  msgTextTheirs: { color: "#333" },
  timeText: { fontSize: 10, marginTop: 4, textAlign: "right", alignSelf: 'flex-end' },
  systemMsgContainer: { alignItems: 'center', marginVertical: 10 },
  systemMsgText: { color: 'red', fontSize: 12, backgroundColor: '#ffebee', padding: 4, borderRadius: 4 },
  inputContainer: { padding: 10, backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  inputWrapper: { flexDirection: "row", alignItems: "flex-end", backgroundColor: "#f5f5f5", borderRadius: 30, paddingHorizontal: 10, paddingVertical: 5 },
  input: { flex: 1, minHeight: 40, maxHeight: 100, paddingHorizontal: 10, paddingVertical: 10, fontSize: 16, color: '#333' },
  sendBtn: { backgroundColor: "#2196F3", borderRadius: 25, width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 2, marginLeft: 5 },
});
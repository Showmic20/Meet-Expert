import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput } from "react-native";
import { Appbar, ActivityIndicator, IconButton, Text } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../../lib/superbase";
import { useAuth } from "../../../lib/AuthProvid";

type Message = {
  id: number;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
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
    // small delay to ensure list renders before scroll
    setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
  }, [roomId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // realtime listener
  useEffect(() => {
    if (!roomId) return;
    const ch = supabase
      .channel(`chat-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMsgs((prev) => [...prev, payload.new as Message]);
          listRef.current?.scrollToEnd({ animated: true });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId]);

  const send = useCallback(async () => {
    if (!text.trim() || !roomId || !me) return;
    const content = text.trim();
    setText("");

    // optimistic message (temporary id: -Date.now())
    const optimistic: Message = {
      id: -Date.now(),
      room_id: roomId,
      sender_id: me,
      content,
      created_at: new Date().toISOString(),
    };
    setMsgs((prev) => [...prev, optimistic]);
    listRef.current?.scrollToEnd({ animated: true });

    // insert
    const { error } = await supabase.from("chat_messages").insert({
      room_id: roomId,
      sender_id: me,
      content,
    });
    if (error) {
      // on error, remove optimistic one and show a simple system note
      setMsgs((prev) => prev.filter((m) => m.id !== optimistic.id));
      setMsgs((prev) => [
        ...prev,
        {
          id: -Date.now() - 1,
          room_id: roomId,
          sender_id: "system",
          content: "Failed to send message.",
          created_at: new Date().toISOString(),
        } as any,
      ]);
    } else {
      // update room timestamp (optional)
      await supabase
        .from("chat_rooms")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", roomId);
    }
  }, [text, roomId, me]);

  const renderItem = ({ item }: { item: Message }) => {
    const mine = item.sender_id === me;
    return (
      <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={[styles.msgText, mine ? styles.msgTextMine : styles.msgTextTheirs]}>{item.content}</Text>
          <Text style={styles.timeText}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <Appbar.Header mode="small">
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Chat" />
      </Appbar.Header>

      {loading ? (
        <View style={{ paddingTop: 16 }}><ActivityIndicator /></View>
      ) : (
        <FlatList
          ref={listRef}
          data={msgs}
          keyExtractor={(m) => String(m.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 12 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        keyboardVerticalOffset={Platform.select({ ios: 64, android: 0 })}
      >
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Write a message..."
            value={text}
            onChangeText={setText}
            multiline
          />
          <IconButton icon="send" onPress={send} disabled={!text.trim()} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "white" },
  row: { width: "100%", marginVertical: 4, flexDirection: "row" },
  rowMine: { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", borderRadius: 16, padding: 10 },
  bubbleMine: { backgroundColor: "#e3f2fd", borderTopRightRadius: 4 },
  bubbleTheirs: { backgroundColor: "#f0f0f0", borderTopLeftRadius: 4 },
  msgText: { fontSize: 16 },
  msgTextMine: { color: "#0d47a1" },
  msgTextTheirs: { color: "#222" },
  timeText: { fontSize: 10, color: "#777", marginTop: 4, textAlign: "right" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
    backgroundColor: "white",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});

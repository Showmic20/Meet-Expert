import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, SectionList, TouchableOpacity, Alert } from "react-native";
import {
  ActivityIndicator,
  Avatar,
  Card,
  Chip,
  IconButton,
  Snackbar,
  Text,
} from "react-native-paper";
import { supabase } from "../../lib/superbase";
import { useAuth } from "../../lib/AuthProvid";
import { router } from "expo-router";

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

  if (!me) return <View style={{ padding: 16 }}><Text>Sign in</Text></View>;
  if (loading) return <View style={{ padding: 16 }}><ActivityIndicator /></View>;

  return (
    <>
      {/* TEMP DEBUG so we know whom we’re querying for */}
      {__DEV__ && (
        <Text style={{ color: "gray", textAlign: "center", marginTop: 4, fontSize: 12 }}>
          debug → me: {me}
        </Text>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 12 }}
        renderSectionHeader={({ section }) => (
          <Text style={{ fontSize: 16, fontWeight: "600", marginTop: 8, marginBottom: 6 }}>
            {section.title}
          </Text>
        )}
        renderItem={({ item, section }) => {
          const isIncoming = section.kind === "incoming";
          const name =
            isIncoming
              ? (item as IncomingRow).requester
                ? `${(item as IncomingRow).requester!.first_name} ${(item as IncomingRow).requester!.last_name}`.trim()
                : (item as IncomingRow).requester_id
              : (item as OutgoingRow).expert
                ? `${(item as OutgoingRow).expert!.first_name} ${(item as OutgoingRow).expert!.last_name}`.trim()
                : (item as OutgoingRow).expert_id;

          const avatarUri =
            isIncoming
              ? (item as IncomingRow).requester?.profile_picture_url || "https://via.placeholder.com/150"
              : (item as OutgoingRow).expert?.profile_picture_url || "https://via.placeholder.com/150";

          const planText = item.plan ? `${item.plan} min` : "—";

          return (
            <TouchableOpacity onPress={() => onCardPress(item)} activeOpacity={0.85}>
              <Card style={{ marginBottom: 10, borderRadius: 12 }}>
                <Card.Title
                  title={name}
                  subtitle={`Requested: ${new Date(item.created_at).toLocaleString()} • Plan: ${planText}`}
                  left={(props) => <Avatar.Image {...props} size={36} source={{ uri: avatarUri }} />}
                  right={() => (
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Chip compact style={{ marginRight: 4 }}>
                        {item.status === "accepted" ? "Accepted" : "Pending"}
                      </Chip>
                      {isIncoming && item.status === "pending" ? (
                        <>
                          <IconButton
                            icon="check-circle"
                            iconColor="green"
                            disabled={busyId === item.id}
                            onPress={() => acceptRequest(item as IncomingRow)}
                          />
                          <IconButton
                            icon="close-circle"
                            iconColor="red"
                            disabled={busyId === item.id}
                            onPress={() => rejectRequest(item as IncomingRow)}
                          />
                        </>
                      ) : null}
                    </View>
                  )}
                />
              </Card>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={{ textAlign: "center", marginTop: 24 }}>No chats yet.</Text>}
      />

      <Snackbar visible={snack.visible} onDismiss={() => setSnack({ visible: false, text: "" })} duration={2200}>
        {snack.text}
      </Snackbar>
    </>
  );
}

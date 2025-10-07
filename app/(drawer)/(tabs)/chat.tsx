import React, { useEffect, useState, useCallback } from "react";
import { View, FlatList } from "react-native";
import { Text, Card, ActivityIndicator, Avatar } from "react-native-paper";
import { supabase } from "../../lib/superbase";
import { useAuth } from "../../lib/AuthProvid";

type ChatRequestRow = {
  id: number;
  requester_id: string;
  expert_id: string;
  plan: string | null;
  status: string;
  created_at: string;
  requester: { first_name: string; last_name: string; profile_picture_url: string | null } | null;
};

export default function ChatTab() {
  const { session } = useAuth();
  const expertId = session?.user?.id;
  const [rows, setRows] = useState<ChatRequestRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!expertId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("chat_requests")
      .select(`
        id, requester_id, expert_id, plan, status, created_at,
        requester:requester_id ( first_name, last_name, profile_picture_url )
      `)
      .eq("expert_id", expertId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!error) setRows((data ?? []) as any);
    setLoading(false);
  }, [expertId]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // realtime for new/updated requests
  useEffect(() => {
    if (!expertId) return;
    const ch = supabase
      .channel(`chat-requests-${expertId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_requests", filter: `expert_id=eq.${expertId}` },
        () => fetchRequests()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [expertId, fetchRequests]);

  if (!expertId) return <View style={{padding:16}}><Text>Sign in</Text></View>;
  if (loading) return <View style={{padding:16}}><ActivityIndicator /></View>;

  return (
    <FlatList
      data={rows}
      keyExtractor={(r) => String(r.id)}
      contentContainerStyle={{ padding: 12 }}
      renderItem={({ item }) => {
        const name = item.requester ? `${item.requester.first_name} ${item.requester.last_name}`.trim() : item.requester_id;
        const planText = item.plan ? `${item.plan} min` : "—";
        return (
          <Card style={{ marginBottom: 10, borderRadius: 12 }}>
            <Card.Title
              title={name}
              subtitle={`Requested: ${new Date(item.created_at).toLocaleString()} • Plan: ${planText}`}
              left={(props) => (
                <Avatar.Image
                  {...props}
                  size={36}
                  source={{ uri: item.requester?.profile_picture_url || "https://via.placeholder.com/150" }}
                />
              )}
            />
            {/* You can add Accept/Reject buttons here later */}
          </Card>
        );
      }}
      ListEmptyComponent={<Text style={{ textAlign: "center", marginTop: 24 }}>No pending requests.</Text>}
    />
  );
}

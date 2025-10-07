import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, ScrollView, Image, StyleSheet, StatusBar, RefreshControl } from "react-native";
import {
  Text,
  Avatar,
  IconButton,
  Card,
  Button,
  ActivityIndicator,
  Chip,
  Portal,
  Modal,
  RadioButton,
  Divider,
  Snackbar ,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

// ⬇️ keep your paths
import { useAuth } from "../../lib/AuthProvid";
import { supabase } from "../../lib/superbase";

export type DBUser = {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  occupation: string | null;
  bio: string | null;
  profile_picture_url: string | null;
  is_expert: boolean;
  expert_since: string | null;
  updated_at?: string | null; // for cache-busting
  rating?: number | null;
  rank?: string | null;
  chat_subscription_bdt?: number | null;
  [key: string]: any;
};
type Plan = "15" | "30" | "60";

export default function ProfileScreen() {
  const router = useRouter();
  const { id: paramUserId } = useLocalSearchParams<{ id?: string }>();
  const { session, loading: authLoading } = useAuth();

  // if a userId is passed via route, view THAT profile; else view self
  const selfUserId = session?.user?.id as string | undefined;
  const userId = paramUserId ?? selfUserId;
  const viewingSelf = !!selfUserId && userId === selfUserId;
  const [snack, setSnack] = useState<{visible:boolean; text:string}>({visible:false, text:""});
  const [user, setUser] = useState<DBUser | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [cacheBust, setCacheBust] = useState(0);
  const showToast = (text: string) => setSnack({visible:true, text});

  // Chat modal state
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan>("30");

  const fullName = useMemo(() => {
    if (!user) return "User";
    return `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  }, [user]);

  const profession = user?.occupation || "—";
  const bio = user?.bio || "Add a short bio about yourself.";
  const company = user?.company_name || "—";
  const expert = !!user?.is_expert;
  const expertSince = user?.expert_since ? new Date(user.expert_since).toLocaleDateString() : "—";

  const rating = user?.rating ?? null;
  const rank = user?.rank ?? null;
  const chatSub = user?.chat_subscription_bdt ?? null;

  const formatBDT = (n: number | null) => (n == null ? "—" : `${n.toLocaleString()} BDT`);
  
  // derived pack prices (based on per-hour subscription)
  const packPrices = useMemo(() => {
    const perHour = chatSub ?? 50;
    return {
      "15": Math.round(perHour * 0.25), // 15 mins
      "30": Math.round(perHour * 0.5),  // 30 mins
      "60": Math.round(perHour * 1.0),  // 60 mins
    };
  }, [chatSub]);

  // Build cache-busted avatar URL so RN reloads on changes
  const avatarSrc = useMemo(() => {
    const base = user?.profile_picture_url || "https://via.placeholder.com/150";
    const ver = user?.updated_at ?? cacheBust; // if updated_at missing, fall back to local bump
    return `${base}?v=${encodeURIComponent(String(ver))}`;
  }, [user?.profile_picture_url, user?.updated_at, cacheBust]);

  const fetchUser = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();
    if (error) throw error;
    setUser(data as DBUser);
    setCacheBust((n) => n + 1); // ensure avatar refreshes even if updated_at didn't change
  }, [userId]);

  const fetchSkills = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("user_skills")
      .select("skill_id, skills(name)")
      .eq("user_id", userId);
    if (error) throw error;
    const names = (data ?? []).map((row: any) => row.skills?.name).filter(Boolean);
    setSkills(names);
  }, [userId]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchUser(), fetchSkills()]);
    } catch (e) {
      console.warn("Profile fetch error", e);
    } finally {
      setLoading(false);
    }
  }, [fetchUser, fetchSkills]);

  // initial + when auth or target changes
  useEffect(() => {
    if (!authLoading && userId) {
      fetchAll();
    }
  }, [authLoading, userId, fetchAll]);

  // realtime: refresh when the viewed user's row changes
  useEffect(() => {
    if (!userId) return;
    const usersChannel = supabase
      .channel(`users-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "users", filter: `id=eq.${userId}` },
        (payload) => {
          setUser(payload.new as DBUser);
          setCacheBust((n) => n + 1);
        }
      )
      .subscribe();

    const skillsChannel = supabase
      .channel(`user-skills-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_skills", filter: `user_id=eq.${userId}` },
        () => fetchSkills()
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "user_skills", filter: `user_id=eq.${userId}` },
        () => fetchSkills()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(skillsChannel);
    };
  }, [userId, fetchSkills]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  // Start Chat handler (navigate to your chat screen)
const onStartChat = useCallback(async () => {
  if (!userId || !selfUserId) return;

  try {
    // prevent self-requests
    if (viewingSelf) {
      showToast("You can't start a chat with yourself.");
      return;
    }

    // insert row
    const { error } = await supabase.from("chat_requests").insert({
      requester_id: selfUserId,    // me (non-expert)
      expert_id: userId,           // viewed profile (expert)
      plan: selectedPlan,          // "15" | "30" | "60"
      status: "pending",
    });

    if (error) throw error;

    showToast("Chat request sent!");
    setChatOpen(false);

    // optional: jump to my Chat tab to see outgoing
    // router.push("/chat"); // only if you have a chat tab route
  } catch (e: any) {
    console.warn("Chat request error:", e);
    showToast("Failed to send request.");
  }
}, [userId, selfUserId, viewingSelf, selectedPlan]);


  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
        {(authLoading || loading) && (
          <View style={{ paddingTop: 8 }}>
            <ActivityIndicator animating size={24} />
          </View>
        )}

        <ScrollView
          style={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Cover Photo */}
          <View style={styles.coverContainer}>
            <Image source={{ uri: "https://picsum.photos/1200/240" }} style={styles.coverPhoto} />

            {/* Profile Picture */}
            <View style={styles.avatarWrapper}>
              <Avatar.Image key={avatarSrc} size={96} source={{ uri: avatarSrc }} />
              {viewingSelf ? (
                <IconButton
                  icon="camera"
                  size={18}
                  style={styles.avatarEdit}
                  onPress={() => {
                    /* navigation to avatar picker */
                  }}
                />
              ) : null}
            </View>
          </View>

          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.name}>{fullName}</Text>
            <Text style={styles.profession}>{profession}</Text>
            <View style={{ marginTop: 8 }}>
              {expert ? (
                <Chip icon="star" compact>Expert since {expertSince}</Chip>
              ) : (
                <Chip icon="account-clock" compact>Not an expert yet</Chip>
              )}
            </View>
          </View>

          {/* Info Cards — Rating, Rank, Chat */}
          <View style={styles.infoCards}>
              <Card style={styles.infoCards} onPress={undefined}>
    <Card.Content style={styles.cardContent}>
      <Text>⭐ {rating == null ? "—" : Number(rating).toFixed(1)}</Text>
      <Text>Rating</Text>
    </Card.Content>
  </Card>

  <Card style={styles.infoCards} onPress={undefined}>
    <Card.Content style={styles.cardContent}>
      <Text>🏆 {rank || "—"}</Text>
      <Text>Rank</Text>
    </Card.Content>
  </Card>

  {/* Make THE card itself pressable (no overlay, no absolute) */}
  <Card
    style={styles.infoCards}
    onPress={!viewingSelf ? () => setChatOpen(true) : undefined}
  >
    <Card.Content style={styles.cardContent}>
      <Text>💬 {formatBDT(chatSub)}</Text>
      <Text>Chat</Text>
      {!viewingSelf ? (
        <Text style={{ color: "gray", marginTop: 4 }}>Tap to choose a pack</Text>
      ) : null}
    </Card.Content>
  </Card>
          </View>

          {/* About Section — company & occupation */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>About</Text>
            </View>
            <Text style={styles.aboutLine}>
              🏢 Company: <Text style={{ fontWeight: "600" }}>{company}</Text>
            </Text>
            <Text style={styles.aboutLine}>
              🧑‍💻 Occupation: <Text style={{ fontWeight: "600" }}>{profession}</Text>
            </Text>
          </View>

          {/* Bio Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Bio</Text>
              {viewingSelf ? (
                <IconButton icon="pencil" size={18} onPress={() => { /* navigation.navigate('EditBio') */ }} />
              ) : null}
            </View>
            <Text style={styles.bio}>{bio}</Text>
          </View>

          {/* Skills Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Skills</Text>
              {viewingSelf ? (
                <Button mode="outlined" onPress={() => { /* navigation.navigate('EditSkills') */ }}>Edit</Button>
              ) : null}
            </View>
            {skills.length > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {skills.map((s, i) => (
                  <Chip key={`${s}-${i}`} compact>{s}</Chip>
                ))}
              </View>
            ) : (
              <Text style={{ color: "gray" }}>No skills added yet.</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* CHAT PACK MODAL */}
      <Portal>
        <Modal
          visible={chatOpen}
          onDismiss={() => setChatOpen(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Choose a chat pack</Text>
          <Text style={styles.modalSubtitle}>
            {chatSub ? `Base rate: ${formatBDT(chatSub)} / hour` : "No pricing set."}
          </Text>

          <Divider style={{ marginVertical: 8 }} />
<RadioButton.Group
  value={selectedPlan}
  onValueChange={(v) => setSelectedPlan(v as Plan)}
>
  <RadioButton.Item
    value="15"
    label={`15 minutes — ${formatBDT(packPrices["15"])}`}
    position="leading"
  />
  <RadioButton.Item
    value="30"
    label={`30 minutes — ${formatBDT(packPrices["30"])}`}
    position="leading"
  />
  <RadioButton.Item
    value="60"
    label={`60 minutes — ${formatBDT(packPrices["60"])}`}
    position="leading"
  />
</RadioButton.Group>

          <Button
            mode="contained"
            style={{ marginTop: 16 }}
           // disabled={!userId || !chatSub}
            onPress={onStartChat}
          >
            Start Chat
          </Button>

          <Button style={{ marginTop: 8 }} onPress={() => setChatOpen(false)}>Cancel</Button>
        </Modal>
      </Portal>
      <Snackbar
        visible={snack.visible}
        onDismiss={() => setSnack({visible:false, text:""})}
        duration={2500}
          >
        {snack.text}
</Snackbar>

    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  coverContainer: { position: "relative" },
  coverPhoto: { width: "100%", height: 120 },
  avatarWrapper: { position: "absolute", bottom: -48, left: "50%", marginLeft: -48 },
  avatarEdit: { position: "absolute", bottom: 0, right: 0, backgroundColor: "white" },
  userInfo: { marginTop: 60, alignItems: "center" },
  name: { fontSize: 20, fontWeight: "bold" },
  profession: { color: "gray", marginTop: 4 },
  infoCards: { flexDirection: "row", justifyContent: "space-around", marginTop: 20, paddingHorizontal: 10 },
  card: { flex: 1, marginHorizontal: 4 },
  cardContent: { alignItems: "center" },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "bold" },
  aboutLine: { color: "gray", marginTop: 4, lineHeight: 20 },
  bio: { color: "gray", marginTop: 4, lineHeight: 20 },

  // Modal
  modalContainer: {
    marginHorizontal: 20,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "600" },
  modalSubtitle: { color: "gray", marginTop: 4 },
  planRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  planText: { fontSize: 16, marginLeft: 6 },
});

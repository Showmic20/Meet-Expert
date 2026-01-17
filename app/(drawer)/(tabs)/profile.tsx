import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from 'expo-router';
import { View, ScrollView, Image, StyleSheet, StatusBar, RefreshControl, TouchableOpacity, Alert } from "react-native";
import {
  Text,
  Avatar,
  IconButton,
  Button,
  ActivityIndicator,
  Chip,
  Portal,
  Modal,
  RadioButton,
  Divider,
  Snackbar,
  Icon, 
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAuth } from "../../lib/AuthProvid";
import { supabase } from "../../lib/superbase";

// ─── TYPES ───────────────────────────────────────
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
  updated_at?: string | null;
  is_verified?: boolean; 
  rating?: number;
  total_reviews?: number; // Added for type safety
  rank?: string;
  chat_subscription_bdt?: number; 
  location?: string;
  [key: string]: any;
};

type Plan = "15" | "30" | "60";

const MOCK_EDUCATION = [
  {
    id: 1,
    school: "United International University",
    degree: "Bachelor in Law - Law Department",
    year: "2020 - 2024",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c2/United_International_University_Monogram.svg/1200px-United_International_University_Monogram.svg.png"
  },
  {
    id: 2,
    school: "Dhaka Residential Model College",
    degree: "Science Group",
    year: "2018 - 2020",
    logo: "https://upload.wikimedia.org/wikipedia/en/2/23/Dhaka_Residential_Model_College_Logo.png"
  }
];

export default function ProfileScreen() {
  const router = useRouter();
  const { id: paramUserId } = useLocalSearchParams<{ id?: string }>();
  const { session, loading: authLoading } = useAuth();

  const selfUserId = session?.user?.id as string | undefined;
  const userId = paramUserId ?? selfUserId;
  const viewingSelf = !!selfUserId && userId === selfUserId;
  
  const [snack, setSnack] = useState<{visible:boolean; text:string}>({visible:false, text:""});
  const [user, setUser] = useState<DBUser | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [cacheBust, setCacheBust] = useState(0);
  
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);

  const showToast = (text: string) => setSnack({visible:true, text});
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan>("30");

  // ─── DERIVED VALUES ─────────────────────────────
  const fullName = useMemo(() => {
    if (!user) return "User";
    return `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  }, [user]);

  const profession = user?.occupation || "—";
  const bio = user?.bio || "No bio added yet.";
  const company = user?.company_name || "";
  
  const rank = user?.rank ?? "Gold";
  const chatSub = user?.chat_subscription_bdt ?? 5; 
  const location = user?.location || "Dhaka, Bangladesh";

  const isVerifiedBoolean = user?.is_verified || verificationStatus === 'approved';

  const formatBDT = (n: number | null) => (n == null ? "—" : `$${n} / HOUR`);

  const packPrices = useMemo(() => {
    const perHour = chatSub ?? 50;
    return {
      "15": Math.round(perHour * 0.25),
      "30": Math.round(perHour * 0.5),
      "60": Math.round(perHour * 1.0),
    };
  }, [chatSub]);

  const avatarSrc = useMemo(() => {
    const base = user?.profile_picture_url || "https://via.placeholder.com/150";
    const ver = user?.updated_at ?? cacheBust;
    return `${base}?v=${encodeURIComponent(String(ver))}`;
  }, [user?.profile_picture_url, user?.updated_at, cacheBust]);

  // ─── FETCH LOGIC ────────────────────────────────
  const fetchUser = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();
    if (error) throw error;
    setUser(data as DBUser);
    setCacheBust((n) => n + 1);
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

  const fetchVerificationStatus = useCallback(async () => {
    if (!userId) return;
    try {
        const { data } = await supabase
            .from('verification_requests')
            .select('status')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        if (data) {
            setVerificationStatus(data.status);
        }
    } catch (e) {
        // console.log(e); 
    }
  }, [userId]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchUser(), fetchSkills(), fetchVerificationStatus()]);
    } catch (e) {
      console.warn("Profile fetch error", e);
    } finally {
      setLoading(false);
    }
  }, [fetchUser, fetchSkills, fetchVerificationStatus]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && userId) {
        fetchAll();
      }
    }, [authLoading, userId, fetchAll])
  );

  useEffect(() => {
    if (!userId) return;
    const usersChannel = supabase
      .channel(`users-${userId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "users", filter: `id=eq.${userId}` }, (payload) => {
          setUser(payload.new as DBUser);
          setCacheBust((n) => n + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
    };
  }, [userId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const onStartChat = useCallback(async () => {
    if (!userId || !selfUserId) return;
    try {
      if (viewingSelf) {
        showToast("You can't start a chat with yourself.");
        return;
      }
      const { error } = await supabase.from("chat_requests").insert({
        requester_id: selfUserId,
        expert_id: userId,
        plan: selectedPlan,
        status: "pending",
      });
      if (error) throw error;
      showToast("Chat request sent!");
      setChatOpen(false);
    } catch (e: any) {
      console.warn("Chat request error:", e);
      showToast("Failed to send request.");
    }
  }, [userId, selfUserId, viewingSelf, selectedPlan]);

  const renderVerificationBadge = () => {
    if (isVerifiedBoolean) {
        return (
            <>
                <Text style={styles.verifiedText}>verified</Text>
                <Icon source="check-decagram" size={16} color="#2196F3" />
            </>
        );
    }
    if (verificationStatus === 'pending') {
        return (
            <>
                <Text style={[styles.verifiedText, { color: 'orange' }]}>Pending Review</Text>
                <Icon source="clock-outline" size={16} color="orange" />
            </>
        );
    }
    return (
        <>
            <Text style={styles.unverifiedText}>Apply for verification</Text>
            <Icon source="shield-outline" size={16} color="gray" />
        </>
    );
  };

  // ─── UI RENDER ──────────────────────────────────
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }} edges={["bottom", "left", "right"]}>
        {(authLoading || loading) && (
          <View style={{ paddingTop: 8 }}>
            <ActivityIndicator animating size={24} color="#2196F3" />
          </View>
        )}

        <ScrollView
          style={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* 1. HEADER SECTION */}
          <View style={styles.headerContainer}>
            <Image source={{ uri: "https://picsum.photos/1200/400" }} style={styles.coverPhoto} />
            
            <View style={styles.avatarWrapper}>
              <Avatar.Image 
                size={110} 
                source={{ uri: avatarSrc }} 
                style={styles.avatar} 
              />
              {viewingSelf && (
                <IconButton 
                    icon="pencil" 
                    size={16} 
                    style={styles.editIcon} 
                    onPress={() => console.log("Edit Avatar")} 
                />
              )}
            </View>

            <View style={styles.basicInfoContainer}>
                <Text style={styles.nameText}>{fullName}</Text>
                
                <TouchableOpacity 
                    style={styles.verificationRow} 
                    activeOpacity={0.7}
                    onPress={() => {
                        if (!isVerifiedBoolean && viewingSelf) {
                            if (verificationStatus === 'pending') {
                                Alert.alert("Under Review", "Your documents are currently being reviewed by the admin.");
                            } else {
                                router.push("/verificationExpert");
                            }
                        }
                    }}
                >
                    {renderVerificationBadge()}
                </TouchableOpacity>

                <Text style={styles.occupationText}>{profession} {company ? `at ${company}` : ""}</Text>
                
                <View style={styles.locationRow}>
                    <Icon source="map-marker-outline" size={14} color="gray" />
                    <Text style={styles.locationText}>{location}</Text>
                </View>

                {!viewingSelf && (
                    <Button 
                        mode="contained" 
                        style={styles.followButton} 
                        buttonColor="#2196F3"
                        onPress={() => console.log("Follow Pressed")}
                    >
                        Follow
                    </Button>
                )}
            </View>
          </View>

          <Divider style={{ height: 1, backgroundColor: '#f0f0f0', marginVertical: 10 }} />

          {/* 2. STATS ROW */}
          <View style={styles.statsContainer}>
            
            {/* 🔴 CORRECTED RATING CARD (No nested Views) */}
            <TouchableOpacity 
                style={styles.statCard}
                activeOpacity={0.7}
                onPress={() => {
                    if (user?.id) {
                        // Navigate to reviews page
                        router.push(`/reviews/${user.id}`); 
                    }
                }}
            >
                <View style={styles.statHeader}>
                    <Icon source="star" size={18} color="#FFD700" />
                    <Text style={styles.statTitle}> Rating</Text>
                </View>
                
                <Text style={styles.statValue}>
                    {user?.rating ? user.rating.toFixed(1) : "0.0"}
                </Text>
                
                <Text style={styles.statSub}>
                    ({user?.total_reviews || 0} Reviews)
                </Text>
            </TouchableOpacity>

            {/* Rank Card */}
            <View style={styles.statCard}>
                <View style={styles.statHeader}><Text style={styles.statTitle}>Rank</Text></View>
                {/* Space for header */}
                <View style={{marginTop: 15, alignItems: 'center'}}> 
                    <Icon source="trophy" size={24} color="#FFD700" />
                    <Text style={styles.statValueLabel}>{rank}</Text>
                </View>
            </View>

            {/* Chat Card */}
            <TouchableOpacity 
                style={styles.statCard} 
                onPress={!viewingSelf ? () => setChatOpen(true) : undefined}
            >
                <View style={styles.statHeader}><Text style={styles.statTitle}>Chat</Text></View>
                {/* Space for header */}
                <View style={{marginTop: 15, alignItems: 'center'}}>
                    <Icon source="message-text-outline" size={24} color="#6A1B9A" />
                    <Text style={styles.statValueLabel}>{formatBDT(chatSub)}</Text>
                </View>
            </TouchableOpacity>
          </View>

          {/* 3. ABOUT SECTION */}
          <View style={styles.contentSection}>
             <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>About</Text>
             </View>
             <View style={styles.aboutBox}>
                 <Text style={styles.bioText} numberOfLines={4}>{bio}</Text>
                 <Text style={styles.seeMoreText}>see more...</Text>
             </View>
          </View>

          {/* 4. EDUCATION SECTION */}
          <View style={styles.contentSection}>
             <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Education</Text>
                <View style={styles.headerIcons}>
                    {viewingSelf && <IconButton icon="plus" size={20} onPress={() => Alert.alert("Add Education")} />}
                    {viewingSelf && <IconButton icon="pencil-outline" size={20} onPress={() => Alert.alert("Edit Education")} />}
                </View>
             </View>
             
             {MOCK_EDUCATION.map((edu, index) => (
                 <View key={edu.id}>
                    <View style={styles.listItem}>
                        <Image source={{ uri: edu.logo }} style={styles.listLogo} />
                        <View style={styles.listTextContainer}>
                            <Text style={styles.listTitle}>{edu.school}</Text>
                            <Text style={styles.listSubtitle}>{edu.year}</Text>
                            <Text style={styles.listDescription}>{edu.degree}</Text>
                        </View>
                    </View>
                    {index < MOCK_EDUCATION.length - 1 && <Divider style={{marginVertical: 10}}/>}
                 </View>
             ))}
             <Button mode="text" style={{marginTop: 5}} textColor="gray">See All</Button>
          </View>

          {/* 5. SKILLS SECTION */}
          <View style={styles.contentSection}>
             <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Skills</Text>
                <View style={styles.headerIcons}>
                    {viewingSelf && <IconButton icon="plus" size={20} onPress={() => {}} />}
                    {viewingSelf && <IconButton icon="pencil-outline" size={20} onPress={() => {}} />}
                </View>
             </View>
             
             {skills.length > 0 ? (
                 <View style={styles.skillsContainer}>
                    {skills.map((s, i) => (
                        <Chip key={i} style={styles.skillChip} textStyle={{fontSize: 12}}>{s}</Chip>
                    ))}
                 </View>
             ) : (
                 <Text style={{color: 'gray', fontStyle: 'italic'}}>No skills added.</Text>
             )}
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* CHAT MODAL */}
      <Portal>
        <Modal
          visible={chatOpen}
          onDismiss={() => setChatOpen(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Choose a chat pack</Text>
          <Text style={styles.modalSubtitle}>
            {chatSub ? `Base rate: ${formatBDT(chatSub)}` : "No pricing set."}
          </Text>
          <Divider style={{ marginVertical: 8 }} />
          <RadioButton.Group value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as Plan)}>
            <RadioButton.Item value="15" label={`15 minutes — ${formatBDT(packPrices["15"])}`} />
            <RadioButton.Item value="30" label={`30 minutes — ${formatBDT(packPrices["30"])}`} />
            <RadioButton.Item value="60" label={`60 minutes — ${formatBDT(packPrices["60"])}`} />
          </RadioButton.Group>
          <Button mode="contained" style={{ marginTop: 16 }} onPress={onStartChat}>Start Chat</Button>
          <Button style={{ marginTop: 8 }} onPress={() => setChatOpen(false)}>Cancel</Button>
        </Modal>
      </Portal>

      <Snackbar visible={snack.visible} onDismiss={() => setSnack({visible:false, text:""})} duration={2500}>
        {snack.text}
      </Snackbar>
    </>
  );
}

// ─── STYLES ──────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  headerContainer: { alignItems: 'center', marginBottom: 10 },
  coverPhoto: { width: "100%", height: 140, backgroundColor: '#ddd' },
  avatarWrapper: { marginTop: -55, elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, borderRadius: 60, position: 'relative' },
  avatar: { borderWidth: 4, borderColor: 'white' },
  editIcon: { position: "absolute", bottom: 0, right: 0, backgroundColor: "white", elevation: 2, margin: 0, width: 28, height: 28 },
  
  basicInfoContainer: { alignItems: 'center', marginTop: 10, paddingHorizontal: 20 },
  nameText: { fontSize: 22, fontWeight: 'bold', color: '#000' },
  
  verificationRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4, gap: 4, padding: 4 },
  verifiedText: { color: 'gray', fontSize: 12 },
  unverifiedText: { color: 'gray', fontSize: 12 },
  
  occupationText: { color: 'gray', fontSize: 13, marginTop: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: { color: 'gray', fontSize: 12 },
  
  followButton: { marginTop: 12, borderRadius: 20, paddingHorizontal: 30, height: 40 },

  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 10, marginBottom: 10 },
  
  // Card styles
  statCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center', // Center vertically
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    paddingTop: 30, // Header এর জন্য স্পেস
    minHeight: 100, // সব কার্ডের সমান হাইট
    position: 'relative',
    overflow: 'hidden'
  },
  
  statHeader: { backgroundColor: '#f5f5f5', width: '100%', alignItems: 'center', position: 'absolute', top: 0, height: 26, justifyContent: 'center', flexDirection: 'row', gap: 4 },
  statTitle: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  statValueLabel: { fontSize: 14, fontWeight: 'bold', marginTop: 4, color: '#000' },
  
  // Sub text style for review count
  statSub: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    fontWeight: '500',
  },

  contentSection: { paddingHorizontal: 16, marginTop: 15 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  headerIcons: { flexDirection: 'row' },
  
  aboutBox: { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  bioText: { fontSize: 13, color: '#444', lineHeight: 18 },
  seeMoreText: { fontSize: 12, color: 'gray', marginTop: 4 },

  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  listLogo: { width: 45, height: 45, borderRadius: 4, resizeMode: 'contain', marginRight: 12, backgroundColor: '#fff' },
  listTextContainer: { flex: 1 },
  listTitle: { fontSize: 14, fontWeight: '600', color: '#000' },
  listSubtitle: { fontSize: 12, color: 'gray' },
  listDescription: { fontSize: 12, color: '#555', marginTop: 2 },

  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: { backgroundColor: '#f0f0f0' },

  modalContainer: { marginHorizontal: 20, backgroundColor: "white", padding: 16, borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: "600" },
  modalSubtitle: { color: "gray", marginTop: 4 },
});
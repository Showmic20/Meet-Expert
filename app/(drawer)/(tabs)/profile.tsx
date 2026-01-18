import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from 'expo-router';
import { 
  View, 
  ScrollView, 
  Image, 
  StyleSheet, 
  StatusBar, 
  RefreshControl, 
  TouchableOpacity, 
  Alert, 
  Dimensions, 
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import {
  Text,
  Avatar,
  IconButton,
  Button,
  ActivityIndicator,
  Chip,
  Portal,
  Modal,
  Divider,
  Snackbar,
  Icon, 
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAuth } from "../../lib/AuthProvid";
import { supabase } from "../../lib/superbase";
// 🟢 Payment Modal Import (Make sure this path is correct)
import PaymentModal from "../../../component/PaymentModal";
// 🟢 Rank Modal Import (পাথ চেক করে নেবেন)
import RankModal from "../../../component/RankModal";

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
  total_reviews?: number;
  rank?: string;
  chat_subscription_bdt?: number;
  location?: string;
  availability?: string | null; 
  [key: string]: any;
};

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

const WEEKDAYS = ["SUN", "MON", "WED", "THU", "FRI", "SAT", "SUN"];

const generateDays = () => {
    const days = [];
    for (let i = 1; i <= 30; i++) {
        days.push(i);
    }
    return days;
};

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
  
  // 🟢 Chat & Payment States
  const [chatOpen, setChatOpen] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false); 
  
  // 🟢 Payment Logic States
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<{mins: number, price: number, plan: string} | null>(null);

  // 🟢 Rank Modal State
  const [showRankModal, setShowRankModal] = useState(false);

  // Custom Plan UI States
  const [duration, setDuration] = useState(30); 
  const [selectedDay, setSelectedDay] = useState(20); 
  const [selectedHour, setSelectedHour] = useState("07"); 
  const [selectedMinute, setSelectedMinute] = useState("29"); 

  // ─── DERIVED VALUES ─────────────────────────────
  const fullName = useMemo(() => {
    if (!user) return "User";
    return `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  }, [user]);

  const profession = user?.occupation || "—";
  const bio = user?.bio || "No bio added yet.";
  const company = user?.company_name || "";
  const rank = user?.rank ?? "Gold";
  const hourlyRate = user?.chat_subscription_bdt ?? 50; 
  const location = user?.location || "Dhaka, Bangladesh";
  const isVerifiedBoolean = user?.is_verified || verificationStatus === 'approved';

  const calculatedPrice = Math.round((duration / 60) * hourlyRate);
  const formatCoins = (n: number | null) => (n == null ? "—" : `${n} Coins`);

  const packages = useMemo(() => {
    return [
      { id: "basic", title: "Basic", subtitle: "For 30 min", minutes: 30, price: Math.round(hourlyRate * 0.5), features: ["Unlimited Text", "Audio Call"], isPopular: false },
      { id: "popular", title: "Popular", subtitle: "For 1 hour", minutes: 60, price: hourlyRate, features: ["Unlimited Text", "Video Call", "Priority Support"], isPopular: true },
      { id: "premium", title: "Premium", subtitle: "For 2 hours", minutes: 120, price: hourlyRate * 2, features: ["Unlimited Text", "Video Call", "File Sharing"], isPopular: false }
    ];
  }, [hourlyRate]);

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
    const { data, error } = await supabase.from("user_skills").select("skill_id, skills(name)").eq("user_id", userId);
    if (error) throw error;
    const names = (data ?? []).map((row: any) => row.skills?.name).filter(Boolean);
    setSkills(names);
  }, [userId]);

  const fetchVerificationStatus = useCallback(async () => {
    if (!userId) return;
    try {
        const { data } = await supabase.from('verification_requests').select('status').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).single();
        if (data) setVerificationStatus(data.status);
    } catch (e) {}
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

  useFocusEffect(useCallback(() => { if (!authLoading && userId) fetchAll(); }, [authLoading, userId, fetchAll]));

  useEffect(() => {
    if (!userId) return;
    const usersChannel = supabase.channel(`users-${userId}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "users", filter: `id=eq.${userId}` }, (payload) => { setUser(payload.new as DBUser); setCacheBust((n) => n + 1); }).subscribe();
    return () => { supabase.removeChannel(usersChannel); };
  }, [userId]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchAll(); setRefreshing(false); }, [fetchAll]);

  // 🟢 1. Initiate Payment
  const initiatePaymentFlow = (minutes: number, price: number, planName: string) => {
    if (!userId || !selfUserId) return;
    if (viewingSelf) {
      showToast("You can't start a chat with yourself.");
      return;
    }
    
    setPendingRequest({ mins: minutes, price: price, plan: planName });
    setChatOpen(false); 
    setPaymentOpen(true); 
  };

  // 🟢 2. Handle Payment Success
  const onPaymentSuccess = async (tranId: string) => {
    if (!pendingRequest || !userId || !selfUserId) return;
    
    try {
      setLoading(true);
      const { error } = await supabase.from('chat_requests').insert({
        requester_id: selfUserId,
        expert_id: userId,
        plan: pendingRequest.plan,
        status: 'pending', 
        // transaction_id: tranId, 
      });

      if (error) throw error;

      showToast(`Payment Success! Request Sent.`);
      setPaymentOpen(false);
      setPendingRequest(null);
      setIsCustomizing(false);

    } catch (e: any) {
      console.error("Chat Request Error:", e);

      // 🟢 FIX: ডুপ্লিকেট রিকোয়েস্ট এরর হ্যান্ডলিং (Code 23505)
      if (e.code === '23505') {
          Alert.alert("Request Already Sent", "You already have a pending request with this expert.");
          setPaymentOpen(false);
          setPendingRequest(null);
          setIsCustomizing(false);
      } else {
          Alert.alert("Error", "Payment successful but request failed to save.");
      }
    } finally {
      setLoading(false);
    }
  };

  const renderVerificationBadge = () => {
    if (isVerifiedBoolean) return <><Text style={styles.verifiedText}>verified</Text><Icon source="check-decagram" size={16} color="#2196F3" /></>;
    if (verificationStatus === 'pending') return <><Text style={[styles.verifiedText, { color: 'orange' }]}>Pending Review</Text><Icon source="clock-outline" size={16} color="orange" /></>;
    return <><Text style={styles.unverifiedText}>Apply for verification</Text><Icon source="shield-outline" size={16} color="gray" /></>;
  };

  // ─── UI RENDER ──────────────────────────────────
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }} edges={["bottom", "left", "right"]}>
        {(authLoading || loading) && ( <View style={{ paddingTop: 8 }}><ActivityIndicator animating size={24} color="#2196F3" /></View> )}

        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* HEADER */}
          <View style={styles.headerContainer}>
            <Image source={{ uri: "https://picsum.photos/1200/400" }} style={styles.coverPhoto} />
            <View style={styles.avatarWrapper}>
              <Avatar.Image size={110} source={{ uri: avatarSrc }} style={styles.avatar} />
              {viewingSelf && <IconButton icon="pencil" size={16} style={styles.editIcon} onPress={() => console.log("Edit Avatar")} />}
            </View>
            <View style={styles.basicInfoContainer}>
                <Text style={styles.nameText}>{fullName}</Text>
                <TouchableOpacity style={styles.verificationRow} activeOpacity={0.7} onPress={() => { if (!isVerifiedBoolean && viewingSelf) router.push("/verificationExpert"); }}>
                    {renderVerificationBadge()}
                </TouchableOpacity>
                <Text style={styles.occupationText}>{profession} {company ? `at ${company}` : ""}</Text>
                <View style={styles.locationRow}><Icon source="map-marker-outline" size={14} color="gray" /><Text style={styles.locationText}>{location}</Text></View>
                
                {/* Edit Profile Button */}
                {viewingSelf ? (
                    <Button 
                        mode="outlined" 
                        onPress={() => router.push('/edit-profile')} 
                        style={{ marginTop: 15, borderRadius: 20, borderColor: '#2196F3', borderWidth: 1 }}
                        textColor="#2196F3"
                        icon="account-edit"
                    >
                        Edit Profile
                    </Button>
                ) : (
                    <Button mode="contained" style={styles.followButton} buttonColor="#2196F3">
                        Follow
                    </Button>
                )}
            </View>
          </View>
          <Divider style={{ height: 1, backgroundColor: '#f0f0f0', marginVertical: 10 }} />
          
          {/* STATS */}
          <View style={styles.statsContainer}>
            <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={() => user?.id && router.push(`/reviews/${user.id}`)}>
                <View style={styles.statHeader}><Icon source="star" size={18} color="#FFD700" /><Text style={styles.statTitle}> Rating</Text></View>
                <Text style={styles.statValue}>{user?.rating ? user.rating.toFixed(1) : "0.0"}</Text>
                <Text style={styles.statSub}>({user?.total_reviews || 0} Reviews)</Text>
            </TouchableOpacity>
            
            {/* 🟢 Rank Card with Modal Trigger */}
            <TouchableOpacity 
                style={styles.statCard} 
                onPress={() => setShowRankModal(true)} // Open Rank Modal
            >
                <View style={styles.statHeader}><Text style={styles.statTitle}>Rank</Text></View>
                <View style={{marginTop: 15, alignItems: 'center'}}>
                    <Icon source="trophy" size={24} color="#FFD700" />
                    <Text style={styles.statValueLabel}>{rank}</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.statCard} onPress={!viewingSelf ? () => setChatOpen(true) : undefined}>
                <View style={styles.statHeader}><Text style={styles.statTitle}>Chat</Text></View>
                <View style={{marginTop: 15, alignItems: 'center'}}><Icon source="message-text-outline" size={24} color="#6A1B9A" /><Text style={styles.statValueLabel}>{formatCoins(hourlyRate)}/hr</Text></View>
            </TouchableOpacity>
          </View>

          {/* AVAILABILITY */}
          <View style={styles.contentSection}>
             {user?.availability ? (
                <View style={styles.availabilityContainer}>
                    <View style={styles.availIconBox}>
                        <Icon source="clock-check-outline" size={24} color="#1565C0" />
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={styles.availLabel}>Preferred Available Time</Text>
                        <Text style={styles.availValue}>{user.availability}</Text>
                    </View>
                </View>
             ) : (
                <View style={[styles.availabilityContainer, { backgroundColor: '#f9f9f9', borderColor: '#eee' }]}>
                    <Icon source="clock-outline" size={22} color="#aaa" />
                    <Text style={{marginLeft: 10, color: '#aaa', fontStyle: 'italic', fontSize: 13}}>Available time not specified</Text>
                </View>
             )}
          </View>

          {/* SECTIONS */}
          <View style={styles.contentSection}><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>About</Text></View><View style={styles.aboutBox}><Text style={styles.bioText} numberOfLines={4}>{bio}</Text><Text style={styles.seeMoreText}>see more...</Text></View></View>
          <View style={styles.contentSection}>
             <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Education</Text></View>
             {MOCK_EDUCATION.map((edu, index) => (
                 <View key={edu.id}><View style={styles.listItem}><Image source={{ uri: edu.logo }} style={styles.listLogo} /><View style={styles.listTextContainer}><Text style={styles.listTitle}>{edu.school}</Text><Text style={styles.listSubtitle}>{edu.year}</Text><Text style={styles.listDescription}>{edu.degree}</Text></View></View>{index < MOCK_EDUCATION.length - 1 && <Divider style={{marginVertical: 10}}/>}</View>
             ))}
          </View>
          <View style={styles.contentSection}>
             <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Skills</Text></View>
             {skills.length > 0 ? ( <View style={styles.skillsContainer}>{skills.map((s, i) => <Chip key={i} style={styles.skillChip} textStyle={{fontSize: 12}}>{s}</Chip>)}</View> ) : <Text style={{color: 'gray', fontStyle: 'italic'}}>No skills added.</Text>}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* 🟢 RANK MODAL */}
      <RankModal 
        visible={showRankModal} 
        onClose={() => setShowRankModal(false)} 
        currentScore={340} // ইউজার স্কোর এখানে ডায়নামিক করতে পারেন (যেমন: user.total_reviews * 10)
      />

      {/* 🟢 MODAL SYSTEM (Chat) */}
      <Portal>
        <Modal 
            visible={chatOpen} 
            onDismiss={() => { setChatOpen(false); setIsCustomizing(false); }} 
            contentContainerStyle={isCustomizing ? styles.customModalContainer : styles.modalContainer}
        >
          
          {isCustomizing ? (
            /* CUSTOMIZE PLAN UI */
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
                <View style={styles.customHeader}>
                    <TouchableOpacity onPress={() => setIsCustomizing(false)}><Icon source="chevron-left" size={28} color="#000" /></TouchableOpacity>
                    <Text style={styles.customTitle}>Customize Plan</Text>
                    <View style={{width: 28}} /> 
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}}>
                    {/* Duration Slider */}
                    <Text style={styles.label}>Select Duration</Text>
                    <View style={styles.sliderContainer}>
                        <View style={styles.sliderTrack} />
                        <View style={[styles.sliderFill, {width: `${(duration / 120) * 100}%`}]} />
                        <View style={[styles.sliderThumb, {left: `${(duration / 120) * 100}%`}]} />
                        <View style={[styles.priceTag, {left: `${(duration / 120) * 100}%`}]}>
                             <Text style={styles.priceTagText}>{duration}m / ${calculatedPrice}</Text>
                        </View>
                    </View>

                    <View style={styles.durationButtons}>
                        {[15, 30, 45, 60, 90, 120].map((m) => (
                            <TouchableOpacity key={m} onPress={() => setDuration(m)} style={[styles.dBtn, duration === m && styles.dBtnActive]}>
                                <Text style={[styles.dBtnText, duration === m && styles.dBtnTextActive]}>{m}m</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Calendar */}
                    <View style={styles.calendarHeader}>
                        <Text style={styles.label}>Select Date</Text>
                        <Text style={styles.readOnlyText}>Oct 2025</Text>
                    </View>
                    <View style={styles.calendarCard}>
                        <View style={styles.calMonthRow}>
                            <Text style={styles.calMonthTitle}>October 2025</Text>
                            <View style={{flexDirection: 'row', gap: 10}}>
                                <Icon source="chevron-left" size={20} color="#2196F3" />
                                <Icon source="chevron-right" size={20} color="#2196F3" />
                            </View>
                        </View>
                        <View style={styles.calGrid}>
                            {WEEKDAYS.map((d, i) => <Text key={i} style={styles.calWeekday}>{d}</Text>)}
                        </View>
                        <View style={styles.calGrid}>
                            {generateDays().map((d) => (
                                <TouchableOpacity key={d} style={[styles.calDay, selectedDay === d && styles.calDayActive]} onPress={() => setSelectedDay(d)}>
                                    <Text style={[styles.calDayText, selectedDay === d && styles.calDayTextActive]}>{d}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Time Picker */}
                    <Text style={[styles.label, {marginTop: 10}]}>Set time</Text>
                    <View style={styles.timePickerContainer}>
                        <View style={styles.timeInputBox}>
                             <RNTextInput 
                                value={selectedHour} 
                                onChangeText={setSelectedHour} 
                                style={styles.timeInput} 
                                keyboardType="numeric" 
                                maxLength={2} 
                                placeholder="00"
                                placeholderTextColor="#ccc"
                                underlineColorAndroid="transparent"
                             />
                             <Text style={styles.timeLabel}>Hr</Text>
                        </View>
                        <Text style={{fontSize: 24, fontWeight: 'bold', marginTop: 10}}>:</Text>
                        <View style={styles.timeInputBox}>
                             <RNTextInput 
                                value={selectedMinute} 
                                onChangeText={setSelectedMinute} 
                                style={styles.timeInput} 
                                keyboardType="numeric" 
                                maxLength={2} 
                                placeholder="00"
                                placeholderTextColor="#ccc"
                                underlineColorAndroid="transparent"
                             />
                             <Text style={styles.timeLabel}>Min</Text>
                        </View>
                    </View>
                </ScrollView>

                {/* Footer Button */}
                <View style={{marginTop: 'auto', marginBottom: 10}}>
                    <Button 
                        mode="contained" 
                        buttonColor="#0277BD" 
                        style={styles.payNowBtn} 
                        contentStyle={{height: 50}} 
                        onPress={() => initiatePaymentFlow(duration, calculatedPrice, `Custom: ${duration}m on Oct ${selectedDay} at ${selectedHour}:${selectedMinute}`)}
                    >
                        Pay now - {calculatedPrice} Coins
                    </Button>
                </View>
            </KeyboardAvoidingView>
          ) : (
            /* PACKAGES UI */
            <View>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Packages</Text>
                    <TouchableOpacity onPress={() => setChatOpen(false)}><Icon source="close-circle-outline" size={24} color="#555" /></TouchableOpacity>
                </View>

                <View style={styles.packagesRow}>
                    {packages.map((pkg) => (
                        <View key={pkg.id} style={[styles.packageCard, pkg.isPopular && styles.popularCard]}>
                            {pkg.isPopular && <View style={styles.popularBadge}><Text style={styles.popularText}>Popular</Text></View>}
                            <Text style={[styles.pkgTitle, pkg.isPopular && {color: 'white'}]}>{pkg.title}</Text>
                            <Text style={[styles.pkgSub, pkg.isPopular && {color: '#E3F2FD'}]}>{pkg.subtitle}</Text>
                            <Text style={[styles.pkgPrice, pkg.isPopular && {color: 'white'}]}>{pkg.price} <Text style={{fontSize: 10}}>Coins</Text></Text>
                            <View style={styles.featuresList}>
                                {pkg.features.map((f, i) => (
                                    <View key={i} style={{flexDirection: 'row', alignItems: 'center', marginBottom: 2}}>
                                        <Icon source="check-circle" size={10} color={pkg.isPopular ? "white" : "#4CAF50"} />
                                        <Text style={[styles.featureText, pkg.isPopular && {color: '#E3F2FD'}]} numberOfLines={1}> {f}</Text>
                                    </View>
                                ))}
                            </View>
                            <TouchableOpacity 
                                style={[styles.payButton, pkg.isPopular ? {backgroundColor: 'white'} : {backgroundColor: '#2196F3'}]} 
                                onPress={() => initiatePaymentFlow(pkg.minutes, pkg.price, `${pkg.title} (${pkg.minutes} min)`)}
                            >
                                <Text style={{fontSize: 10, fontWeight: 'bold', color: pkg.isPopular ? '#1565C0' : 'white'}}>Pay Now</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
                <Button mode="contained" buttonColor="#0277BD" style={{marginTop: 25, borderRadius: 8, width: '100%'}} onPress={() => setIsCustomizing(true)}>
                    Customize your Plan
                </Button>
            </View>
          )}
        </Modal>
      </Portal>

      {/* Payment Gateway Modal */}
      {pendingRequest && (
        <PaymentModal 
          visible={paymentOpen}
          amount={pendingRequest.price} 
          onClose={() => setPaymentOpen(false)}
          onSuccess={onPaymentSuccess}
          onFailed={() => {
              Alert.alert("Payment Failed", "Transaction was cancelled or failed.");
              setPaymentOpen(false);
          }}
        />
      )}

      <Snackbar visible={snack.visible} onDismiss={() => setSnack({visible:false, text:""})} duration={2500}>{snack.text}</Snackbar>
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
  statCard: { width: '31%', backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, borderWidth: 1, borderColor: '#f0f0f0', paddingTop: 30, minHeight: 100, position: 'relative', overflow: 'hidden' },
  statHeader: { backgroundColor: '#f5f5f5', width: '100%', alignItems: 'center', position: 'absolute', top: 0, height: 26, justifyContent: 'center', flexDirection: 'row', gap: 4 },
  statTitle: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  statValueLabel: { fontSize: 14, fontWeight: 'bold', marginTop: 4, color: '#000' },
  statSub: { fontSize: 11, color: '#888', marginTop: 4, fontWeight: '500' },
  contentSection: { paddingHorizontal: 16, marginTop: 15 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
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
  
  // Availability Styles
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD', 
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  availIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#BBDEFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  availLabel: {
    fontSize: 11,
    color: '#1565C0',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  availValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0D47A1',
  },

  // MODALS
  modalContainer: { marginHorizontal: 15, backgroundColor: "white", padding: 15, borderRadius: 16, width: '92%', alignSelf: 'center', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: '#333' },
  packagesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10, paddingHorizontal: 2 },
  packageCard: { width: '31%', backgroundColor: '#E1F5FE', borderRadius: 12, padding: 8, paddingTop: 15, alignItems: 'center', minHeight: 150, elevation: 2, justifyContent: 'space-between' },
  popularCard: { backgroundColor: '#1565C0', minHeight: 175, marginBottom: 0, zIndex: 10, elevation: 8, transform: [{translateY: -10}] },
  popularBadge: { position: 'absolute', top: -10, backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, zIndex: 20, elevation: 5 },
  popularText: { fontSize: 9, fontWeight: 'bold', color: '#000' },
  pkgTitle: { fontSize: 11, fontWeight: 'bold', color: '#0277BD', textAlign: 'center', marginBottom: 2 },
  pkgSub: { fontSize: 9, color: '#555', marginBottom: 5, textAlign: 'center' },
  pkgPrice: { fontSize: 16, fontWeight: 'bold', color: '#01579B', marginBottom: 8 },
  featuresList: { width: '100%', marginBottom: 10, paddingLeft: 2 },
  featureText: { fontSize: 8, color: '#444' },
  payButton: { paddingVertical: 6, width: '100%', alignItems: 'center', borderRadius: 20 },

  // CUSTOM PLAN STYLES
  customModalContainer: { margin: 0, backgroundColor: "white", padding: 20, paddingTop: 40, height: '100%', width: '100%', borderRadius: 0 },
  customHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  customTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  label: { fontSize: 16, fontWeight: 'bold', color: '#000', marginBottom: 15 },
  readOnlyText: { fontSize: 10, color: '#666', fontWeight: 'bold' },
  
  sliderContainer: { height: 40, justifyContent: 'center', marginBottom: 20, marginTop: 10, position: 'relative' },
  sliderTrack: { height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, width: '100%' },
  sliderFill: { height: 6, backgroundColor: '#64B5F6', borderRadius: 3, position: 'absolute' },
  sliderThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#1565C0', position: 'absolute', top: 12, elevation: 3 },
  priceTag: { position: 'absolute', top: -25, backgroundColor: '#E0E0E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, transform: [{ translateX: -20 }] },
  priceTagText: { fontSize: 10, fontWeight: 'bold', color: '#000' },
  
  durationButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 },
  dBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#f0f0f0' },
  dBtnActive: { backgroundColor: '#1565C0' },
  dBtnText: { fontSize: 12, color: '#555' },
  dBtnTextActive: { color: 'white', fontWeight: 'bold' },
  
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  calendarCard: { backgroundColor: '#fff', borderRadius: 12, elevation: 2, padding: 10, marginBottom: 20, borderWidth: 1, borderColor: '#eee' },
  calMonthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  calMonthTitle: { fontSize: 16, fontWeight: 'bold', color: '#1565C0' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' },
  calWeekday: { width: '13%', textAlign: 'center', fontSize: 10, color: '#999', marginBottom: 10, fontWeight: 'bold' },
  calDay: { width: '13%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 20, marginBottom: 5 },
  calDayActive: { backgroundColor: '#E3F2FD' },
  calDayText: { fontSize: 14, color: '#333' },
  calDayTextActive: { color: '#1565C0', fontWeight: 'bold' },
  
  // Fixed Time Picker Styles
  timePickerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 15, marginTop: 5, marginBottom: 30 },
  timeInputBox: { borderBottomWidth: 2, borderBottomColor: '#ddd', width: 80, alignItems: 'center', paddingBottom: 5 },
  timeInput: { fontSize: 32, fontWeight: 'bold', color: '#000', textAlign: 'center', width: '100%', padding: 0 },
  timeLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  payNowBtn: { borderRadius: 30, marginBottom: 20 }
});
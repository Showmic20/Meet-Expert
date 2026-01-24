import React, { useCallback, useEffect, useMemo, useState, useLayoutEffect } from "react";
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
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { useNavigation } from 'expo-router';
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
import PaymentModal from "../../../component/PaymentModal";
import RankModal from "../../../component/RankModal";

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
    for (let i = 1; i <= 30; i++) { days.push(i); }
    return days;
};

export default function ProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id: paramUserId } = useLocalSearchParams<{ id?: string }>();
  const { session, loading: authLoading } = useAuth();

  const selfUserId = session?.user?.id as string | undefined;
  const userId = paramUserId ?? selfUserId;
  const viewingSelf = !!selfUserId && userId === selfUserId;
  
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
    navigation.getParent()?.setOptions({ headerShown: false });
  }, [navigation]);

  const [snack, setSnack] = useState<{visible:boolean; text:string}>({visible:false, text:""});
  const [user, setUser] = useState<DBUser | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [cacheBust, setCacheBust] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const showToast = (text: string) => setSnack({visible:true, text});
  
  const [chatOpen, setChatOpen] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false); 
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<{mins: number, price: number, plan: string} | null>(null);
  const [showRankModal, setShowRankModal] = useState(false);

  const [duration, setDuration] = useState(30); 
  const [selectedDay, setSelectedDay] = useState(20); 
  const [selectedHour, setSelectedHour] = useState("07"); 
  const [selectedMinute, setSelectedMinute] = useState("29"); 

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

  const packages = useMemo(() => {
    return [
      { id: "basic", title: "Basic", subtitle: "For 30 min", minutes: 30, price: Math.round(hourlyRate * 0.5), features: ["Unlimited Text", "Audio Call"], isPopular: false },
      { id: "popular", title: "Popular", subtitle: "For 1 hour", minutes: 60, price: hourlyRate, features: ["Unlimited Text", "Video Call", "Priority Support"], isPopular: true },
      { id: "premium", title: "Premium", subtitle: "For 2 hours", minutes: 120, price: hourlyRate * 2, features: ["Unlimited Text", "Video Call", "File Sharing"], isPopular: false }
    ];
  }, [hourlyRate]);

  const avatarSrc = useMemo(() => {
    const base ="https://i.pravatar.cc/150?img=12";
    const ver = user?.updated_at ?? cacheBust;
    return `${base}?v=${encodeURIComponent(String(ver))}`;
  }, [user?.profile_picture_url, user?.updated_at, cacheBust]);

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
    } catch (e) { console.warn("Profile fetch error", e); } finally { setLoading(false); }
  }, [fetchUser, fetchSkills, fetchVerificationStatus]);

  useFocusEffect(useCallback(() => { if (!authLoading && userId) fetchAll(); }, [authLoading, userId, fetchAll]));

  useEffect(() => {
    if (!userId) return;
    const usersChannel = supabase.channel(`users-${userId}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "users", filter: `id=eq.${userId}` }, (payload) => { setUser(payload.new as DBUser); setCacheBust((n) => n + 1); }).subscribe();
    return () => { supabase.removeChannel(usersChannel); };
  }, [userId]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchAll(); setRefreshing(false); }, [fetchAll]);

  const initiatePaymentFlow = (minutes: number, price: number, planName: string) => {
    if (!userId || !selfUserId) return;
    if (viewingSelf) { showToast("You can't start a chat with yourself."); return; }
    setPendingRequest({ mins: minutes, price: price, plan: planName });
    setChatOpen(false); 
    setPaymentOpen(true); 
  };

  const onPaymentSuccess = async (tranId: string) => {
    if (!pendingRequest || !userId || !selfUserId) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('chat_requests').insert({
        requester_id: selfUserId,
        expert_id: userId,
        plan: pendingRequest.plan,
        status: 'pending', 
      });
      if (error) throw error;
      showToast(`Payment Success! Request Sent.`);
      setPaymentOpen(false); setPendingRequest(null); setIsCustomizing(false);
    } catch (e: any) {
      console.error("Chat Request Error:", e);
      if (e.code === '23505') { Alert.alert("Request Already Sent", "You already have a pending request with this expert."); setPaymentOpen(false); setPendingRequest(null); setIsCustomizing(false); } else { Alert.alert("Error", "Payment successful but request failed to save."); }
    } finally { setLoading(false); }
  };

  const renderVerificationBadge = () => {
    if (isVerifiedBoolean) return <View style={styles.verifiedTag}><Text style={styles.verifiedText}>verified</Text><Icon source="check-decagram" size={14} color="#2196F3" /></View>;
    if (verificationStatus === 'pending') return <View style={styles.verifiedTag}><Text style={[styles.verifiedText, { color: 'orange' }]}>Pending Review</Text><Icon source="clock-outline" size={14} color="orange" /></View>;
    return viewingSelf ? <TouchableOpacity onPress={() => router.push("/verificationExpert")} style={styles.verifiedTag}><Text style={styles.unverifiedText}>Apply for verification</Text><Icon source="shield-outline" size={14} color="gray" /></TouchableOpacity> : null;
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f9fa" }} edges={["top", "left", "right"]}>
        <View style={styles.topHeader}>
           <IconButton icon="chevron-left" size={24} onPress={() => router.back()} />
           <View style={styles.searchBar}>
             <Icon source="magnify" size={20} color="gray" />
             <Text style={styles.searchPlaceholder}>Search for an expert</Text>
             <Icon source="tune-vertical" size={20} color="gray" />
           </View>
        </View>

        {(authLoading || loading) && ( <View style={{ paddingTop: 8 }}><ActivityIndicator animating size={24} color="#2196F3" /></View> )}

        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={{ paddingBottom: 40 }}>
          
          <View style={styles.headerSection}>
            <Image source={{ uri: "https://picsum.photos/1200/400" }} style={styles.coverPhoto} />
            <View style={styles.profileHeaderContent}>
               <View style={styles.avatarContainer}>
                 <Avatar.Image size={100} source={{ uri: avatarSrc }} style={styles.avatar} />
               </View>
               <Text style={styles.nameText}>{fullName}</Text>
               {renderVerificationBadge()}
               <Text style={styles.occupationText}>{profession} {company ? `at ${company}` : ""}</Text>
               <View style={styles.locationRow}>
                 <Icon source="map-marker-outline" size={14} color="#666" />
                 <Text style={styles.locationText}>{location}</Text>
               </View>
               {user?.is_expert && user?.availability && (
                 <View style={styles.availabilityRow}>
                    <Icon source="clock-outline" size={14} color="#4CAF50" />
                    <Text style={styles.availabilityText}>{user.availability}</Text>
                 </View>
               )}
               <View style={styles.actionButtons}>
                  {viewingSelf ? (
                     <Button mode="contained" onPress={() => router.push('/edit-profile')} style={styles.mainBtn} labelStyle={styles.btnLabel}>Edit Profile</Button>
                  ) : (
                     <Button mode="contained" style={styles.mainBtn} labelStyle={styles.btnLabel}>Follow</Button>
                  )}
               </View>
            </View>
          </View>
          
          <Divider style={styles.sectionDivider} />

          {/* 🟢 STATS ROW FIXED */}
          <View style={styles.statsContainer}>
            {/* Rating */}
            <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={() => user?.id && router.push(`/reviews/${user.id}`)}>
                <View style={styles.statHeader}><Text style={styles.statTitle}>Rating</Text></View>
                <Text style={styles.statValue}>{user?.rating ? user.rating.toFixed(1) : "4.6"}</Text>
                <View style={{flexDirection:'row'}}>
                  {[1,2,3,4,5].map(i => <Icon key={i} source="star" size={12} color="#FF9800" />)}
                </View>
            </TouchableOpacity>
            
            {/* Rank - Icon Position Fixed */}
            <TouchableOpacity style={styles.statCard} onPress={() => setShowRankModal(true)}>
                <View style={styles.statHeader}><Text style={styles.statTitle}>Rank</Text></View>
                <View style={{ marginTop: 24, marginBottom: 4 }}>
                   <Icon source="trophy" size={24} color="#FFD700"/>
                </View>
                <Text style={[styles.statValue, {fontSize: 14, marginTop: 0}]}>{rank}</Text>
            </TouchableOpacity>

            {/* Chat - Icon Position Fixed & Conditional */}
            {user?.is_expert ? (
                <TouchableOpacity style={styles.statCard} onPress={!viewingSelf ? () => setChatOpen(true) : undefined}>
                    <View style={styles.statHeader}><Text style={styles.statTitle}>Chat</Text></View>
                    <View style={{ marginTop: 24, marginBottom: 4 }}>
                        <Icon source="message-text-outline" size={24} color="#7B1FA2"/>
                    </View>
                    <Text style={[styles.statValue, {fontSize: 14, marginTop: 0}]}>${hourlyRate}/HOUR</Text>
                </TouchableOpacity>
            ) : (
                <View style={[styles.statCard, { opacity: 0, borderWidth: 0, backgroundColor: 'transparent' }]} />
            )}
          </View>

          {/* ABOUT SECTION */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>About</Text></View>
            <Text style={styles.bioText} numberOfLines={4}>{bio}<Text style={styles.seeMoreText}> see more...</Text></Text>
          </View>

          {/* EDUCATION SECTION */}
          <View style={styles.cardSection}>
             <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Education</Text>
                {viewingSelf && (
                   <View style={{flexDirection: 'row'}}>
                      <IconButton icon="plus" size={18} style={{margin:0}} onPress={() => {}} />
                      <IconButton icon="pencil" size={18} style={{margin:0}} onPress={() => {}} />
                   </View>
                )}
             </View>
             {MOCK_EDUCATION.map((edu, index) => (
                 <View key={edu.id}>
                   <View style={styles.eduItem}>
                     <Image source={{ uri: edu.logo }} style={styles.eduLogo} />
                     <View style={styles.eduTextContainer}>
                       <Text style={styles.eduSchool}>{edu.school}</Text>
                       <Text style={styles.eduYear}>{edu.year}</Text>
                       <Text style={styles.eduDegree}>{edu.degree}</Text>
                     </View>
                   </View>
                   {index < MOCK_EDUCATION.length - 1 && <Divider style={styles.listDivider}/>}
                 </View>
             ))}
             <TouchableOpacity style={styles.seeAllBtn}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
          </View>

          {/* SKILLS SECTION */}
          <View style={styles.cardSection}>
             <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Skills</Text>
                {viewingSelf && (
                   <View style={{flexDirection: 'row'}}>
                      <IconButton icon="plus" size={18} style={{margin:0}} onPress={() => {}} />
                      <IconButton icon="pencil" size={18} style={{margin:0}} onPress={() => {}} />
                   </View>
                )}
             </View>
             <View style={styles.skillsContainer}>
                {skills.length > 0 ? skills.map((s, i) => (
                   <Chip key={i} style={styles.skillChip} textStyle={{fontSize: 12}}>{s}</Chip>
                )) : <Text style={{color: 'gray', fontStyle: 'italic'}}>No skills added.</Text>}
             </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <RankModal visible={showRankModal} onClose={() => setShowRankModal(false)} currentScore={340} />

      <Portal>
        <Modal visible={chatOpen} onDismiss={() => { setChatOpen(false); setIsCustomizing(false); }} contentContainerStyle={isCustomizing ? styles.customModalContainer : styles.modalContainer}>
          {isCustomizing ? (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
                <View style={styles.customHeader}>
                    <TouchableOpacity onPress={() => setIsCustomizing(false)}><Icon source="chevron-left" size={28} color="#000" /></TouchableOpacity>
                    <Text style={styles.customTitle}>Customize Plan</Text>
                    <View style={{width: 28}} /> 
                </View>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}}>
                    <Text style={styles.label}>Select Duration</Text>
                    <View style={styles.sliderContainer}>
                        <View style={styles.sliderTrack} />
                        <View style={[styles.sliderFill, {width: `${(duration / 120) * 100}%`}]} />
                        <View style={[styles.sliderThumb, {left: `${(duration / 120) * 100}%`}]} />
                        <View style={[styles.priceTag, {left: `${(duration / 120) * 100}%`}]}><Text style={styles.priceTagText}>{duration}m / ${calculatedPrice}</Text></View>
                    </View>
                    <View style={styles.durationButtons}>
                        {[15, 30, 45, 60, 90, 120].map((m) => (
                            <TouchableOpacity key={m} onPress={() => setDuration(m)} style={[styles.dBtn, duration === m && styles.dBtnActive]}><Text style={[styles.dBtnText, duration === m && styles.dBtnTextActive]}>{m}m</Text></TouchableOpacity>
                        ))}
                    </View>
                    <View style={styles.calendarHeader}><Text style={styles.label}>Select Date</Text><Text style={styles.readOnlyText}>Oct 2025</Text></View>
                    <View style={styles.calendarCard}>
                        <View style={styles.calMonthRow}><Text style={styles.calMonthTitle}>October 2025</Text><View style={{flexDirection: 'row', gap: 10}}><Icon source="chevron-left" size={20} color="#2196F3" /><Icon source="chevron-right" size={20} color="#2196F3" /></View></View>
                        <View style={styles.calGrid}>{WEEKDAYS.map((d, i) => <Text key={i} style={styles.calWeekday}>{d}</Text>)}</View>
                        <View style={styles.calGrid}>{generateDays().map((d) => (<TouchableOpacity key={d} style={[styles.calDay, selectedDay === d && styles.calDayActive]} onPress={() => setSelectedDay(d)}><Text style={[styles.calDayText, selectedDay === d && styles.calDayTextActive]}>{d}</Text></TouchableOpacity>))}</View>
                    </View>
                    <Text style={[styles.label, {marginTop: 10}]}>Set time</Text>
                    <View style={styles.timePickerContainer}>
                        <View style={styles.timeInputBox}><RNTextInput value={selectedHour} onChangeText={setSelectedHour} style={styles.timeInput} keyboardType="numeric" maxLength={2} placeholder="00" placeholderTextColor="#ccc" /><Text style={styles.timeLabel}>Hr</Text></View>
                        <Text style={{fontSize: 24, fontWeight: 'bold', marginTop: 10}}>:</Text>
                        <View style={styles.timeInputBox}><RNTextInput value={selectedMinute} onChangeText={setSelectedMinute} style={styles.timeInput} keyboardType="numeric" maxLength={2} placeholder="00" placeholderTextColor="#ccc" /><Text style={styles.timeLabel}>Min</Text></View>
                    </View>
                </ScrollView>
                <View style={{marginTop: 'auto', marginBottom: 10}}>
                    <Button mode="contained" buttonColor="#0277BD" style={styles.payNowBtn} contentStyle={{height: 50}} onPress={() => initiatePaymentFlow(duration, calculatedPrice, `Custom: ${duration}m on Oct ${selectedDay} at ${selectedHour}:${selectedMinute}`)}>Pay now - {calculatedPrice} Coins</Button>
                </View>
            </KeyboardAvoidingView>
          ) : (
            <View>
                <View style={styles.modalHeader}><Text style={styles.modalTitle}>Packages</Text><TouchableOpacity onPress={() => setChatOpen(false)}><Icon source="close-circle-outline" size={24} color="#555" /></TouchableOpacity></View>
                <View style={styles.packagesRow}>
                    {packages.map((pkg) => (
                        <View key={pkg.id} style={[styles.packageCard, pkg.isPopular && styles.popularCard]}>
                            {pkg.isPopular && <View style={styles.popularBadge}><Text style={styles.popularText}>Popular</Text></View>}
                            <Text style={[styles.pkgTitle, pkg.isPopular && {color: 'white'}]}>{pkg.title}</Text>
                            <Text style={[styles.pkgSub, pkg.isPopular && {color: '#E3F2FD'}]}>{pkg.subtitle}</Text>
                            <Text style={[styles.pkgPrice, pkg.isPopular && {color: 'white'}]}>{pkg.price} <Text style={{fontSize: 10}}>Coins</Text></Text>
                            <View style={styles.featuresList}>{pkg.features.map((f, i) => (<View key={i} style={{flexDirection: 'row', alignItems: 'center', marginBottom: 2}}><Icon source="check-circle" size={10} color={pkg.isPopular ? "white" : "#4CAF50"} /><Text style={[styles.featureText, pkg.isPopular && {color: '#E3F2FD'}]} numberOfLines={1}> {f}</Text></View>))}</View>
                            <TouchableOpacity style={[styles.payButton, pkg.isPopular ? {backgroundColor: 'white'} : {backgroundColor: '#2196F3'}]} onPress={() => initiatePaymentFlow(pkg.minutes, pkg.price, `${pkg.title} (${pkg.minutes} min)`)}><Text style={{fontSize: 10, fontWeight: 'bold', color: pkg.isPopular ? '#1565C0' : 'white'}}>Pay Now</Text></TouchableOpacity>
                        </View>
                    ))}
                </View>
                <Button mode="contained" buttonColor="#0277BD" style={{marginTop: 25, borderRadius: 8, width: '100%'}} onPress={() => setIsCustomizing(true)}>Customize your Plan</Button>
            </View>
          )}
        </Modal>
      </Portal>

      {pendingRequest && (
        <PaymentModal 
          visible={paymentOpen}
          amount={pendingRequest.price} 
          onClose={() => setPaymentOpen(false)}
          onSuccess={onPaymentSuccess}
          onFailed={() => { Alert.alert("Payment Failed", "Transaction was cancelled or failed."); setPaymentOpen(false); }}
        />
      )}
      <Snackbar visible={snack.visible} onDismiss={() => setSnack({visible:false, text:""})} duration={2500}>{snack.text}</Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  topHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 12, height: 40, justifyContent: 'space-between', marginRight: 10 },
  searchPlaceholder: { color: 'gray', flex: 1, marginLeft: 8 },
  headerSection: { alignItems: 'center', backgroundColor: '#fff', paddingBottom: 15 },
  coverPhoto: { width: "100%", height: 120, resizeMode: 'cover' },
  profileHeaderContent: { alignItems: 'center', marginTop: -50, width: '100%' },
  avatarContainer: { padding: 4, backgroundColor: '#fff', borderRadius: 55, elevation: 4 },
  avatar: { backgroundColor: '#ddd' },
  nameText: { fontSize: 18, fontWeight: 'bold', color: '#000', marginTop: 8 },
  verifiedTag: { flexDirection: 'row', alignItems: 'center', gap: 2, marginVertical: 2 },
  verifiedText: { fontSize: 11, color: '#1976D2', fontWeight: '500' },
  unverifiedText: { fontSize: 11, color: 'gray' },
  occupationText: { fontSize: 12, color: 'gray', textAlign: 'center' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locationText: { fontSize: 12, color: '#666' },
  availabilityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  availabilityText: { fontSize: 11, color: '#2E7D32', fontWeight: '600' },
  actionButtons: { marginTop: 12 },
  mainBtn: { borderRadius: 20, paddingHorizontal: 20, height: 36, backgroundColor: '#2196F3' },
  btnLabel: { fontSize: 12, lineHeight: 18 },
  sectionDivider: { height: 6, backgroundColor: '#f0f0f0' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 15, backgroundColor: '#fff' },
  statCard: { width: '31%', backgroundColor: '#f5f5f5', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  statHeader: { backgroundColor: '#e0e0e0', width: '100%', alignItems: 'center', borderTopLeftRadius: 11, borderTopRightRadius: 11, paddingVertical: 4, position: 'absolute', top: 0 },
  statTitle: { fontSize: 11, fontWeight: 'bold', color: '#333' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#000', marginTop: 18 },
  cardSection: { marginTop: 10, backgroundColor: '#fff', padding: 15, borderRadius: 12, marginHorizontal: 10, elevation: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  bioText: { fontSize: 13, color: '#444', lineHeight: 18 },
  seeMoreText: { color: 'gray', fontSize: 12 },
  eduItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
  eduLogo: { width: 40, height: 40, resizeMode: 'contain', marginRight: 12 },
  eduTextContainer: { flex: 1 },
  eduSchool: { fontSize: 13, fontWeight: 'bold', color: '#000' },
  eduYear: { fontSize: 11, color: '#666', marginTop: 1 },
  eduDegree: { fontSize: 11, color: '#444', marginTop: 2 },
  listDivider: { marginVertical: 5, backgroundColor: '#eee' },
  seeAllBtn: { alignItems: 'center', marginTop: 5 },
  seeAllText: { fontSize: 12, color: '#666' },
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: { backgroundColor: '#f5f5f5', height: 28 },
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
  timePickerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 15, marginTop: 5, marginBottom: 30 },
  timeInputBox: { borderBottomWidth: 2, borderBottomColor: '#ddd', width: 80, alignItems: 'center', paddingBottom: 5 },
  timeInput: { fontSize: 32, fontWeight: 'bold', color: '#000', textAlign: 'center', width: '100%', padding: 0 },
  timeLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  payNowBtn: { borderRadius: 30, marginBottom: 20 }
});
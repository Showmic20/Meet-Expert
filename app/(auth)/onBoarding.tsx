import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from "expo-router";
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Image, Alert, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback, Platform } from 'react-native';
import Onboarding from 'react-native-onboarding-swiper';
import { supabase } from '../lib/superbase';
import { useAuth } from 'app/lib/AuthProvid';
import LottieView from 'lottie-react-native';


// ---------- helpers ---------------------------------------------------------
const uniq = (arr: string[]) => Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));

async function uploadProfileImage(userId: string, uri: string | null): Promise<string | null> {
  if (!uri) return null;
  const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `${userId}.${ext}`;
  const file = { uri, name: filePath, type: ext === 'png' ? 'image/png' : 'image/jpeg' } as any;

  const { data, error } = await supabase.storage
    .from('profiles')
    .upload(filePath, file, { upsert: true, contentType: file.type });

  if (error) throw error;

  const { data: pub } = supabase.storage.from('profiles').getPublicUrl(data.path);
  return pub.publicUrl ?? null;
}

async function upsertVocabAndLink(
  table: 'skills' | 'interests',
  linkTable: 'user_skills' | 'user_interests',
  userId: string,
  names: string[]
) {
  const items = uniq(names).map((name) => ({ name }));
  if (!items.length) return;
  const { data: rows, error } = await supabase.from(table).upsert(items, { onConflict: 'name' }).select('id,name');
  if (error) throw error;
  const linkRows = (rows || []).map((r: any) =>
    linkTable === 'user_skills' ? { user_id: userId, skill_id: r.id } : { user_id: userId, interest_id: r.id }
  );
  if (linkRows.length) {
    const { error: linkErr } = await supabase.from(linkTable).upsert(linkRows);
    if (linkErr) throw linkErr;
  }
}

// ---------- component -------------------------------------------------------
const OnboardingSwiper = () => {
 
  // this is for testing
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
  // core fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [showDate, setShowDate] = useState(false);
  const [company, setCompany] = useState('');
  const [occupation, setOccupation] = useState('');
  const [bio, setBio] = useState('');
  const [isExpert, setIsExpert] = useState(false);

  // tags
  const [skillsInput, setSkillsInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [interestsInput, setInterestsInput] = useState('');
  const [interests, setInterests] = useState<string[]>([]);

  // media
  const [imageUri, setImageUri] = useState<string | null>(null);

  const ready = useMemo(() => firstName.trim() && lastName.trim(), [firstName, lastName]);
  const { setOnboarded } = useAuth();

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need access to your photos to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

const addChips = (type: 'skill' | 'interest') => {
  const src = type === 'skill' ? skillsInput : interestsInput;
  const values = uniq(src.split(',')).filter(Boolean);
  if (!values.length) return;
  type === 'skill' ? setSkills((p) => uniq([...p, ...values])) : setInterests((p) => uniq([...p, ...values]));
  type === 'skill' ? setSkillsInput('') : setInterestsInput('');
};


  const removeChip = (type: 'skill' | 'interest', value: string) => {
    if (type === 'skill') setSkills((arr) => arr.filter((x) => x !== value));
    else setInterests((arr) => arr.filter((x) => x !== value));
  };

  const finish = async () => {
   try {
    console.log("Im am in Onboard");
    
    // 1) Ensure session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      router.replace('/(auth)/login');
      return;
    }
    const userId = session.user.id;

    // 2) Upload avatar (optional)
    const profileUrl = await uploadProfileImage(userId, imageUri);

    // 3) Upsert user profile
    const payload: any = {
      id: userId,
      first_name: (firstName || "").trim() || "Unknown",
      last_name:  (lastName  || "").trim() || "Unknown",
      company_name: company.trim() || null,
      occupation: occupation.trim() || null,
      bio: bio.trim() || null,
      profile_picture_url: profileUrl,
      is_expert: isExpert,
      expert_since: isExpert ? new Date().toISOString() : null,
      // 🔹 if column exists, you can set true now or after links—either is fine
      has_onboarded: true,
    };
    if (dob) payload.dob = dob.toISOString().slice(0, 10);

    const { error: upErr } = await supabase.from('users').upsert(payload) .eq('id', userId);
    if (upErr) throw upErr;

    // 4) Link skills & interests (optional)
    if (skills?.length)    await upsertVocabAndLink('skills', 'user_skills', userId, skills);
    if (interests?.length) await upsertVocabAndLink('interests', 'user_interests', userId, interests);

    // 5) (Optional) If you didn’t set has_onboarded above, do it here:
    // await supabase.from('users').update({ has_onboarded: true }).eq('id', userId);

    // 6) Go to app
   setOnboarded(true); 
    router.replace("/(tabs)/home");
    return;

  } catch (e: any) {
    Alert.alert('Onboarding failed', e?.message ?? 'Please try again.');
  }
    
 
  };

  return (
    <Onboarding
      showDone
      showSkip
      onSkip={() => router.replace('/(tabs)/home')} // 🔹 skip goes home
      onDone={finish}
      pages={[
        {
          backgroundColor: '#ffffff',
          image:(
            <View style = {{marginTop:500}}>
              <LottieView source={require('assets/animation/Welcome.json')} autoPlay loop style = {styles.lottieani} />
            </View>
          ),
      
          subtitle: (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={styles.centerCol}>
              <Text style={styles.qTitle}>What is your name?</Text>
              <TextInput style={styles.input} placeholder="First name" value={firstName} onChangeText={setFirstName} />
              <TextInput style={styles.input} placeholder="Last name" value={lastName} onChangeText={setLastName} />
            </View>
                  </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
          ),
        },

        {
          backgroundColor: '#a5cca8ff',
           image:(
            <View style = {{marginTop:500}}>
              <LottieView source={require('assets/animation/Working People.json')} autoPlay loop style = {{height:300,width:300, }} />
            </View>
          ),
          subtitle: (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={{flex:1, width: 320,gap: 10, marginTop: 10}}>
              <Text style={styles.qTitle}>Your occupation</Text>
              <TextInput style={styles.input} placeholder=" Product Designer, Doctor, Engineer" value={occupation} onChangeText={setOccupation} />
              
              <TextInput style={styles.input} placeholder="Company name" value={company} onChangeText={setCompany} />
            </View>
            </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
          ),
        },
        {
          backgroundColor: '#decee4ff',
             image:(
            <View style = {{marginTop:500}}>
              <LottieView source={require('assets/animation/Laptop.json')} autoPlay loop style = {{height:300,width:300, }} />
            </View>
          ),
          subtitle: (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={{flex:1, width: 320,gap: 10, }}>
              <Text style={styles.qTitle}>Your main field</Text>
              <Picker selectedValue={occupation} onValueChange={(v) => setOccupation(String(v))} style={styles.picker}>
                <Picker.Item label="Select a field (optional)" value={occupation} />
                <Picker.Item label="Programming" value="Programming" />
                <Picker.Item label="Design" value="Design" />
                <Picker.Item label="Marketing" value="Marketing" />
                <Picker.Item label="Data Analysis" value="Data Analysis" />
                <Picker.Item label="Product" value="Product" />
                <Picker.Item label="Research" value="Research" />
              </Picker>
              <Text style={styles.hint}>You can type a custom occupation on the previous step.</Text>
            </View>
              </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
          ),
        },
        {
          backgroundColor: '#a3bafaff',
          
          image:(
            <View style = {{marginTop:500}}>
              <LottieView source={require('assets/animation/searching for profile.json')} autoPlay loop style = {{height:300,width:300, }} />
            </View>
          ),
          subtitle: (
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={styles.centerCol}>
              <Text style={styles.qTitle}>Bio (optional)</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                placeholder="Tell us a bit about yourself"
                value={bio}
                onChangeText={setBio}
                multiline
              />
            </View>
            </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
          ),
        },
        {
          backgroundColor: '#c8d2ffff',

          image:(
            <View style = {{marginTop:400}}>
              <LottieView source={require('assets/animation/Design.json')} autoPlay loop style = {{height:300, width:300}} />
            </View>
          ),
          subtitle: (
              <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={styles.centerCol}>
              <Text style={styles.qTitle}>Add skills </Text>
               <Text style={{fontSize:14, textAlign:'center'}}>(comma separated) </Text>
              <TextInput
                style={styles.input}
                placeholder="React, Node, UI/UX, Fiteness tainer"
                value={skillsInput}
                onChangeText={setSkillsInput}
                onSubmitEditing={() => addChips('skill')}
              />
              <TouchableOpacity style={styles.addBtn} onPress={() => addChips('skill')}><Text style={styles.addBtnText}>Add</Text></TouchableOpacity>
              <View style={styles.pillsWrap}>
                {skills.map((s) => (
                  <TouchableOpacity key={s} style={styles.pill} onPress={() => removeChip('skill', s)}>
                    <Text style={styles.pillText}>{s} ✕</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
          ),
        },
        {
          backgroundColor: '#ffe9e9ff',
            image:(
            <View style = {{marginTop:400}}>
              <LottieView source={require('assets/animation/Teamwork productivy.json')} autoPlay loop style = {{height:300, width:300}} />
            </View>
          ),
          subtitle: (
              <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={styles.centerCol}>
              <Text style={styles.qTitle}>Interested fields </Text>
              <Text style={{fontSize:14, textAlign:'center'}}>(comma separated) </Text>
              <TextInput
                style={styles.input}
                placeholder="FinTech, Health, Education"
                value={interestsInput}
                onChangeText={setInterestsInput}
                onSubmitEditing={() => addChips('interest')}
              />
              <TouchableOpacity style={styles.addBtn2} onPress={() => addChips('interest')}><Text style={styles.addBtnText}>Add</Text></TouchableOpacity>
              <View style={styles.pillsWrap}>
                {interests.map((s) => (
                  <TouchableOpacity key={s} style={styles.pill} onPress={() => removeChip('interest', s)}>
                    <Text style={styles.pillText}>{s} ✕</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          ),
        },
        {
          backgroundColor: '#fff',
          title: 'Birthday',
          
           image:(
            <View style = {{marginTop:400,}}>
              <LottieView source={require('assets/animation/Confetti.json')} autoPlay loop style = {{height:400, width:300}} />
            </View>
          ),
          subtitle: (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={{flex:1, width: 320,gap: 10, }}>
              <TouchableOpacity onPress={() => setShowDate(true)}>
                <Text style={styles.dateBtn}>Pick your birthdate</Text>
              </TouchableOpacity >
              {showDate && (
                <DateTimePicker style ={{alignSelf:'center'}}
                  value={dob || new Date('2000-01-01')}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDate(false);
                    if (selectedDate) setDob(selectedDate);
                  }}
                />
              )}

              <Text style={styles.hint}>Selected: {dob ? dob.toDateString() : '—'}</Text>
            </View>
            </TouchableWithoutFeedback>
            </KeyboardAvoidingView>

          ),
        },
        {
          backgroundColor: '#f8d7f6ff',
          image:(
            <View style = {{marginTop:400}}>
              <LottieView source={require('assets/animation/Image Not Preview.json')} autoPlay loop style = {{height:400, width:300}} />
            </View>
          ),
            subtitle: (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={{ flex:1, width: 320,gap: 10, marginTop: 30}}>
              {imageUri ? <Image source={{ uri: imageUri }} style={styles.avatar} /> : null}
              <TouchableOpacity onPress={pickImage}><Text style={styles.dateBtn}>Choose image</Text></TouchableOpacity>
              <Text style={styles.hint}>Tap to pick from gallery</Text>
            </View>
            </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          ),
        },
        {
          backgroundColor: '#ccfcccff',
           image:(
            <View style = {{marginTop:500}}>
              <LottieView source={require('assets/animation/Question.json')} autoPlay loop style = {{height:250, width:250}} />
            </View>
          ),
          subtitle: (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={{flex:1, width: 320,gap: 10, marginTop: 50}}>
              <Text style={styles.qTitle}>Are you an expert?</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity onPress={() => setIsExpert(true)}>
                  <Text style={isExpert ? styles.radioSelected : styles.radio}>⬤ Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsExpert(false)}>
                  <Text style={!isExpert ? styles.radioSelected : styles.radio}>⬤ No</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>You can switch this later in Profile.</Text>
            </View>
            </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
           
          ),
        },
        {
          backgroundColor: '#ffffff',
             image:(
            <View style = {{marginTop:500}}>
              <LottieView source={require('assets/animation/Loading 40 _ Paperplane.json')} autoPlay loop style = {{height:400, width:400}} />
            </View>
          ),
          subtitle: (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={{  flex:1, width: 320,gap: 10, marginTop: 0}}>
              <Text style={styles.qTitle}>Review & Finish</Text>
              <Text style={styles.review}>Name: {firstName} {lastName}</Text>
              <Text style={styles.review}>Occupation: {occupation || '—'}</Text>
              <Text style={styles.review}>Company: {company || '—'}</Text>
              <Text style={styles.review}>Expert: {isExpert ? 'Yes' : 'No'}</Text>
              <TouchableOpacity style={[styles.finishbutton, { marginTop: 16, backgroundColor: '#111' }]} onPress={finish}>
                <Text style={[styles.addBtnText, { color: '#fff' }]}>Finish onboarding</Text>
              </TouchableOpacity>
              <Text style={styles.hintSmall}>You can always edit these later.</Text>
            </View>
            </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          ),
        },
      ]}
      skipToPage={8}
      bottomBarColor="#ffffff"
      imageContainerStyles={{ paddingBottom: 0 }}
      titleStyles={{ fontFamily: 'InriaSansBold' }}
      subTitleStyles={{ fontFamily: 'InriaSansRegular' }}
      
    />
  );
};

export default OnboardingSwiper;

// ---------- styles ----------------------------------------------------------
const styles = StyleSheet.create({
  centerCol: {  flex:1, width: 320,gap: 10, marginTop: 100 },
  qTitle: { fontSize: 24, fontFamily: 'InriaSansBold', textAlign: 'center' },
  qTitleSmall: { fontSize: 16, fontFamily: 'InriaSansBold' },
  input: {
    borderWidth: 1,
    borderColor: '#66b3fa',
    padding: 10,
    borderRadius: 8,
    width: '100%',
    fontFamily: 'InriaSansRegular',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  radioGroup: { flexDirection: 'row', gap: 20, marginTop: 10,alignSelf:'center',height:20 },
  radio: { fontSize: 18, color: '#555', fontFamily: 'InriaSansRegular' },
  radioSelected: { fontSize: 18, color: '#007BFF', fontWeight: 'bold', fontFamily: 'InriaSansRegular' },
  picker: { width: '100%', backgroundColor: '#ffffff9a', borderRadius: 8 },
  dateBtn: { fontSize: 20, color: '#007BFF', fontFamily: 'InriaSansRegular', marginTop: 10, marginBottom: 10, textAlign:'center' },
  hint: { fontSize: 12, color: '#666', fontWeight:'bold', marginTop: 4, textAlign: 'center' },
  hintSmall: { fontSize: 11, color: '#888', fontFamily: 'InriaSansRegular', marginTop: 8,alignSelf:'center' },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%', justifyContent: 'center' },
  pill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  pillText: { fontFamily: 'InriaSansRegular' },
  addBtn: { backgroundColor: '#7a6bffff',
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 8,
  elevation: 2,
  height: 40,
  width: 100,
  justifyContent: 'center',
  alignItems: 'center',
  alignSelf: 'center', 
  
  },
    finishbutton: { backgroundColor: '#7a6bffff',
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 8,
  elevation: 2,
  height: 40,
  width: 150,
  justifyContent: 'center',
  alignItems: 'center',
  alignSelf: 'center', 
  
  },
    addBtn2: { backgroundColor: '#ff3737ff',
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 8,
  elevation: 2,
  height: 40,
  width: 100,
  justifyContent: 'center',
  alignItems: 'center',
  alignSelf: 'center', 
  
  },
  addBtnText: {fontWeight:'bold', color: '#ffffffff' },
  avatar: { width: 100, height: 100, borderRadius: 50, marginVertical: 10 },
  review: { fontSize: 14, fontFamily: 'InriaSansRegular', marginTop: 4 },
  lottieani:{height:100,width:300, marginBottom:20}
});
function setError(message: string) {
  throw new Error('Function not implemented.');
}


import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Image, Alert } from 'react-native';
import Onboarding from 'react-native-onboarding-swiper';
import { supabase } from '../lib/superbase';

// ---------- helpers ---------------------------------------------------------
const uniq = (arr: string[]) => Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));

async function uploadProfileImage(userId: string, uri: string | null): Promise<string | null> {
  if (!uri) return null;
  const resp = await fetch(uri);
  const blob = await resp.blob();
  const fileExt = uri.split('.').pop() || 'jpg';
  const filePath = `${userId}.${fileExt}`;
  const { data, error } = await supabase.storage
    .from('profiles')
    .upload(filePath, blob, { upsert: true, contentType: blob.type || 'image/jpeg' });
  if (error) throw error;
  const { data: pub } = supabase.storage.from('profiles').getPublicUrl(data?.path || filePath);
  return pub.publicUrl || null;
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
  const router = useRouter();

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
    if (type === 'skill') {
      setSkills((prev) => uniq([...prev, ...skillsInput.split(',')]));
      setSkillsInput('');
    } else {
      setInterests((prev) => uniq([...prev, ...interestsInput.split(',')]));
      setInterestsInput('');
    }
  };

  const removeChip = (type: 'skill' | 'interest', value: string) => {
    if (type === 'skill') setSkills((arr) => arr.filter((x) => x !== value));
    else setInterests((arr) => arr.filter((x) => x !== value));
  };

  const finish = async () => {
    try {
      const { data: ures, error: uerr } = await supabase.auth.getUser();
      if (uerr || !ures.user) throw uerr || new Error('Not authenticated');
      const userId = ures.user.id;

      const profileUrl = await uploadProfileImage(userId, imageUri);

      const payload: any = {
        id: userId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        company_name: company.trim() || null,
        occupation: occupation.trim() || null,
        bio: bio.trim() || null,
        profile_picture_url: profileUrl,
        is_expert: isExpert,
        expert_since: isExpert ? new Date().toISOString() : null,
      };
      if (dob) payload.dob = dob.toISOString().slice(0, 10);

      const { error: upErr } = await supabase.from('users').upsert(payload);
      if (upErr) throw upErr;

      await upsertVocabAndLink('skills', 'user_skills', userId, skills);
      await upsertVocabAndLink('interests', 'user_interests', userId, interests);

      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Onboarding failed', e?.message ?? 'Please try again.');
    }
  };

  return (
    <Onboarding
      showDone
      showSkip
      onSkip={() => router.replace('/(tabs)')}
      onDone={finish}
      pages={[
        {
          backgroundColor: '#ffffff',
          title: 'Welcome',
          subtitle: (
            <View style={styles.centerCol}>
              <Text style={styles.qTitle}>What is your name?</Text>
              <TextInput style={styles.input} placeholder="First name" value={firstName} onChangeText={setFirstName} />
              <TextInput style={styles.input} placeholder="Last name" value={lastName} onChangeText={setLastName} />
            </View>
          ),
        },
        {
          backgroundColor: '#f7dbd0ff',
          title: 'Work',
          subtitle: (
            <View style={styles.centerCol}>
              <Text style={styles.qTitle}>Your occupation</Text>
              <TextInput style={styles.input} placeholder="e.g. Product Designer" value={occupation} onChangeText={setOccupation} />
              <Text style={styles.qTitleSmall}>Company (optional)</Text>
              <TextInput style={styles.input} placeholder="Company name" value={company} onChangeText={setCompany} />
            </View>
          ),
        },
        {
          backgroundColor: '#decee4ff',
          title: 'Field',
          subtitle: (
            <View style={styles.centerCol}>
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
          ),
        },
        {
          backgroundColor: '#ffffff',
          title: 'About you',
          subtitle: (
            <View style={styles.centerCol}>
              <Text style={styles.qTitle}>Short bio (optional)</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                placeholder="Tell us a bit about yourself"
                value={bio}
                onChangeText={setBio}
                multiline
              />
            </View>
          ),
        },
        {
          backgroundColor: '#f4f6ff',
          title: 'Skills',
          subtitle: (
            <View style={styles.centerCol}>
              <Text style={styles.qTitle}>Add skills (comma separated)</Text>
              <TextInput
                style={styles.input}
                placeholder="React, Node, UI/UX"
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
          ),
        },
        {
          backgroundColor: '#e9fff2',
          title: 'Interests',
          subtitle: (
            <View style={styles.centerCol}>
              <Text style={styles.qTitle}>Interested fields (comma separated)</Text>
              <TextInput
                style={styles.input}
                placeholder="FinTech, Health, Education"
                value={interestsInput}
                onChangeText={setInterestsInput}
                onSubmitEditing={() => addChips('interest')}
              />
              <TouchableOpacity style={styles.addBtn} onPress={() => addChips('interest')}><Text style={styles.addBtnText}>Add</Text></TouchableOpacity>
              <View style={styles.pillsWrap}>
                {interests.map((s) => (
                  <TouchableOpacity key={s} style={styles.pill} onPress={() => removeChip('interest', s)}>
                    <Text style={styles.pillText}>{s} ✕</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ),
        },
        {
          backgroundColor: '#fff',
          title: 'Birthday',
          subtitle: (
            <View style={styles.centerCol}>
              <TouchableOpacity onPress={() => setShowDate(true)}>
                <Text style={styles.dateBtn}>Pick your birthdate</Text>
              </TouchableOpacity>
              {showDate && (
                <DateTimePicker
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
          ),
        },
        {
          backgroundColor: '#fff7f2',
          title: 'Profile photo',
          subtitle: (
            <View style={styles.centerCol}>
              {imageUri ? <Image source={{ uri: imageUri }} style={styles.avatar} /> : null}
              <TouchableOpacity onPress={pickImage}><Text style={styles.dateBtn}>Choose image</Text></TouchableOpacity>
              <Text style={styles.hint}>Tap to pick from gallery</Text>
            </View>
          ),
        },
        {
          backgroundColor: '#fefefe',
          title: 'Expert mode',
          subtitle: (
            <View style={styles.centerCol}>
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
          ),
        },
        {
          backgroundColor: '#ffffff',
          title: 'All set',
          subtitle: (
            <View style={styles.centerCol}>
              <Text style={styles.qTitle}>Review & Finish</Text>
              <Text style={styles.review}>Name: {firstName} {lastName}</Text>
              <Text style={styles.review}>Occupation: {occupation || '—'}</Text>
              <Text style={styles.review}>Company: {company || '—'}</Text>
              <Text style={styles.review}>Expert: {isExpert ? 'Yes' : 'No'}</Text>
              <TouchableOpacity style={[styles.addBtn, { marginTop: 16, backgroundColor: '#111' }]} onPress={finish}>
                <Text style={[styles.addBtnText, { color: '#fff' }]}>Finish onboarding</Text>
              </TouchableOpacity>
              <Text style={styles.hintSmall}>You can always edit these later.</Text>
            </View>
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
  centerCol: { flex: 1, alignItems: 'center', width: 320, marginTop: 80, gap: 10 },
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
  radioGroup: { flexDirection: 'row', gap: 20, marginTop: 10 },
  radio: { fontSize: 18, color: '#555', fontFamily: 'InriaSansRegular' },
  radioSelected: { fontSize: 18, color: '#007BFF', fontWeight: 'bold', fontFamily: 'InriaSansRegular' },
  picker: { width: '100%', backgroundColor: '#fff', borderRadius: 8 },
  dateBtn: { fontSize: 20, color: '#007BFF', fontFamily: 'InriaSansRegular', marginTop: 10, marginBottom: 10 },
  hint: { fontSize: 12, color: '#666', fontFamily: 'InriaSansRegular', marginTop: 4, textAlign: 'center' },
  hintSmall: { fontSize: 11, color: '#888', fontFamily: 'InriaSansRegular', marginTop: 8 },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%', justifyContent: 'center' },
  pill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  pillText: { fontFamily: 'InriaSansRegular' },
  addBtn: { backgroundColor: '#f1f1f1', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, elevation: 2 },
  addBtnText: { fontFamily: 'InriaSansBold', color: '#111' },
  avatar: { width: 100, height: 100, borderRadius: 50, marginVertical: 10 },
  review: { fontSize: 14, fontFamily: 'InriaSansRegular', marginTop: 4 },
});

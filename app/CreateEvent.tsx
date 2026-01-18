import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  Alert,
  KeyboardAvoidingView
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  useTheme,
  IconButton,
  Chip,
  Portal,
  Dialog,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'; // 🟢 ইমপোর্ট
import { supabase } from './lib/superbase'; // 🟢 Supabase ইমপোর্ট (পাথ ঠিক আছে কিনা দেখুন)

// 🟢 আপনার Google API Key এখানে বসান
const GOOGLE_API_KEY = "YOUR_GOOGLE_API_KEY_HERE"; 

const DURATION_OPTIONS = [
    { label: '30m', value: 30 },
    { label: '1h', value: 60 },
    { label: '1.5h', value: 90 },
    { label: '2h', value: 120 },
    { label: 'Custom', value: -1 },
];

export default function CreateEventScreen() {
  const theme = useTheme();
  const router = useRouter();

  // ─── Form States ─────────────────────────────
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(''); // 🟢 লোকেশন নাম
  const [coords, setCoords] = useState<any>(null); // 🟢 অক্ষাংশ/দ্রাঘিমাংশ
  const [details, setDetails] = useState('');
  
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [customDuration, setCustomDuration] = useState('');
  const [showCustomDurationDialog, setShowCustomDurationDialog] = useState(false);

  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // ─── Handlers ────────────────────────────────

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) setTime(selectedTime);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      allowsMultipleSelection: true,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => asset.uri);
      setImages([...images, ...newImages]);
    }
  };

  const removeImage = (indexToRemove: number) => {
      setImages(images.filter((_, index) => index !== indexToRemove));
  }

  const handleDurationPress = (value: number) => {
      if (value === -1) setShowCustomDurationDialog(true);
      else setSelectedDuration(value);
  };

  // 🟢 ফাইনাল সাবমিট হ্যান্ডলার (Supabase যুক্ত করা হয়েছে)
  const handleCreateEvent = async () => {
   // 🟢 পরিবর্তন: location চেকটি সরিয়ে ফেলা হয়েছে
if (!eventName.trim() || !description.trim()) {
  Alert.alert('Missing Info', 'Event Name and Description are required.');
  return;
}
    const finalDuration = selectedDuration === -1 ? parseInt(customDuration) : selectedDuration;
    if (!finalDuration || finalDuration <= 0) {
        Alert.alert('Invalid Duration', 'Please select a valid duration.');
        return;
    }

    setSubmitting(true);

    try {
        // ১. কারেন্ট ইউজার চেক করা
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("You must be logged in.");

        // ২. ডেট এবং টাইম কম্বাইন করে ISO স্ট্রিং বানানো
        const startDateTime = new Date(date);
        startDateTime.setHours(time.getHours());
        startDateTime.setMinutes(time.getMinutes());

        // ৩. Supabase এ ডেটা পাঠানো
        const { error } = await supabase.from('events').insert({
            creator_id: user.id,
            title: eventName,
            description: description,
            location: location, // 🟢 গুগল ম্যাপ থেকে পাওয়া লোকেশন
            // latitude: coords?.lat, // যদি টেবিলে কলাম থাকে তবে আনকমেন্ট করুন
            // longitude: coords?.lng,
            start_at: startDateTime.toISOString(),
            duration_minutes: finalDuration,
            details: details,
            // cover_url: images[0] || null, // ইমেজ আপলোডের লজিক পরে বসাতে হবে
        });

        if (error) throw error;

        Alert.alert("Success", "Event Created!", [
            { text: "OK", onPress: () => router.back() } 
        ]);

    } catch (e: any) {
        console.error(e);
        Alert.alert("Error", e.message || "Failed to create event");
    } finally {
        setSubmitting(false);
    }
  };


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled" // 🟢 অটোকমপ্লিট লিস্টে ট্যাপ করার জন্য জরুরি
        >
          
          <TextInput
            mode="outlined"
            label="Event Name *"
            value={eventName}
            onChangeText={setEventName}
            style={styles.input}
            left={<TextInput.Icon icon="format-title" />}
          />

          {/* 🟢 Google Places Autocomplete */}
          <Text variant="labelMedium" style={{marginBottom: 5, color: theme.colors.primary}}>Location *</Text>
          <View style={styles.autocompleteContainer}>
             <GooglePlacesAutocomplete
                placeholder='Search Location'
                onPress={(data, details = null) => {
                    // লোকেশন সিলেক্ট করলে এখানে আসবে
                    setLocation(data.description);
                    if (details) {
                        setCoords(details.geometry.location);
                    }
                }}
                query={{
                    key: GOOGLE_API_KEY,
                    language: 'en',
                }}
                fetchDetails={true}
                styles={{
                    textInput: {
                        backgroundColor: theme.colors.surface,
                        height: 50,
                        borderRadius: 5,
                        borderWidth: 1,
                        borderColor: 'gray',
                        color: theme.colors.onSurface,
                        paddingHorizontal: 10,
                    },
                    listView: {
                        zIndex: 1000, // লিস্ট যাতে উপরে ভেসে থাকে
                        position: 'absolute',
                        top: 55,
                        width: '100%',
                        backgroundColor: 'white',
                    }
                }}
                enablePoweredByContainer={false}
             />
          </View>

          <TextInput
            mode="outlined"
            label="Short Description *"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={styles.input}
          />

          {/* Date & Time Row */}
          <View style={styles.rowContainer}>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.pickerButton, {borderColor: theme.colors.outline}]}>
              <MaterialCommunityIcons name="calendar-month" size={24} color={theme.colors.primary} style={{marginRight: 8}} />
              <View>
                  <Text variant="labelSmall" style={{color: theme.colors.outline}}>Date</Text>
                  <Text variant="bodyMedium" style={{fontWeight: 'bold'}}>{date.toLocaleDateString()}</Text>
              </View>
            </TouchableOpacity>

            <View style={{width: 15}} />

            <TouchableOpacity onPress={() => setShowTimePicker(true)} style={[styles.pickerButton, {borderColor: theme.colors.outline}]}>
              <MaterialCommunityIcons name="clock-outline" size={24} color={theme.colors.primary} style={{marginRight: 8}} />
              <View>
                  <Text variant="labelSmall" style={{color: theme.colors.outline}}>Time</Text>
                  <Text variant="bodyMedium" style={{fontWeight: 'bold'}}>{time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {showDatePicker && <DateTimePicker value={date} mode="date" display='default' onChange={onDateChange} minimumDate={new Date()} />}
          {showTimePicker && <DateTimePicker value={time} mode="time" display='default' onChange={onTimeChange} />}

          <Text variant="titleMedium" style={styles.sectionTitle}>Duration</Text>
          <View style={styles.chipContainer}>
              {DURATION_OPTIONS.map((option) => {
                  const isSelected = selectedDuration === option.value;
                  return (
                      <Chip 
                          key={option.label} 
                          mode={isSelected ? 'flat' : 'outlined'} 
                          selected={isSelected}
                          onPress={() => handleDurationPress(option.value)}
                          style={styles.chip}
                          icon={option.value === -1 ? 'pencil' : 'timer-sand'}
                      >
                          {option.value === -1 && selectedDuration === -1 && customDuration ? `${customDuration}m` : option.label}
                      </Chip>
                  );
              })}
          </View>

          <TextInput
            mode="outlined"
            label="Details (Rules/Requirements)"
            value={details}
            onChangeText={setDetails}
            multiline
            numberOfLines={5}
            style={[styles.input, { marginTop: 20 }]}
          />

          <Text variant="titleMedium" style={styles.sectionTitle}>Add Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
              <TouchableOpacity style={[styles.addPhotoButton, {backgroundColor: theme.colors.elevation.level2, borderColor: theme.colors.outline}]} onPress={pickImage}>
                  <MaterialCommunityIcons name="camera-plus" size={30} color={theme.colors.primary} />
                  <Text variant="labelSmall" style={{marginTop: 5}}>Add</Text>
              </TouchableOpacity>
              
              {images.map((imgUri, index) => (
                  <View key={index} style={styles.imagePreviewContainer}>
                      <Image source={{ uri: imgUri }} style={styles.imagePreview} />
                      <IconButton icon="close-circle" size={20} iconColor={theme.colors.error} style={styles.removeImageIcon} onPress={() => removeImage(index)} />
                  </View>
              ))}
          </ScrollView>

        </ScrollView>

        <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant }]}>
          <Button
            mode="contained"
            onPress={handleCreateEvent}
            loading={submitting}
            disabled={submitting}
            contentStyle={{ height: 50 }}
            style={{ borderRadius: 25 }}
          >
            {submitting ? "Creating..." : "Create Event"}
          </Button>
        </View>

        <Portal>
            <Dialog visible={showCustomDurationDialog} onDismiss={() => setShowCustomDurationDialog(false)}>
                <Dialog.Title>Custom Duration</Dialog.Title>
                <Dialog.Content>
                    <TextInput label="Minutes" keyboardType="numeric" value={customDuration} onChangeText={setCustomDuration} mode="outlined" right={<TextInput.Affix text="min" />} />
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={() => setShowCustomDurationDialog(false)}>Cancel</Button>
                    <Button onPress={() => { if(customDuration) { setSelectedDuration(-1); setShowCustomDurationDialog(false); }}}>Set</Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, paddingBottom: 30 },
  input: { marginBottom: 15, backgroundColor: 'transparent' },
  // 🟢 অটোকমপ্লিট বক্সের জন্য স্টাইল
  autocompleteContainer: {
     zIndex: 1, // এটি অন্যান্য উপাদানের উপরে থাকবে
     marginBottom: 15,
  },
  rowContainer: { flexDirection: 'row', marginBottom: 15, justifyContent: 'space-between' },
  pickerButton: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 8 },
  sectionTitle: { marginTop: 15, marginBottom: 10, fontWeight: 'bold' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 },
  chip: { borderRadius: 20 },
  photoScroll: { flexDirection: 'row', marginBottom: 20 },
  addPhotoButton: { width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  imagePreviewContainer: { position: 'relative', marginRight: 10 },
  imagePreview: { width: 80, height: 80, borderRadius: 12 },
  removeImageIcon: { position: 'absolute', top: -10, right: -10, margin: 0, backgroundColor: 'white' },
  footer: { padding: 20, borderTopWidth: 1 },
});
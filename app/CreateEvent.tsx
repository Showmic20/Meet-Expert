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
  Divider
} from 'react-native-paper';
import { Stack, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

// 🟢 সাধারণ ডিউরেশন অপশন (স্মার্ট সিলেকশনের জন্য)
const DURATION_OPTIONS = [
    { label: '30m', value: 30 },
    { label: '1h', value: 60 },
    { label: '1.5h', value: 90 },
    { label: '2h', value: 120 },
    { label: 'Custom', value: -1 }, // কাস্টম ইনপুটের জন্য
];

export default function CreateEventScreen() {
  const theme = useTheme();
  const router = useRouter();

  // ─── Form States ─────────────────────────────
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState('');
  
  // Date & Time States
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Duration States
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [customDuration, setCustomDuration] = useState('');
  const [showCustomDurationDialog, setShowCustomDurationDialog] = useState(false);

  // Image State
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // ─── Handlers ────────────────────────────────

  // 🟢 তারিখ পরিবর্তন হ্যান্ডলার
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios'); // iOS এ ডেটপিকার খোলা থাকে, Android এ বন্ধ হয়
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  // 🟢 সময় পরিবর্তন হ্যান্ডলার
  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  // 🟢 ইমেজ পিকার হ্যান্ডলার
  const pickImage = async () => {
    // পারমিশন চেক
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to add photos.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      allowsMultipleSelection: true, // একাধিক ছবি সিলেকশন (যদি সাপোর্ট করে)
    });

    if (!result.canceled) {
      // নতুন ছবিগুলো আগের ছবির লিস্টের সাথে যুক্ত করা
      const newImages = result.assets.map(asset => asset.uri);
      setImages([...images, ...newImages]);
    }
  };

  // ছবি রিমুভ করা
  const removeImage = (indexToRemove: number) => {
      setImages(images.filter((_, index) => index !== indexToRemove));
  }

  // ডিউরেশন চিপ হ্যান্ডলার
  const handleDurationPress = (value: number) => {
      if (value === -1) {
          setShowCustomDurationDialog(true);
      } else {
          setSelectedDuration(value);
      }
  };

  // 🟢 ফাইনাল সাবমিট হ্যান্ডলার
  const handleCreateEvent = async () => {
    // 1. সাধারণ ভ্যালিডেশন
    if (!eventName.trim() || !description.trim()) {
      Alert.alert('Missing Info', 'Please provide at least an Event Name and Description.');
      return;
    }
    
    const finalDuration = selectedDuration === -1 ? parseInt(customDuration) : selectedDuration;
    if (!finalDuration || finalDuration <= 0) {
        Alert.alert('Invalid Duration', 'Please select a valid duration.');
        return;
    }

    setSubmitting(true);

    // 2. ডেটা তৈরি (এখানে আপনি Supabase এ পাঠাবেন)
    const eventData = {
      title: eventName,
      description,
      details,
      date: date.toISOString().split('T')[0], // YYYY-MM-DD
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), // HH:MM
      durationMinutes: finalDuration,
      images: images, // বাস্তব অ্যাপে ইমেজ আগে আপলোড করে URL নিতে হবে
    };

    console.log("Submitting Event Data:", eventData);

    // 3. সাবমিশন সিমুলেশন (Supabase ইন্টিগ্রেশনের পর এটি বাদ দেবেন)
    setTimeout(() => {
        setSubmitting(false);
        Alert.alert("Success", "Event Created Successfully!", [
            { text: "OK", onPress: () => router.back() } // সফল হলে ব্যাকে যাবে
        ]);
    }, 1500);

    // TODO: Supabase integration here
    /*
    try {
       // Supabase insert logic...
       // ইমেজ আপলোড লজিক...
       router.back();
    } catch (error) {
       Alert.alert("Error", error.message);
       setSubmitting(false);
    }
    */
  };


  // ─── UI RENDER ───────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['bottom']}>
      {/* 🟢 কাস্টম হেডার কনফিগারেশন */}
 

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Section: Basic Info */}
          <TextInput
            mode="outlined"
            label="Event Name"
            placeholder="e.g., Tech Experience 2025"
            value={eventName}
            onChangeText={setEventName}
            style={styles.input}
            left={<TextInput.Icon icon="format-title" />}
          />

          <TextInput
            mode="outlined"
            label="Short Description"
            placeholder="What is this event about?"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={styles.input}
          />

          {/* Section: Date & Time Pickers (Smart Row) */}
          <View style={styles.rowContainer}>
            {/* Date Picker Field */}
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.pickerButton, {borderColor: theme.colors.outline}]}>
              <MaterialCommunityIcons name="calendar-month" size={24} color={theme.colors.primary} style={{marginRight: 8}} />
              <View>
                  <Text variant="labelSmall" style={{color: theme.colors.outline}}>Date</Text>
                  <Text variant="bodyMedium" style={{fontWeight: 'bold'}}>{date.toLocaleDateString()}</Text>
              </View>
            </TouchableOpacity>

            <View style={{width: 15}} />

            {/* Time Picker Field */}
            <TouchableOpacity onPress={() => setShowTimePicker(true)} style={[styles.pickerButton, {borderColor: theme.colors.outline}]}>
              <MaterialCommunityIcons name="clock-outline" size={24} color={theme.colors.primary} style={{marginRight: 8}} />
              <View>
                  <Text variant="labelSmall" style={{color: theme.colors.outline}}>Time</Text>
                  <Text variant="bodyMedium" style={{fontWeight: 'bold'}}>{time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* DateTimePicker Components (Hidden by default) */}
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={time}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
            />
          )}

          {/* Section: Duration (Smart Chips) */}
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
                          textStyle={{ fontWeight: isSelected ? 'bold' : 'normal'}}
                          icon={option.value === -1 ? 'pencil' : 'timer-sand'}
                      >
                          {option.value === -1 && selectedDuration === -1 && customDuration ? `${customDuration}m` : option.label}
                      </Chip>
                  );
              })}
          </View>

          {/* Section: Details / Rules */}
          <TextInput
            mode="outlined"
            label="Requirements & Rules (Details)"
            placeholder="Add any specific instructions, rules or requirements..."
            value={details}
            onChangeText={setDetails}
            multiline
            numberOfLines={5}
            style={[styles.input, { marginTop: 20 }]}
          />

          {/* Section: Photos */}
          <Text variant="titleMedium" style={styles.sectionTitle}>Add Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
              {/* Add Photo Button */}
              <TouchableOpacity style={[styles.addPhotoButton, {backgroundColor: theme.colors.elevation.level2, borderColor: theme.colors.outline}]} onPress={pickImage}>
                  <MaterialCommunityIcons name="camera-plus" size={30} color={theme.colors.primary} />
                  <Text variant="labelSmall" style={{marginTop: 5}}>Add</Text>
              </TouchableOpacity>
              
              {/* Selected Images Preview */}
              {images.map((imgUri, index) => (
                  <View key={index} style={styles.imagePreviewContainer}>
                      <Image source={{ uri: imgUri }} style={styles.imagePreview} />
                      <IconButton 
                          icon="close-circle" 
                          size={20} 
                          iconColor={theme.colors.error}
                          style={styles.removeImageIcon}
                          onPress={() => removeImage(index)}
                      />
                  </View>
              ))}
          </ScrollView>

        </ScrollView>

        {/* Footer Action Button */}
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

        {/* Custom Duration Dialog */}
        <Portal>
            <Dialog visible={showCustomDurationDialog} onDismiss={() => setShowCustomDurationDialog(false)}>
                <Dialog.Title>Set Custom Duration</Dialog.Title>
                <Dialog.Content>
                    <TextInput 
                        label="Duration in minutes"
                        keyboardType="numeric"
                        value={customDuration}
                        onChangeText={setCustomDuration}
                        mode="outlined"
                        right={<TextInput.Affix text="min" />}
                    />
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={() => setShowCustomDurationDialog(false)}>Cancel</Button>
                    <Button onPress={() => {
                        if(customDuration) {
                            setSelectedDuration(-1);
                            setShowCustomDurationDialog(false);
                        }
                    }}>Set</Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  input: {
    marginBottom: 15,
    backgroundColor: 'transparent', // থিমের ব্যাকগ্রাউন্ড ব্যবহার করার জন্য
  },
  rowContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    justifyContent: 'space-between',
  },
  pickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    marginTop: 15,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  chip: {
    borderRadius: 20,
  },
  photoScroll: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  imagePreviewContainer: {
      position: 'relative',
      marginRight: 10,
  },
  imagePreview: {
      width: 80,
      height: 80,
      borderRadius: 12,
  },
  removeImageIcon: {
      position: 'absolute',
      top: -10,
      right: -10,
      margin: 0,
      backgroundColor: 'white', 
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
});
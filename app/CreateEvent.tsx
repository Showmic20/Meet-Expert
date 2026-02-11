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

import { supabase } from './lib/superbase';

const DURATION_OPTIONS = [
    { label: '30m', value: 30 },
    { label: '1h', value: 60 },
    { label: '2h', value: 120 },
    { label: '4h', value: 240 },
    { label: 'Custom', value: -1 },
];

export default function CreateEventScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState('');
  

  const [locationName, setLocationName] = useState(''); 


  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);


  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [customDuration, setCustomDuration] = useState('');
  const [showCustomDurationDialog, setShowCustomDurationDialog] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);



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
      allowsEditing: true, quality: 0.8,
    });
    if (!result.canceled) setImages([result.assets[0].uri]);
  };

  const removeImage = () => setImages([]);

  const handleCreateEvent = async () => {
    if (!eventName.trim() || !description.trim() || !locationName.trim()) {
      Alert.alert('Missing Info', 'Event Name, Description, and Location are required.');
      return;
    }
    
    const durationInMinutes = selectedDuration === -1 ? parseInt(customDuration) : selectedDuration;
    if (!durationInMinutes || durationInMinutes <= 0) {
        Alert.alert('Invalid Duration', 'Please select a valid duration.');
        return;
    }

    setSubmitting(true);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("You must be logged in.");

        const startDateTime = new Date(date);
        startDateTime.setHours(time.getHours());
        startDateTime.setMinutes(time.getMinutes());

        const endDateTime = new Date(startDateTime.getTime() + durationInMinutes * 60000);
        const fullDescription = details.trim() ? `${description}\n\nDetails:\n${details}` : description;
        const coverPhotoUrl = images.length > 0 ? images[0] : null;

        const { error } = await supabase.from('events').insert({
            creator_id: user.id,
            title: eventName,
            description: fullDescription,
            location: locationName, 
            latitude: null, 
            longitude: null,
            start_at: startDateTime.toISOString(),
            end_at: endDateTime.toISOString(),
            cover_url: coverPhotoUrl, 
        });

        if (error) throw error;
        Alert.alert("Success", "Event Created!", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e: any) {
        Alert.alert("Error", e.message);
    } finally {
        setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <TextInput
            mode="outlined"
            label="Event Name *"
            value={eventName}
            onChangeText={setEventName}
            style={styles.input}
          />

  
          <TextInput
            mode="outlined"
            label="Location *"
            placeholder="e.g. Innovation Hall, Dhaka"
            value={locationName}
            onChangeText={setLocationName}
            style={styles.input}
            left={<TextInput.Icon icon="map-marker" />}
          />

          <TextInput
            mode="outlined"
            label="Short Description *"
            value={description}
            onChangeText={setDescription}
            multiline numberOfLines={3} style={styles.input}
          />

     
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
                          key={option.label} mode={isSelected ? 'flat' : 'outlined'} selected={isSelected}
                          onPress={() => {
                             if (option.value === -1) setShowCustomDurationDialog(true);
                             else setSelectedDuration(option.value);
                          }}
                          style={styles.chip}
                      >
                          {option.value === -1 && selectedDuration === -1 && customDuration ? `${customDuration}m` : option.label}
                      </Chip>
                  );
              })}
          </View>s
          <TextInput
            mode="outlined"
            label="Details (Rules/Requirements)"
            value={details} onChangeText={setDetails}
            multiline numberOfLines={5} style={[styles.input, { marginTop: 20 }]}
          />

  
          <Text variant="titleMedium" style={styles.sectionTitle}>Cover Photo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
              <TouchableOpacity style={[styles.addPhotoButton, {backgroundColor: theme.colors.elevation.level2, borderColor: theme.colors.outline}]} onPress={pickImage}>
                  <MaterialCommunityIcons name="camera-plus" size={30} color={theme.colors.primary} />
                  <Text variant="labelSmall" style={{marginTop: 5}}>Select</Text>
              </TouchableOpacity>
              {images.map((imgUri, index) => (
                  <View key={index} style={styles.imagePreviewContainer}>
                      <Image source={{ uri: imgUri }} style={styles.imagePreview} />
                      <IconButton icon="close-circle" size={20} iconColor={theme.colors.error} style={styles.removeImageIcon} onPress={removeImage} />
                  </View>
              ))}
          </ScrollView>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant }]}>
          <Button mode="contained" onPress={handleCreateEvent} loading={submitting} disabled={submitting} contentStyle={{ height: 50 }}>
            {submitting ? "Creating..." : "Create Event"}
          </Button>
        </View>

 
        <Portal>
            <Dialog visible={showCustomDurationDialog} onDismiss={() => setShowCustomDurationDialog(false)}>
                <Dialog.Title>Custom Duration</Dialog.Title>
                <Dialog.Content>
                    <TextInput label="Minutes" keyboardType="numeric" value={customDuration} onChangeText={setCustomDuration} mode="outlined" />
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
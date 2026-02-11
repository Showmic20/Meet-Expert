import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use your actual Supabase URL and public key (either supabaseAnonKey or supabasePublishableKey)
const supabaseUrl = 'https://kdtdvslrboxxchdzcfqd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkdGR2c2xyYm94eGNoZHpjZnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMzU3MzEsImV4cCI6MjA3MzcxMTczMX0.G_40xlE3ZUL-i70HQYjCzXM5NWZtaMEtTZdtb9HTyI4'; // or `supabasePublishableKey`

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,      // Store the session in AsyncStorage
    autoRefreshToken: true,     // Auto refresh token when expired
    persistSession: true,      // Persist session across app restarts
    detectSessionInUrl: false, // Disable detecting session from URL (useful for web apps)
  },
});

export default supabase;
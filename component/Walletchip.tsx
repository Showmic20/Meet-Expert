import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper'; 
import { useAuth } from '../app/lib/AuthProvid'; // পাথ ঠিক আছে কিনা চেক করে নিন
// আপনার নির্দেশ অনুযায়ী Supabase ইমপোর্ট লিঙ্ক
import { supabase } from '../app/lib/superbase'; 

export default function WalletChip() {
  const { session } = useAuth();
  const [coins, setCoins] = useState<number>(0);

  useEffect(() => {
    if (!session?.user?.id) return;

    const userId = session.user.id;

    // ১. ইনিশিয়াল কয়েন ফেচ করা
    const fetchCoins = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('coins')
        .eq('id', userId)
        .single();
      
      if (data) setCoins(data.coins || 0);
    };

    fetchCoins();

    // ২. রিয়েলটাইম লিসেনার (রিভিউ দিলে বা খরচ করলে সাথে সাথে আপডেট হবে)
    const subscription = supabase
      .channel(`wallet-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
        (payload) => {
          if (payload.new) {
            setCoins(payload.new.coins);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [session?.user?.id]);

  return (
    <View style={styles.container}>
      {/* কয়েন আইকন */}
      <Icon source="database" size={16} color="#F57F17" /> 
      <Text style={styles.amount}>{coins}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1', // হালকা গোল্ডেন কালার
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
    marginRight: 8, // ডান পাশের এলিমেন্ট থেকে গ্যাপ
    elevation: 1,
  },
  amount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F57F17', // গাঢ় গোল্ডেন টেক্সট
    marginLeft: 6,
  },
});
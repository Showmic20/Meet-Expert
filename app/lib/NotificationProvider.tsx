import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './superbase'; // আপনার supabase পাথ
import { useAuth } from './AuthProvid'; // আপনার AuthProvider পাথ

type NotificationContextType = {
  unreadCount: number;
  notifications: any[];
  markAsRead: () => Promise<void>;
  loading: boolean;
};

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  notifications: [],
  markAsRead: async () => {},
  loading: false,
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // ১. নোটিফিকেশন ফেচ করা
  const fetchNotifications = async () => {
    if (!session?.user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*, actor:users!actor_id(first_name, last_name, profile_picture_url)') // ইউজারের নাম ও ছবি আনবে
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
    } else {
      setNotifications(data || []);
      const unread = data?.filter((n: any) => !n.is_read).length || 0;
      setUnreadCount(unread);
    }
    setLoading(false);
  };

  // ২. সব নোটিফিকেশন Read হিসেবে মার্ক করা
  const markAsRead = async () => {
    if (!session?.user) return;
    
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false);

    if (!error) {
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  // ৩. রিয়েলটাইম লিসেনার এবং ইনিশিয়াল লোড
  useEffect(() => {
    if (session?.user) {
      fetchNotifications();

      // Realtime Subscription
      const channel = supabase
        .channel('realtime-notifications')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
          (payload) => {
            // নতুন নোটিফিকেশন আসলে কাউন্ট বাড়ানো এবং লিস্ট আপডেট করা
            console.log('New Notification!', payload);
            fetchNotifications(); // সিম্পল রাখার জন্য রি-ফেচ করছি
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session]);

  return (
    <NotificationContext.Provider value={{ unreadCount, notifications, markAsRead, loading }}>
      {children}
    </NotificationContext.Provider>
  );
};
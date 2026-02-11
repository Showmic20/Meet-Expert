import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './superbase'; 
import { useAuth } from './AuthProvid'; 

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


  const fetchNotifications = async () => {
    if (!session?.user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*, actor:users!actor_id(first_name, last_name, profile_picture_url)') 
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

  
  useEffect(() => {
    if (session?.user) {
      fetchNotifications();

      
      const channel = supabase
        .channel('realtime-notifications')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
          (payload) => {
           
            console.log('New Notification!', payload);
            fetchNotifications(); 
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
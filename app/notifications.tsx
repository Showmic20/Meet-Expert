import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { 
  Appbar, 
  Avatar, 
  Text, 
  useTheme, 
  ActivityIndicator, 
  Divider, 
  TouchableRipple
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useNotifications } from './lib/NotificationProvider';
import { useLanguage } from './lib/LanguageContext'; // 🟢 Import Language Hook

// 🟢 Localized Time Helper
const getTimeAgo = (dateString: string, lang: 'en' | 'bn') => {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const isBn = lang === 'bn';

  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return isBn ? `${interval} বছর আগে` : `${interval}y ago`;
  
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return isBn ? `${interval} মাস আগে` : `${interval}mo ago`;
  
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return isBn ? `${interval} দিন আগে` : `${interval}d ago`;
  
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return isBn ? `${interval} ঘন্টা আগে` : `${interval}h ago`;
  
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return isBn ? `${interval} মিনিট আগে` : `${interval}m ago`;
  
  return isBn ? "এইমাত্র" : "Just now";
};

// 🟢 Helper to Translate Database Messages
const getLocalizedMessage = (message: string, lang: 'en' | 'bn') => {
  if (lang === 'en') return message;

  // ডাটাবেসের ইংরেজি মেসেজগুলোর বাংলা ম্যাপিং
  if (message.includes("sent you a chat request")) return "আপনাকে চ্যাট রিকোয়েস্ট পাঠিয়েছেন।";
  if (message.includes("started following you")) return "আপনাকে ফলো করা শুরু করেছেন।";
  if (message.includes("New Chat Request")) return "নতুন চ্যাট রিকোয়েস্ট";
  
  return message; // কোনো ম্যাচ না পেলে যা আছে তাই দেখাবে
};

export default function NotificationScreen() {
  const { notifications, loading, markAsRead } = useNotifications();
  const { t, language } = useLanguage(); // 🟢 Get Language
  const theme = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    markAsRead();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderItem = ({ item }: { item: any }) => {
    const backgroundColor = item.is_read ? theme.colors.surface : theme.colors.elevation.level2;
    
    const isSystem = item.type === 'system' || !item.actor;
    const actorName = item.actor ? `${item.actor.first_name} ${item.actor.last_name}` : "System";
    const avatarUrl = item.actor?.profile_picture_url;

    // 🟢 Translate Message based on Language
    const displayMessage = getLocalizedMessage(item.message, language);

    return (
      <TouchableRipple 
        onPress={() => console.log('Notification clicked')} 
        rippleColor="rgba(0, 0, 0, .1)"
      >
        <View style={[styles.itemContainer, { backgroundColor }]}>
          {/* Avatar Section */}
          <View style={styles.avatarContainer}>
            {isSystem ? (
               <Avatar.Icon size={48} icon="bell-ring" style={{backgroundColor: theme.colors.secondaryContainer}} color={theme.colors.onSecondaryContainer} />
            ) : avatarUrl ? (
               <Avatar.Image size={48} source={{ uri: avatarUrl }} />
            ) : (
               <Avatar.Text size={48} label={item.actor?.first_name?.charAt(0) || "U"} />
            )}
            
            {item.type === 'chat_request' && (
              <View style={[styles.iconBadge, { backgroundColor: theme.colors.primary }]}>
                <Avatar.Icon size={14} icon="message" color="white" style={{backgroundColor:'transparent'}} />
              </View>
            )}
          </View>

          {/* Text Content */}
          <View style={styles.textContainer}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
              <Text style={{ fontWeight: 'bold' }}>{actorName}</Text>
              <Text> {displayMessage}</Text>
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.outline, marginTop: 4 }}>
              {getTimeAgo(item.created_at, language)} {/* 🟢 Pass Language */}
            </Text>
          </View>

          {/* Unread Dot */}
          {!item.is_read && (
            <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
          )}
        </View>
      </TouchableRipple>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        {/* 🟢 Translated Title */}
        <Appbar.Content title={t('notifications')} />
      </Appbar.Header>

      {loading && notifications.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" animating={true} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <Divider />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
               <Avatar.Icon size={80} icon="bell-sleep" style={{backgroundColor: 'transparent'}} color={theme.colors.outline} />
               {/* 🟢 Translated Empty State */}
               <Text variant="titleMedium" style={{color: theme.colors.outline, marginTop: 10}}>
                 {t('noNotifications')}
               </Text>
            </View>
          }
          contentContainerStyle={notifications.length === 0 && { flex: 1 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  itemContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
});
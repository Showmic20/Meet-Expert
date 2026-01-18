import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Modal, Dimensions } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window');

const RANKS = [
  { name: 'Bronze', minScore: 0, color: '#CD7F32', icon: 'trophy-outline' },
  { name: 'Silver', minScore: 100, color: '#C0C0C0', icon: 'trophy' },
  { name: 'Gold', minScore: 300, color: '#FFD700', icon: 'trophy-variant' },
  { name: 'Diamond', minScore: 600, color: '#29B6F6', icon: 'diamond-stone' },
  { name: 'Conqueror', minScore: 1000, color: '#E53935', icon: 'crown' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  currentScore?: number;
};

export default function RankModal({ visible, onClose, currentScore = 340 }: Props) {
  const theme = useTheme();
  const confettiRef = useRef<LottieView>(null);
  
  const currentRankIndex = RANKS.findIndex((r, i) => 
    currentScore >= r.minScore && (RANKS[i + 1] ? currentScore < RANKS[i + 1].minScore : true)
  );
  
  const currentRank = RANKS[currentRankIndex] || RANKS[0];
  const nextRank = RANKS[currentRankIndex + 1];
  
  let progress = 0;
  let needed = 0;

  if (nextRank) {
    const range = nextRank.minScore - currentRank.minScore;
    const gained = currentScore - currentRank.minScore;
    progress = gained / range;
    needed = nextRank.minScore - currentScore;
  } else {
    progress = 1;
  }

  useEffect(() => {
    if (visible && confettiRef.current) {
      confettiRef.current.play();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          
          <View style={styles.header}>
            <Text style={styles.title}>Rank Status</Text>
            <IconButton icon="close" size={24} onPress={onClose} style={{margin:0}} />
          </View>

          <View style={styles.trophyContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {RANKS.map((rank, index) => {
                const isCurrent = index === currentRankIndex;
                const isUnlocked = index <= currentRankIndex;

                return (
                  <View key={rank.name} style={[styles.rankItem, isCurrent && styles.activeRankItem]}>
                    <MaterialCommunityIcons 
                      name={rank.icon as any} 
                      size={isCurrent ? 50 : 35} 
                      color={isUnlocked ? rank.color : '#E0E0E0'} 
                    />
                    <Text style={[
                      styles.rankName, 
                      { color: isCurrent ? '#000' : '#888', fontWeight: isCurrent ? 'bold' : 'normal' }
                    ]}>
                      {rank.name}
                    </Text>
                    {isCurrent && <View style={styles.currentBadge}><Text style={styles.badgeText}>Current</Text></View>}
                  </View>
                );
              })}
            </ScrollView>
          </View>

          <Text style={styles.currentRankText}>
            Current Rank : <Text style={{ color: currentRank.color, fontWeight: 'bold' }}>{currentRank.name}</Text>
          </Text>

          <View style={styles.progressSection}>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: currentRank.color }]} />
              
              {/* 🟢 ফায়ার অ্যানিমেশন পাথ ঠিক করা হয়েছে */}
              <View style={[styles.fireContainer, { left: `${Math.min(progress * 100, 95)}%` }]}> 
                 <LottieView
                    source={require('../assets/animation/Fire.json')} 
                    autoPlay
                    loop
                    style={styles.fireAnimation}
                    resizeMode="cover"
                 />
              </View>
            </View>
            
            <Text style={styles.helperText}>
              {nextRank 
                ? `Need ${needed} more rating for ${nextRank.name}` 
                : "You are at the top level!"}
            </Text>
          </View>

          {/* 🟢 কনফেটি অ্যানিমেশন পাথ ঠিক করা হয়েছে */}
          <View style={styles.confettiContainer} pointerEvents="none">
             <LottieView
                ref={confettiRef}
                source={require('../assets/animation/Confetti.json')} 
                loop={true}
                style={styles.confetti}
                resizeMode="cover"
             />
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.9,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    elevation: 10,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  trophyContainer: {
    height: 120,
    marginVertical: 10,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  rankItem: {
    alignItems: 'center',
    marginHorizontal: 12,
    opacity: 0.6,
    transform: [{ scale: 0.9 }],
  },
  activeRankItem: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  rankName: {
    marginTop: 6,
    fontSize: 12,
  },
  currentBadge: {
    marginTop: 4,
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
  currentRankText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginBottom: 30,
    marginTop: 10,
  },
  progressSection: {
    width: '100%',
    marginBottom: 20,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: '#EEEEEE',
    borderRadius: 5,
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 15,
    overflow: 'visible',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  fireContainer: {
    position: 'absolute',
    top: -35,
    marginLeft: -20,
    width: 50,
    height: 50,
    zIndex: 20,
  },
  fireAnimation: {
    width: '100%',
    height: '100%',
  },
  helperText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 12,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confetti: {
    width: '100%',
    height: '100%',
  },
});
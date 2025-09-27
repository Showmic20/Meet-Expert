import { DrawerActions, useNavigation } from "@react-navigation/native";
import React from "react";
import { View, ScrollView, Image, StyleSheet, StatusBar } from "react-native";
import { Text, Avatar, IconButton, Card, Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const navigation = useNavigation();
  return (<>
    <StatusBar barStyle="dark-content" backgroundColor="white" />
    <SafeAreaView style ={{flex: 1, backgroundColor :"white"}}>
    
      <ScrollView style={styles.container}>
        {/* Cover Photo */}
        <View style={styles.coverContainer}>
          <Image
            source={{ uri: "https://via.placeholder.com/100" }}
            style={styles.coverPhoto}
          />
     
          {/* Profile Picture */}
          <View style={styles.avatarWrapper}>
            <Avatar.Image
              size={96}
              source={{ uri: "https://via.placeholder.com/100" }}
            />
            <IconButton
              icon="camera"
              size={18}
              style={styles.avatarEdit}
              onPress={() => {}}
            />
          </View>
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.name}>Swarup Deb Nath</Text>
          <Text style={styles.profession}>Software Engineer</Text>
        </View>

        {/* Info Cards */}
        <View style={styles.infoCards}>
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text>⭐ 4.0</Text>
              <Text>Rating</Text>
            </Card.Content>
          </Card>
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text>🏆 Silver</Text>
              <Text>Rank</Text>
            </Card.Content>
          </Card>
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text>💬 40 BDT/hr</Text>
              <Text>Chat</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Bio Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bio</Text>
            <IconButton icon="pencil" size={18} onPress={() => {}} />
          </View>
          <Text style={styles.bio}>
            A software engineer is a professional who applies engineering
            principles to the design, development, testing, and maintenance of
            software...
          </Text>
        </View>

        {/* Skills Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Skill & Expertise</Text>
            <Button mode="outlined" onPress={() => {}}>Edit</Button>
          </View>
          <Text>• Full Stack Designer</Text>
          <Text>• React Native Expert</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  coverContainer: { position: "relative" },
  coverPhoto: { width: "100%", height: 100, color: "black" },
  icon: { position: "absolute", top: 10, backgroundColor: "rgba(255,255,255,0.7)" },
  avatarWrapper: {
    position: "absolute",
    bottom: -48,
    left: "50%",
    marginLeft: -48,
  },
  avatarEdit: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "white",
  },
  userInfo: { marginTop: 60, alignItems: "center" },
  name: { fontSize: 20, fontWeight: "bold" },
  profession: { color: "gray", marginTop: 4 },
  infoCards: { flexDirection: "row", justifyContent: "space-around", marginTop: 20, paddingHorizontal: 10 },
  card: { flex: 1, marginHorizontal: 4 },
  cardContent: { alignItems: "center" },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "bold" },
  bio: { color: "gray", marginTop: 4, lineHeight: 20 },
});

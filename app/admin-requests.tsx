import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, StyleSheet, Image, TouchableOpacity, 
  Modal, Alert, SafeAreaView, ActivityIndicator, StatusBar 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from "../app/lib/superbase"; 
import { useRouter } from 'expo-router';

export default function AdminRequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null); 
  const [modalVisible, setModalVisible] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('status', 'pending') 
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert("Error", "Failed to fetch requests");
      console.log(error);
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  
  const updateStatus = async (id: number, newStatus: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('verification_requests')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      Alert.alert("Error", "Could not update status");
    } else {
      Alert.alert("Success", `Request ${newStatus}!`);
      setModalVisible(false);
      fetchRequests(); 
    }
  };

  
  const renderItem = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => {
        setSelectedRequest(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.row}>
        <View>
          <Text style={styles.userIdText}>User ID: {item.user_id.slice(0, 8)}...</Text>
          <Text style={styles.dateText}>{new Date(item.created_at).toDateString()}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PENDING</Text>
        </View>
      </View>
      <Text style={styles.tapText}>Tap to review documents</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Verification Requests</Text>
        <TouchableOpacity onPress={fetchRequests}>
          <Ionicons name="refresh" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2495ff" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No pending requests.</Text>}
        />
      )}

      
      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={30} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Review Documents</Text>
            <View style={{ width: 30 }} />
          </View>

          {selectedRequest && (
            <View style={styles.modalContent}>
                <Text style={styles.sectionHeader}>Live Photo (Face)</Text>
                <Image source={{ uri: selectedRequest.live_image_path }} style={styles.evidenceImage} />

                <Text style={styles.sectionHeader}>ID Document</Text>
                <Image source={{ uri: selectedRequest.nid_image_path }} style={styles.evidenceImage} />
                
                {selectedRequest.doc_image_path && (
                    <>
                        <Text style={styles.sectionHeader}>Other Document</Text>
                        <Image source={{ uri: selectedRequest.doc_image_path }} style={styles.evidenceImage} />
                    </>
                )}

               
                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.rejectBtn]} 
                    onPress={() => updateStatus(selectedRequest.id, 'rejected')}
                  >
                    <Text style={styles.btnText}>Reject</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.approveBtn]} 
                    onPress={() => updateStatus(selectedRequest.id, 'approved')}
                  >
                    <Text style={styles.btnText}>Approve</Text>
                  </TouchableOpacity>
                </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  card: {
    backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userIdText: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  dateText: { color: '#888', marginTop: 4, fontSize: 12 },
  badge: { backgroundColor: '#fff3cd', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#856404', fontSize: 10, fontWeight: 'bold' },
  tapText: { marginTop: 12, color: '#2495ff', fontSize: 12, fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#888' },
  
  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalContent: { padding: 20, alignItems: 'center' },
  sectionHeader: { alignSelf: 'flex-start', fontSize: 14, fontWeight: '600', color: '#555', marginTop: 10, marginBottom: 5 },
  evidenceImage: { width: '100%', height: 200, borderRadius: 8, resizeMode: 'contain', backgroundColor: '#f0f0f0', marginBottom: 10 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 30 },
  actionBtn: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  rejectBtn: { backgroundColor: '#ffebee' },
  approveBtn: { backgroundColor: '#e8f5e9' },
  btnText: { fontWeight: 'bold', fontSize: 16, color: '#000' } 
});
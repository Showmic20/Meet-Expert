import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, 
  Modal, Alert, SafeAreaView, ActivityIndicator, StatusBar, ScrollView, 
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/superbase'; 
import { useRouter } from 'expo-router';
import { Appbar, Badge, Button, Divider } from 'react-native-paper';

export default function AdminComplaintsScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);


  const fetchReports = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        reporter:reporter_id (first_name, last_name)
      `)
      .eq('status', 'pending') 
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      Alert.alert("Error", "Failed to fetch reports");
    } else {
      setReports(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  
  const handleAction = async (id: string, action: 'resolved' | 'rejected') => {
    setLoading(true);
    const { error } = await supabase
      .from('reports')
      .update({ status: action })
      .eq('id', id);

    setLoading(false);
    
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", `Report marked as ${action}`);
      setModalVisible(false);
      fetchReports();
    }
  };

  
  const renderItem = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => {
        setSelectedReport(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.row}>
        <View style={{flex: 1}}>
          <Text style={styles.reasonTitle}>{item.reason}</Text>
          <Text style={styles.reporterName}>
            By: {item.reporter?.first_name || 'Unknown'} {item.reporter?.last_name || ''}
          </Text>
          <Text style={styles.dateText}>{new Date(item.created_at).toDateString()}</Text>
        </View>
        <Badge style={{backgroundColor: '#FF3B30'}}>Pending</Badge>
      </View>
      <Text style={styles.tapText} numberOfLines={1}>
        Details: {item.details || "No details provided"}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white"/>
      <Appbar.Header style={{backgroundColor: 'white'}}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Complaints & Reports" />
        <Appbar.Action icon="refresh" onPress={fetchReports} />
      </Appbar.Header>

      {loading && !modalVisible ? (
        <ActivityIndicator size="large" color="#FF3B30" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-circle-outline" size={60} color="#4CAF50" />
                <Text style={styles.emptyText}>No pending complaints!</Text>
            </View>
          }
        />
      )}

      
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Report Details</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close-circle" size={30} color="#333" />
            </TouchableOpacity>
          </View>
          
          {selectedReport && (
            <ScrollView contentContainerStyle={styles.modalContent}>
                
                <View style={styles.infoBox}>
                    <Text style={styles.label}>Reason:</Text>
                    <Text style={styles.valueHighlight}>{selectedReport.reason}</Text>
                </View>

                <View style={styles.infoBox}>
                    <Text style={styles.label}>Details:</Text>
                    <Text style={styles.valueBody}>{selectedReport.details}</Text>
                </View>

                <Divider style={{marginVertical: 15}} />

                <View style={styles.infoBox}>
                    <Text style={styles.label}>Reporter Info:</Text>
                    <Text style={styles.valueSmall}>Name: {selectedReport.reporter?.first_name} {selectedReport.reporter?.last_name}</Text>
                    <Text style={styles.valueSmall}>User ID: {selectedReport.reporter_id}</Text>
                    <Text style={styles.valueSmall}>Chat Room ID: {selectedReport.room_id}</Text>
                </View>

                
                <View style={styles.actionContainer}>
                    <Text style={styles.actionTitle}>Take Action:</Text>
                    
                    <Button 
                        mode="contained" 
                        icon="check"
                        buttonColor="#4CAF50"
                        style={styles.actionBtn}
                        onPress={() => handleAction(selectedReport.id, 'resolved')}
                    >
                        Mark as Resolved (Valid)
                    </Button>
                    <Text style={styles.hintText}>User will get refund or expert will be warned.</Text>

                    <Button 
                        mode="contained" 
                        icon="close"
                        buttonColor="#F44336"
                        style={[styles.actionBtn, {marginTop: 10}]}
                        onPress={() => handleAction(selectedReport.id, 'rejected')}
                    >
                        Reject Report (Invalid)
                    </Button>
                    <Text style={styles.hintText}>No action taken. Report closed.</Text>
                </View>

            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  card: {
    backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
    borderLeftWidth: 4, borderLeftColor: '#FF3B30' 
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  reasonTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  reporterName: { fontSize: 13, color: '#666' },
  dateText: { fontSize: 12, color: '#999', marginTop: 2 },
  tapText: { marginTop: 10, fontSize: 13, color: '#2196F3', fontStyle: 'italic' },
  
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 10, color: '#666', fontSize: 16 },

  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#eee' },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalContent: { padding: 20 },
  
  infoBox: { marginBottom: 15 },
  label: { fontSize: 14, color: '#888', marginBottom: 5, textTransform: 'uppercase', fontWeight: 'bold' },
  valueHighlight: { fontSize: 18, fontWeight: 'bold', color: '#FF3B30' },
  valueBody: { fontSize: 16, color: '#333', lineHeight: 24, backgroundColor: '#f9f9f9', padding: 10, borderRadius: 8 },
  valueSmall: { fontSize: 14, color: '#555', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  actionContainer: { marginTop: 20, backgroundColor: '#fff0f0', padding: 15, borderRadius: 10 },
  actionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  actionBtn: { borderRadius: 8, paddingVertical: 4 },
  hintText: { fontSize: 12, color: '#666', marginBottom: 15, marginLeft: 5 }
});
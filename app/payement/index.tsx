import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text, Button, Card, RadioButton, TextInput, Icon, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PaymentScreen() {
  const router = useRouter();
  const [selectedAmount, setSelectedAmount] = useState('100');
  const [paymentMethod, setPaymentMethod] = useState('card');

  const coinPackages = [
    { coins: '100', price: '$1.99', label: 'Starter' },
    { coins: '500', price: '$4.99', label: 'Popular', isPopular: true },
    { coins: '1000', price: '$8.99', label: 'Pro' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Secure Payment</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
        {/* Wallet Balance Card */}
        <Card style={styles.balanceCard}>
          <Card.Content style={{ alignItems: 'center' }}>
            <Text style={{ color: '#E3F2FD', fontSize: 14 }}>Current Balance</Text>
            <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold', marginVertical: 5 }}>0 Coins</Text>
            <View style={styles.badge}>
                <Text style={{ color: '#004D40', fontSize: 10, fontWeight: 'bold' }}>ACTIVE</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Coin Packages Section */}
        <Text style={styles.sectionTitle}>Select Package</Text>
        <View style={styles.packagesGrid}>
          {coinPackages.map((pkg) => (
            <TouchableOpacity 
              key={pkg.coins} 
              style={[
                styles.pkgCard, 
                selectedAmount === pkg.coins && styles.selectedPkg
              ]}
              onPress={() => setSelectedAmount(pkg.coins)}
            >
              {pkg.isPopular && <View style={styles.popularTag}><Text style={styles.popularText}>BEST</Text></View>}
              <Text style={[styles.coinsText, selectedAmount === pkg.coins && {color: '#1565C0'}]}>{pkg.coins}</Text>
              <Text style={{ fontSize: 12, color: 'gray' }}>Coins</Text>
              <Text style={styles.priceText}>{pkg.price}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Method Section */}
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <Card style={styles.methodCard}>
            <RadioButton.Group onValueChange={setPaymentMethod} value={paymentMethod}>
                <TouchableOpacity style={styles.methodRow} onPress={() => setPaymentMethod('card')}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Icon source="credit-card" size={24} color="#1565C0" />
                        <Text style={{marginLeft: 15, fontWeight: '600'}}>Credit/Debit Card</Text>
                    </View>
                    <RadioButton value="card" color="#1565C0" />
                </TouchableOpacity>
                
                <View style={styles.divider} />

                <TouchableOpacity style={styles.methodRow} onPress={() => setPaymentMethod('bkash')}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Icon source="cellphone" size={24} color="#E91E63" />
                        <Text style={{marginLeft: 15, fontWeight: '600'}}>bKash / Mobile Wallet</Text>
                    </View>
                    <RadioButton value="bkash" color="#E91E63" />
                </TouchableOpacity>
            </RadioButton.Group>
        </Card>

        {/* Summary */}
        <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
                <Text style={{color: 'gray'}}>Subtotal</Text>
                <Text style={{fontWeight: 'bold'}}>$4.99</Text>
            </View>
            <View style={styles.summaryRow}>
                <Text style={{color: 'gray'}}>Tax (5%)</Text>
                <Text style={{fontWeight: 'bold'}}>$0.25</Text>
            </View>
            <View style={[styles.summaryRow, {marginTop: 10, borderTopWidth: 1, borderColor: '#eee', paddingTop: 10}]}>
                <Text style={{fontSize: 16, fontWeight: 'bold'}}>Total</Text>
                <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1565C0'}}>$5.24</Text>
            </View>
        </View>

      </ScrollView>

      {/* Pay Button */}
      <View style={styles.footer}>
        <Button 
            mode="contained" 
            contentStyle={{ height: 50 }}
            style={{ borderRadius: 25, backgroundColor: '#1565C0' }}
            onPress={() => console.log('Process Payment')}
        >
            Confirm Payment
        </Button>
        <View style={{flexDirection: 'row', justifyContent: 'center', marginTop: 10, alignItems: 'center'}}>
            <Icon source="lock" size={14} color="gray" />
            <Text style={{color: 'gray', fontSize: 12, marginLeft: 5}}>Secured by SSLCommerz</Text>
        </View>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    height: 56,
    elevation: 2
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  
  balanceCard: {
    backgroundColor: '#1565C0',
    borderRadius: 16,
    marginBottom: 25,
    elevation: 4
  },
  badge: { backgroundColor: '#A5D6A7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  
  packagesGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  pkgCard: {
    width: '31%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 1
  },
  selectedPkg: {
    borderColor: '#1565C0',
    backgroundColor: '#E3F2FD',
    borderWidth: 2
  },
  popularTag: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#FFC107',
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  popularText: { fontSize: 8, fontWeight: 'bold', color: 'black' },
  coinsText: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 5 },
  priceText: { marginTop: 5, fontWeight: 'bold', color: '#4CAF50' },

  methodCard: { backgroundColor: 'white', borderRadius: 12, marginBottom: 25, padding: 5 },
  methodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 15 },

  summaryContainer: { marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },

  footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#eee' }
});
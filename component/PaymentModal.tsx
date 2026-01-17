import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Modal, Portal, Text, Button, Divider, RadioButton, Icon, IconButton } from 'react-native-paper';

type PaymentModalProps = {
  visible: boolean;
  amount: number; // Coins amount
  onClose: () => void;
  onSuccess: (tranId: string) => void;
  onFailed: () => void;
};

export default function PaymentModal({ visible, amount, onClose, onSuccess, onFailed }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [processing, setProcessing] = useState(false);

  // ডামি পেমেন্ট প্রসেসিং ফাংশন
  const handleConfirm = () => {
    setProcessing(true);
    
    // ২ সেকেন্ড পর পেমেন্ট সাকসেস হবে
    setTimeout(() => {
      setProcessing(false);
      const fakeTranId = `TRX-${Math.floor(Math.random() * 1000000)}`;
      onSuccess(fakeTranId);
    }, 2000);
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Secure Payment</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon source="close" size={24} color="#555" />
          </TouchableOpacity>
        </View>
        <Divider />

        <View style={styles.content}>
          {/* Summary Card */}
          <View style={styles.amountCard}>
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={styles.amountText}>{amount} Coins</Text>
          </View>

          {/* Payment Method Selection */}
          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          <View style={styles.methodContainer}>
             <RadioButton.Group onValueChange={setPaymentMethod} value={paymentMethod}>
                {/* Option 1: Main Wallet */}
                <TouchableOpacity style={[styles.methodRow, paymentMethod === 'wallet' && styles.activeMethod]} onPress={() => setPaymentMethod('wallet')}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <View style={[styles.iconBox, {backgroundColor: '#FFF8E1'}]}>
                            <Icon source="wallet" size={24} color="#FFD700" />
                        </View>
                        <View style={{marginLeft: 12}}>
                            <Text style={styles.methodTitle}>My Wallet</Text>
                            <Text style={styles.methodSub}>Use your existing coins</Text>
                        </View>
                    </View>
                    <RadioButton value="wallet" color="#2196F3" />
                </TouchableOpacity>

                {/* Option 2: Direct Card (Mock) */}
                <TouchableOpacity style={[styles.methodRow, paymentMethod === 'card' && styles.activeMethod]} onPress={() => setPaymentMethod('card')}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <View style={[styles.iconBox, {backgroundColor: '#E3F2FD'}]}>
                            <Icon source="credit-card" size={24} color="#1565C0" />
                        </View>
                        <View style={{marginLeft: 12}}>
                            <Text style={styles.methodTitle}>Direct Pay</Text>
                            <Text style={styles.methodSub}>Visa / MasterCard</Text>
                        </View>
                    </View>
                    <RadioButton value="card" color="#2196F3" />
                </TouchableOpacity>
             </RadioButton.Group>
          </View>

          {/* Security Note */}
          <View style={styles.securityNote}>
            <Icon source="shield-check" size={16} color="#4CAF50" />
            <Text style={styles.securityText}>100% Secure Transaction</Text>
          </View>

          {/* Action Buttons */}
          <Button 
            mode="contained" 
            onPress={handleConfirm} 
            loading={processing}
            disabled={processing}
            style={styles.payButton}
            contentStyle={{height: 48}}
            buttonColor="#2196F3"
          >
            Confirm Payment
          </Button>
          
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 20,
  },
  amountCard: {
    backgroundColor: '#F5F5F5',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  amountText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  methodContainer: {
    marginBottom: 20,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    marginBottom: 10,
  },
  activeMethod: {
    borderColor: '#2196F3',
    backgroundColor: '#F3F9FF',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  methodSub: {
    fontSize: 11,
    color: '#888',
  },
  securityNote: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 6,
  },
  securityText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  payButton: {
    borderRadius: 8,
  },
});
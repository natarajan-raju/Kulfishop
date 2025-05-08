import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, Modal, StyleSheet, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, addDoc, getDocs, serverTimestamp
} from 'firebase/firestore';
import { db } from '../database/firebase';
import dayjs from 'dayjs';
import * as Haptics from 'expo-haptics';
import { Picker } from '@react-native-picker/picker';



  


const ReminderScreen = () => {
    const [reminders, setReminders] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [newReminder, setNewReminder] = useState({
      title: '',
      amount: '',
      frequency: 'monthly',
      dueDate: ''
    });
  
    useEffect(() => {
      fetchReminders();
    }, []);
  
    const fetchReminders = async () => {
      const snap = await getDocs(collection(db, 'reminders'));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      setReminders(list);
    };
  
    const handleAddReminder = async () => {
      if (!newReminder.title || !newReminder.amount || !newReminder.dueDate) return;
      await addDoc(collection(db, 'reminders'), {
        ...newReminder,
        amount: parseFloat(newReminder.amount),
        createdAt: serverTimestamp(),
      });
      setNewReminder({ title: '', amount: '', frequency: 'monthly', dueDate: '' });
      setModalVisible(false);
      fetchReminders();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };
  
    const isDueToday = (dueDate) => {
      const today = dayjs().format('YYYY-MM-DD');
      return dayjs(dueDate).format('YYYY-MM-DD') === today;
    };

    const isOverdue = (dueDate) => {
        const today = dayjs().startOf('day');
        return dayjs(dueDate).isBefore(today, 'day');
      };
      
  
      return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Reminders</Text>

      <FlatList
        data={reminders}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => {
            const isDue = isDueToday(item.dueDate);
            const isOverdueReminder = isOverdue(item.dueDate);
            const backgroundColor = isOverdueReminder
            ? '#ffe6e6' // light red
            : index % 2 === 0
            ? '#fffaf0'
            : '#f0f4ff';
            const footerBg = isOverdueReminder ? 'red' : '#311847';

            
            return (
                <>
                <View style={[styles.card, { backgroundColor }, isDue && styles.dueCard]}>
                    {/* Decorative Background Circles */}
                    <View style={styles.topRightCircle} />
                    <View style={styles.bottomLeftCircle} />
                
                    {/* Top Row: Title + Calendar Icon */}
                    <View style={styles.topRow}>
                    <Ionicons name="calendar-outline" size={20} color="#311847" />
                    <Text style={styles.title}>{item.title}</Text>
                    </View>
                
                    {/* Middle Row: Amount & Frequency with Icons */}
                    <View style={styles.middleRow}>
                    <View style={styles.infoItem}>
                        <Ionicons name="cash-outline" size={18} color="#eb7100" />
                        <Text style={styles.infoText}>₹{item.amount}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Ionicons name="repeat-outline" size={18} color="#d90368" />
                        <Text style={styles.infoText}>{item.frequency}</Text>
                    </View>
                    </View>
                
                    {/* Action Buttons */}
                    <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="pencil" size={20} color="#fb8b24" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="trash" size={20} color="#d90368" />
                    </TouchableOpacity>
                    </View>                  
              </View>
              {/* Footer: Due Date */}
              <View style={[styles.footer, { backgroundColor: footerBg }]}>
                    <Text style={styles.footerText}>
                        Due: {dayjs(item.dueDate).format('DD MMM YYYY')}
                    </Text>
                </View>
              </>
              
            );
          }}
          
        ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 120 }}>
              <Image
                source={require('../assets/time.png')}
                style={{ width: 200, height: 200, resizeMode: 'contain' }}
              />
              <Text style={{ marginTop: 20, fontSize: 16, fontWeight: '600', color: '#eb7100' }}>
                This is your Due Reminder workspace
              </Text>
            </View>
          }
          
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add Reminder</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Reminder</Text>

            <TextInput
              placeholder="Title"
              value={newReminder.title}
              onChangeText={text => setNewReminder({ ...newReminder, title: text })}
              style={styles.modalInput}
            />
            <TextInput
              placeholder="Amount"
              keyboardType="numeric"
              value={newReminder.amount}
              onChangeText={text => setNewReminder({ ...newReminder, amount: text })}
              style={styles.modalInput}
            />
            <TextInput
              placeholder="Due Date (YYYY-MM-DD)"
              value={newReminder.dueDate}
              onChangeText={text => setNewReminder({ ...newReminder, dueDate: text })}
              style={styles.modalInput}
            />

            <Text style={{ marginBottom: 6, fontWeight: '600' }}>Frequency</Text>
            <View style={{
            borderWidth: 1, borderColor: '#ccc', borderRadius: 10, marginBottom: 12
            }}>
            <Picker
                selectedValue={newReminder.frequency}
                onValueChange={(itemValue) =>
                setNewReminder({ ...newReminder, frequency: itemValue })
                }>
                <Picker.Item label="Weekly" value="weekly" />
                <Picker.Item label="Monthly" value="monthly" />
                <Picker.Item label="Quarterly" value="quarterly" />
                <Picker.Item label="Half Yearly" value="halfyearly" />
                <Picker.Item label="Yearly" value="yearly" />
            </Picker>
            </View>


            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleAddReminder}
            >
              <Text style={styles.modalButtonText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: 'gray', marginTop: 10 }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ReminderScreen;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 16 },
    header: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, marginTop: 50 },
    card: {
        backgroundColor: '#f0f0f0',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        // marginBottom: 16,
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 14, // 🔥 prevent internal bottom padding
        overflow: 'hidden', // 🔥 ensures footer fits visually
        position: 'relative',
        flexDirection: 'column',
        elevation: 5,
      },
      
    dueCard: {
      borderColor: '#d90368',
      borderWidth: 2,
      backgroundColor: '#ffe5eb',
    },
    title: { fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    empty: { textAlign: 'center', color: '#999', marginTop: 30 },
    addButton: {
      flexDirection: 'row',
      backgroundColor: '#eb7100',
      padding: 14,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16,
    },
    addButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      marginLeft: 8,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalContent: {
      backgroundColor: '#fff',
      padding: 20,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    modalInput: {
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 10,
      padding: 10,
      marginBottom: 12,
    },
    modalButton: {
      backgroundColor: '#311847',
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    modalButtonText: { color: '#fff', fontWeight: 'bold' },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
      },
      
      iconButton: {
        marginLeft: 16,
      },
      
      topRightCircle: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 50,
        height: 50,
        backgroundColor: '#ffe6ef',
        borderBottomLeftRadius: 50,
        zIndex: 0,
      },
      
      bottomLeftCircle: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 50,
        height: 50,
        backgroundColor: '#e0f7ff',
        borderTopRightRadius: 50,
        zIndex: 0,
      },
      
      topRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginBottom: 8,
      },
      
      middleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 8,
      },
      
      infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      
      infoText: {
        marginLeft: 6,
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
      },
      
      footer: {
        backgroundColor: '#311847',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        marginBottom: 12,
      },
      
      
      footerText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13,
      },
      
      
      
  });
  
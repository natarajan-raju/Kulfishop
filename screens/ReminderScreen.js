import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../database/firebase'; // Adjust path to your `firebase.js` config
import { useFocusEffect } from '@react-navigation/native';
import  { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import * as Haptics from 'expo-haptics';
import { Picker } from '@react-native-picker/picker';


const ReminderScreen = () => {
  const [reminders, setReminders] = useState({paid: [], unpaid: []}); // Initial empty list
  const [modalVisible, setModalVisible] = useState(false);
  const [newBill, setNewBill] = useState({
    title: '',
    amount: '',
    dueDate: '',
    frequency: 'monthly',
  });
  const [markPaidModalVisible, setMarkPaidModalVisible] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [paidAmount, setPaidAmount] = useState('');
  const [paidDate, setPaidDate] = useState(dayjs().format('YYYY-MM-DD'));





  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Image source={require('../assets/time.png')} style={styles.emptyImage} />
      <Text style={styles.emptyText}>This is your Bill reminder workspace</Text>
    </View>
  );

  const isStillWithinPaidCycle = (dueDate, frequency) => {
    if (!dueDate || !frequency) return false;

    const lastDue = dayjs(dueDate);
    const today = dayjs();

    switch ((frequency || '').toLowerCase()) {
      case 'weekly':
        return today.isBefore(lastDue.add(1, 'week'));
      case 'bi-monthly':
        return today.isBefore(lastDue.add(2, 'month'));
      case 'monthly':
        return today.isBefore(lastDue.add(1, 'month'));
      case 'quarterly':
        return today.isBefore(lastDue.add(3, 'month'));
      case 'half-yearly':
        return today.isBefore(lastDue.add(6, 'month'));
      case 'yearly':
      case 'annually':
        return today.isBefore(lastDue.add(1, 'year'));
      default:
        return false;
    }
  };


  const getNextDueDate = (dueDate, frequency) => {
    const base = dayjs(dueDate); // Current due date

    switch ((frequency || '').toLowerCase()) {
      case 'weekly':
        return base.add(1, 'week').format('YYYY-MM-DD');
      case 'bi-monthly':
        return base.add(2, 'month').format('YYYY-MM-DD');
      case 'monthly':
        return base.add(1, 'month').format('YYYY-MM-DD');
      case 'quarterly':
        return base.add(3, 'month').format('YYYY-MM-DD');
      case 'half-yearly':
        return base.add(6, 'month').format('YYYY-MM-DD');
      case 'yearly':
      case 'annually':
        return base.add(1, 'year').format('YYYY-MM-DD');
      default:
        return base.add(1, 'month').format('YYYY-MM-DD'); // fallback
    }
  };
  const fetchReminders = async () => {
        try {
          const snap = await getDocs(collection(db, 'reminders'));
          const updates = [];
          const list = snap.docs.map(doc => {
            const data = doc.data();
            const id = doc.id;
            // console.log(data);
            // Check if paid and expired based on cycle
            if (
              data.status === 'paid' &&
              data.paidDate &&
              !isStillWithinPaidCycle(data.dueDate, data.frequency)
            ) {
              console.log(data);
              const nextDueDate = getNextDueDate(data.dueDate, data.frequency);
              // Schedule Firestore update
              updates.push(updateDoc(doc.ref, {
                status: 'unpaid',
                dueDate: nextDueDate
              }));

              // Update local state too
              return { ...data, id, status: 'unpaid', dueDate: nextDueDate };
            }

            return { ...data, id };
          });
          // Perform all DB updates
          await Promise.all(updates);
          list.sort((a,b) => a.dueDate.localeCompare(b.dueDate));
          const unpaid = list.filter(r => r.status === 'unpaid');
          const paid = list.filter(r => r.status === 'paid')          
          setReminders({paid, unpaid});
        } catch (err) {
          console.error('Failed to fetch reminders:', err);
        }
  };


  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'reminders', id));
      setReminders(prev => ({
        unpaid: prev.unpaid.filter(r => r.id !== id),
        paid: prev.paid.filter(r => r.id !== id)
      }));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Failed to delete reminder:', err);
    }
  };


  const renderItem = ({ item }) => {
    const today = dayjs();
    const due = dayjs(item.dueDate);
    const isDueToday = due.isSame(today, 'day');
    const isOverdue = due.isBefore(today, 'day');
    const footerBg =
      item.status === 'paid' ? '#311847' : (isDueToday || isOverdue ? '#d90368' : '#311847');


    return (
      <>
        <View style={[
          styles.billCard,
          item.status === 'unpaid' ? styles.unpaidCard : styles.paidCard
        ]}>
          <View style={styles.billContent}>
            <View>
              <Text style={styles.billTitle}>{item.title}</Text>
              <Text style={styles.billAmount}>₹{item.amount}</Text>
              {item.status === 'unpaid' && (
                <Text style={styles.dueStatusMessage}>
                  {(() => {
                    const today = dayjs();
                    const due = dayjs(item.dueDate);

                    if (due.isSame(today, 'day')) {
                      return 'Bill supposedly due today';
                    } else if (due.isSame(today.add(1, 'day'), 'day')) {
                      return 'Bill due tomorrow';
                    } else if (due.isAfter(today)) {
                      const daysLeft = due.diff(today, 'day');
                      return `Bill due in ${daysLeft} days`;
                    } else if(due.isBefore(today)) {
                      const daysOverdue = today.diff(due, 'day');
                      return `Bill overdue by ${daysOverdue} days`;
                    }

                  })()}
                </Text>
              )}

            </View>

            {item.status === 'paid' && item.paidAmount && item.paidDate && (
              <Text style={styles.paidLabel}>
                Paid ₹{item.paidAmount} on {dayjs(item.paidDate).format('DD MMM YYYY')}
              </Text>
            )}

            {item.status === 'paid' && item.paidAmount !== undefined && (
              (() => {
                const expected = parseFloat(item.amount);
                const actual = parseFloat(item.paidAmount);
                const difference = actual - expected;

                if (difference > 0) {
                  return (
                    <Text style={styles.paidOverrun}>
                      Overpaid by ₹{difference.toFixed(2)}
                    </Text>
                  );
                } else if (difference < 0) {
                  return (
                    <Text style={styles.paidSavings}>
                      Saved ₹{Math.abs(difference).toFixed(2)}
                    </Text>
                  );
                } else {
                  return null; // No difference
                }
              })()
            )}

            <View style={styles.statusRow}>
              <Text style={styles.statusText}>{item.status}</Text>
              <Ionicons
                name={item.status === 'unpaid' ? 'notifications-outline' : 'checkmark-done'}
                size={20}
                color={item.status === 'unpaid' ? '#d90368' : '#28a745'}
              />
            </View>
          </View>

          <View style={styles.dueRow}>
            <Text style={styles.dueText}>{due.format('DD')}</Text>
            <Text style={styles.dueTextSmall}>{due.format('ddd').toUpperCase()}</Text>
          </View> 

          <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ marginLeft: 12 }}>
            <Ionicons name="trash" size={20} color="#d90368" />
          </TouchableOpacity>   

          {item.status === 'unpaid' && (
            <TouchableOpacity
              onPress={() => {
                setSelectedReminder(item);
                setPaidAmount(item.amount.toString());
                setPaidDate(dayjs().format('YYYY-MM-DD'));
                setMarkPaidModalVisible(true);
              }}
              style={{ marginLeft: 12 }}
            >
              <Ionicons name="checkmark-done" size={20} color="#28a745" />
            </TouchableOpacity>
          )}

    
        </View>
        {/* 🔥 Footer */}
        <View style={[styles.footer, { backgroundColor: footerBg }]}>
          <Text style={styles.footerText}>
            {item.status === 'paid' ? '✔ Paid' : `Due Date: ${due.format('DD MMM YYYY')}`}
          </Text>

        </View>
      </>
    );
  };


  useFocusEffect(
    useCallback(() => {
      fetchReminders();
    }, [])
  );

  const combinedData = [
    ...(reminders.unpaid.length ? [{ type: 'header', title: 'Upcoming Bills' }, ...reminders.unpaid] : []),
    ...(reminders.paid.length ? [{ type: 'header', title: 'Paid Bills' }, ...reminders.paid] : []),
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.heading}>Bills Reminder</Text>

        

        <FlatList
          data={combinedData}
          keyExtractor={(item, index) => item.id || `header-${index}`}
          renderItem={({ item }) =>
            item.type === 'header' ? (
              <Text style={styles.sectionHeader}>{item.title}</Text>
            ) : (
              renderItem({ item })
            )
          }
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={combinedData.length === 0 && { flex: 1 }}
        />



        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true) }>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>

        {/* Add New Bill Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add New Bill</Text>

              <TextInput
                placeholder="Bill Name"
                style={styles.input}
                value={newBill.title}
                onChangeText={(text) => setNewBill({ ...newBill, title: text })}
              />

              <TextInput
                placeholder="Amount"
                style={styles.input}
                keyboardType="numeric"
                value={newBill.amount}
                onChangeText={(text) => setNewBill({ ...newBill, amount: text })}
              />

              <TextInput
                placeholder="Due Date (YYYY-MM-DD)"
                style={styles.input}
                value={newBill.dueDate}
                onChangeText={(text) => setNewBill({ ...newBill, dueDate: text })}
              />

              <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Frequency</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={newBill.frequency}
                  onValueChange={(value) =>
                    setNewBill({ ...newBill, frequency: value })
                  }
                  dropdownIconColor="#000"
                  mode="dropdown"
                >
                  <Picker.Item label="Weekly" value="weekly" />
                  <Picker.Item label="Bi-monthly" value="bi-monthly" />
                  <Picker.Item label="Monthly" value="monthly" />
                  <Picker.Item label="Quarterly" value="quarterly" />
                  <Picker.Item label="Half-Yearly" value="half-yearly" />
                  <Picker.Item label="Annually" value="yearly" />
                </Picker>
              </View>


              <TouchableOpacity
                style={styles.modalButton}
                onPress={async () => {
                  if (newBill.title && newBill.amount && newBill.dueDate) {
                    const docRef = await addDoc(collection(db, 'reminders'), {
                      ...newBill,
                      amount: parseFloat(newBill.amount),
                      status: 'unpaid',
                      createdAt: new Date()
                    });

                    setReminders(prev => ({
                      ...prev,
                      unpaid: [...prev.unpaid, { ...newBill, id: docRef.id, status: 'unpaid' }]
                    }));

                    setNewBill({ title: '', amount: '', dueDate: '', frequency: 'monthly' });
                    setModalVisible(false);
                    fetchReminders(); 
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                }}

              >
                <Text style={styles.modalButtonText}>Add Bill</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Mark as Paid Modal */}
        <Modal
          visible={markPaidModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setMarkPaidModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Mark as Paid</Text>

              <TextInput
                placeholder="Paid Amount"
                style={styles.input}
                keyboardType="numeric"
                value={paidAmount}
                onChangeText={setPaidAmount}
              />
              <TextInput
                placeholder="Paid Date (YYYY-MM-DD)"
                style={styles.input}
                value={paidDate}
                onChangeText={setPaidDate}
              />

              <TouchableOpacity
                style={styles.modalButton}
                onPress={async () => {
                  if (selectedReminder) {
                    await updateDoc(doc(db, 'reminders', selectedReminder.id), {
                      status: 'paid',
                      paidAmount: parseFloat(paidAmount),
                      paidDate,
                    });

                    setMarkPaidModalVisible(false);
                    setSelectedReminder(null);
                    setPaidAmount('');
                    fetchReminders(); // to refresh grouping
                  }
                }}
              >
                <Text style={styles.modalButtonText}>Save Payment</Text>
              </TouchableOpacity>


              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#ccc', marginTop: 10 }]}
                onPress={async () => {
                  setMarkPaidModalVisible(false);
                  setSelectedReminder(null);
                  setPaidAmount('');
                  setPaidDate(dayjs().format('YYYY-MM-DD'));
                  await fetchReminders();
                  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
              >
                <Text style={[styles.modalButtonText, { color: '#000' }]}>Cancel</Text>
              </TouchableOpacity>

            </View>
          </View>
        </Modal>
        
      </View>
    </SafeAreaView>
  );
};

export default ReminderScreen;

const styles = StyleSheet.create({
  safeArea: {
  flex: 1,
  backgroundColor: '#fff',
  },

  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#311847',
    textAlign: 'center',
    marginBottom: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#fb8b24',
    borderRadius: 30,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  emptyText: {
    color: '#fb8b24',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  billCard: {
  backgroundColor: '#fff',
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  padding: 16,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  elevation: 3,
  },
  unpaidCard: {
    backgroundColor: '#ffe5e5',
  },
  paidCard: {
    backgroundColor: '#d4f8e8',
  },
  billContent: {
    flex: 1,
  },
  billTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  billAmount: {
    fontSize: 14,
    color: '#444',
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  dueRow: {
    alignItems: 'center',
  },
  dueText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  dueTextSmall: {
    fontSize: 12,
    color: '#555',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  modalButton: {
    backgroundColor: '#311847',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  footer: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,    
    marginBottom: 12,
  },
  footerText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#311847',
    marginVertical: 12,
  },
  paidLabel: {
    marginTop: 6,
    fontSize: 12,
    color: '#28a745',
    fontWeight: '600',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  dueStatusMessage: {
    marginTop: 4,
    fontSize: 12,
    color: '#d90368',
    fontWeight: '600',
  },

  paidOverrun: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#d90368', // Red tint
  },

  paidSavings: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#28a745', // Green tint
  },



});

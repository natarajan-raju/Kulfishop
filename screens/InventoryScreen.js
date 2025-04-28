import React, { useContext, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InventoryContext } from '../context/InventoryContext';
import { CartContext } from '../context/Cart';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection
} from 'firebase/firestore';
import { readDocuments, updateDocument, db } from '../database/firebase';
import Toast from 'react-native-root-toast';
import KulfiCard from '../components/KulfiCard';
import { ActivityIndicator, Text } from 'react-native';
import * as Haptics from 'expo-haptics';




const InventoryScreen = () => {
  const { inventory, setInventory } = useContext(InventoryContext);
  const [loading, setLoading] = useState(true);
  const { carts, setCarts } = useContext(CartContext);
  const [cartStockValue, setCartStockValue] = useState(0);
  const [cartTotalQty, setCartTotalQty] = useState(0);
  const [totalOverallQty, setTotalOverallQty] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [stickInput, setStickInput] = useState('');
  const [plateInput, setPlateInput] = useState('');
  const [dayStarted, setDayStarted] = useState(false);
  const [dayClosed, setDayClosed] = useState(false);




  useFocusEffect(
    React.useCallback(() => {
      const fetchInventory = async () => {
        try {
          const docs = await readDocuments('warehouseInventory');
          const updated = {
            stick: { quantity: 0, costPrice: 0, sellingPrice: 0 },
            plate: { quantity: 0, costPrice: 0, sellingPrice: 0 },
          };
  
          docs.forEach(doc => {
            const key = doc.id.replace('Kulfi', '').toLowerCase();
            updated[key] = {
              quantity: doc.quantity || 0,
              costPrice: doc.costPrice || 0,
              sellingPrice: doc.sellingPrice || 0,
            };
          });
  
          setInventory(updated);
  
          const cartsData = await readDocuments('kulfiCarts');
          setCarts(cartsData);

          // const todayDate = new Date().toISOString().split('T')[0];
          // const summaries = await readDocuments('dailyStockSummary');
          // const todaySummary = summaries.find(doc => doc.date === todayDate);

          // if (todaySummary) {
          //   setDayStarted(true);
          //   setDayClosed(todaySummary.dayClosed ?? false);
          // } else {
          //   setDayStarted(false);
          //   setDayClosed(false);
          // }

          // Load Month Summary
          const today = new Date();
          const year = today.getFullYear().toString();
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const todayDate = today.toISOString().split('T')[0];
          const yearDocRef = doc(db, 'dailyStockSummary', year); 
          const monthsCollectionRef = collection(yearDocRef, 'months');
          const monthDocRef = doc(monthsCollectionRef, month);
          const monthSnap = await getDoc(monthDocRef);
  
          if (monthSnap.exists()) {
            const monthData = monthSnap.data();
  
            if (monthData.dailySummaries && monthData.dailySummaries[todayDate]) {
              const todaySummary = monthData.dailySummaries[todayDate];
              setDayStarted(true);
              setDayClosed(todaySummary.dayClosed ?? false);
            } else {
              setDayStarted(false);
              setDayClosed(false);
            }
          } else {
            setDayStarted(false);
            setDayClosed(false);
          }
          
          

          
          let cartStickQty = 0;
          let cartPlateQty = 0;

          cartsData.forEach(cart => {
            cartStickQty += cart.inventory?.stick || 0;
            cartPlateQty += cart.inventory?.plate || 0;
          });

          const cartStickValue = cartStickQty * updated.stick.costPrice;
          const cartPlateValue = cartPlateQty * updated.plate.costPrice;

          setCartTotalQty(cartStickQty + cartPlateQty);
          setCartStockValue(cartStickValue + cartPlateValue);

          const warehouseQty = updated.stick.quantity + updated.plate.quantity;
          setTotalOverallQty(warehouseQty + cartStickQty + cartPlateQty);

        } catch (error) {
          console.error('❌ Error loading inventory:', error);
        } finally {
          setLoading(false);
        }
      };
  
      fetchInventory();
    }, [])
  );
  
  const handleReplenishStock = async () => {
    const stickQty = parseInt(stickInput) || 0;
    const plateQty = parseInt(plateInput) || 0;
  
    if (stickQty === 0 && plateQty === 0) {
      Toast.show('Enter some quantity to replenish!', {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        backgroundColor: 'red',
      });
      return;
    }
  
    // Update local state
    setInventory(prev => ({
      ...prev,
      stick: {
        ...prev.stick,
        quantity: prev.stick.quantity + stickQty,
      },
      plate: {
        ...prev.plate,
        quantity: prev.plate.quantity + plateQty,
      },
    }));
  
    try {
      // 🔥 Update warehouseInventory stickKulfi
      await updateDocument('warehouseInventory', 'stickKulfi', {
        quantity: inventory.stick.quantity + stickQty,
      });
  
      // 🔥 Update warehouseInventory plateKulfi
      await updateDocument('warehouseInventory', 'plateKulfi', {
        quantity: inventory.plate.quantity + plateQty,
      });
  
      // 🚀 Update today's dailyStockSummary
      const today = new Date();
      const year = today.getFullYear().toString();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const todayDate = today.toISOString().split('T')[0];

      // Correct path
      const yearDocRef = doc(db, 'dailyStockSummary', year);
      const monthsCollectionRef = collection(yearDocRef, 'months');
      const monthDocRef = doc(monthsCollectionRef, month);
      const monthSnap = await getDoc(monthDocRef);

      if (monthSnap.exists()) {
        const monthData = monthSnap.data();
        
        if (monthData.dailySummaries && monthData.dailySummaries[todayDate]) {
          const todaySummary = monthData.dailySummaries[todayDate];

          await updateDoc(monthDocRef, {
            [`dailySummaries.${todayDate}.receivedStick`]: (todaySummary.receivedStick || 0) + stickQty,
            [`dailySummaries.${todayDate}.receivedPlate`]: (todaySummary.receivedPlate || 0) + plateQty,
          });
        }
      }

  
      Toast.show('Stock replenished successfully!', {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        backgroundColor: 'green',
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  
    } catch (error) {
      console.error('Error updating stock:', error);
      Toast.show('Failed to update stock!', {
        duration: Toast.durations.LONG,
        position: Toast.positions.BOTTOM,
        backgroundColor: 'red',
      });
    }
  
    // Clear and close modal
    setStickInput('');
    setPlateInput('');
    setModalVisible(false);
  };
  
  
  
  

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007aff" />
        <Text style={{ marginTop: 10, color: '#666' }}>Loading inventory...</Text>
      </View>
    );
  }
  

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#f9f9f9'}}>
      <View style={styles.container}>
        {/* Add your inventory cards here */}
        <View style={styles.stockRow}>
          <View style={[styles.stockCard, { backgroundColor: '#d90368' }]}>
            <Text style={styles.stockLabel}>Warehouse Inventory</Text>
            <Text style={styles.stockValue}>
              {inventory?.stick?.quantity + inventory?.plate?.quantity ?? 0} pcs
            </Text>
            <Text style={styles.stockValue}>
              ₹
              {(inventory?.stick?.quantity * inventory?.stick?.costPrice || 0) +
              (inventory?.plate?.quantity * inventory?.plate?.costPrice || 0)}
            </Text>
          </View>
          <View style={[styles.stockCard, { backgroundColor: '#fb8b24' }]}>
            <Text style={styles.stockLabel}>Carts Inventory</Text>
            <Text style={styles.stockValue}>{cartTotalQty} pcs</Text>
            <Text style={styles.stockValue}>₹{cartStockValue}</Text>
          </View>
        </View>


        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Stock Value</Text>
          <Text style={styles.totalValue}>
            ₹
            {(inventory?.stick?.quantity * inventory?.stick?.costPrice || 0) +
            (inventory?.plate?.quantity * inventory?.plate?.costPrice || 0) +
            cartStockValue}
          </Text>
          <Text style={styles.totalValue}>
            Total Quantity: {totalOverallQty} pcs
          </Text>
        </View>

        {inventory.stick && (
          <KulfiCard
            type="Stick"
            iconName="ice-pop"
            inventory={inventory.stick}
            setInventory={setInventory}
            documentId="stickKulfi"
          />
        )}
        {inventory.plate && (
          <KulfiCard
            type="Plate"
            iconName="food-fork-drink"
            inventory={inventory.plate}
            setInventory={setInventory}
            documentId="plateKulfi"
          />
        )}

        <TouchableOpacity
          style={[styles.replenishButton,
            (!dayStarted || dayClosed) && { backgroundColor: '#ccc' } // Gray if either condition fails
          ]}
          onPress={() => {
            if (dayStarted && !dayClosed) {
              setModalVisible(true);
            } else {
              Toast.show('Start the day first or Shop already closed!', {
                duration: Toast.durations.SHORT,
                position: Toast.positions.BOTTOM,
                backgroundColor: 'red',
              });
            }
          }}
          disabled={!dayStarted || dayClosed}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.replenishButtonText}>Replenish Stock</Text>
        </TouchableOpacity>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
          presentationStyle='overFullScreen'
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Replenish Stock</Text>

              <TextInput
                placeholder="Stick Kulfi Qty"
                keyboardType="numeric"
                value={stickInput}
                onChangeText={setStickInput}
                style={styles.modalInput}
              />
              <TextInput
                placeholder="Plate Kulfi Qty"
                keyboardType="numeric"
                value={plateInput}
                onChangeText={setPlateInput}
                style={styles.modalInput}
              />

              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleReplenishStock}
              >
                <Text style={styles.modalButtonText}>Submit</Text>
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


      </View>
    </SafeAreaView>
  );
  
};

export default InventoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 32,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  
  stockCard: {
    flex: 0.48,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  
  stockLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  
  stockValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  
  totalCard: {
    backgroundColor: '#311847',
    color: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    marginBottom: 20,
    alignItems: 'center',
  },
  
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  replenishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d90368',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    marginTop: 16,
  },
  replenishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButton: {
    backgroundColor: '#fb8b24',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  
});



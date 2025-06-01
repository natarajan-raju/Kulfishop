// screens/SplashScreen.js
import React, { useEffect, useContext } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { InventoryContext } from '../context/InventoryContext'; // Assuming this path
import { CartContext } from '../context/Cart'; // Assuming this path
import { doc, getDoc, collection } from 'firebase/firestore';
import { readDocuments, db } from '../database/firebase'; // Assuming this path
import * as Haptics from 'expo-haptics'; // If you want haptic feedback on load

const SplashScreen = ({ navigation }) => {
  const { setInventory } = useContext(InventoryContext);
  const { setCarts } = useContext(CartContext);

  useEffect(() => {
    const loadAppResources = async () => {
      try {
        // 1. Fetch Warehouse Inventory
        const docs = await readDocuments('warehouseInventory');
        const updatedInventory = {
          stick: { quantity: 0, costPrice: 0, sellingPrice: 0 },
          plate: { quantity: 0, costPrice: 0, sellingPrice: 0 },
        };

        docs.forEach(doc => {
          const key = doc.id.replace('Kulfi', '').toLowerCase();
          updatedInventory[key] = {
            quantity: doc.quantity || 0,
            costPrice: doc.costPrice || 0,
            sellingPrice: doc.sellingPrice || 0,
          };
        });
        setInventory(updatedInventory);

        // 2. Fetch Carts Data
        const cartsData = await readDocuments('kulfiCarts');
        setCarts(cartsData);

        // 3. Fetch Daily, Monthly, and Yearly Sales Summary
        const today = new Date();
        const year = today.getFullYear().toString();
        const month = String(today.getMonth() + 1).padStart(2, '0');

        const yearDocRef = doc(db, 'dailyStockSummary', year);
        const monthsCollectionRef = collection(yearDocRef, 'months');
        const monthDocRef = doc(monthsCollectionRef, month);

        // Fetch Year Summary
        const yearSnap = await getDoc(yearDocRef);
        let yearlySales = 0;
        if (yearSnap.exists()) {
          const yearData = yearSnap.data();
          const yearlySummary = yearData.yearlySummary || {};
          yearlySales = yearlySummary.totalSales || 0;
        }
        // You might want to store this in a context or state if other parts of the app need it
        // For now, we're just fetching it.

        // Fetch Month Summary
        const monthSnap = await getDoc(monthDocRef);
        let monthlySales = 0;
        let dayStarted = false;
        let dayClosed = false;
        if (monthSnap.exists()) {
          const monthData = monthSnap.data();
          monthlySales = monthData.monthlySummary.totalSales || 0;
          const todayDate = today.toISOString().split('T')[0];
          if (monthData.dailySummaries && monthData.dailySummaries[todayDate]) {
            const todaySummary = monthData.dailySummaries[todayDate];
            dayStarted = true;
            dayClosed = todaySummary.dayClosed ?? false;
          }
        }
        // Similarly, store monthlySales, dayStarted, dayClosed if needed globally.

        // 4. (Optional) Fetch Reminders - Placeholder
        // const remindersData = await readDocuments('remindersCollection');
        // setReminders(remindersData); // Assuming you'll have a RemindersContext

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Navigate to the main app tabs once all data is loaded
        navigation.replace('MainTabs'); // 'MainTabs' will be the name of your TabNavigator

      } catch (error) {
        console.error('Error loading app resources:', error);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        // You might want to show an error message to the user
        // and allow them to retry or exit the app.
      }
    };

    loadAppResources();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kulfi Inventory</Text>
      <ActivityIndicator size="large" color="#d90368" />
      <Text style={styles.loadingText}>Loading your stock...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#311847', // A dark background for splash
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#fff',
    fontSize: 16,
  },
});

export default SplashScreen;
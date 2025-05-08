import React, { useContext, useCallback, useState, useRef } from 'react';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection
} from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { InventoryContext } from '../context/InventoryContext';
import { CartContext } from '../context/Cart';
import { readDocuments, updateDocument, db } from '../database/firebase';
import { Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import {LottieView} from 'lottie-react-native';
import Toast from 'react-native-root-toast';
import { Feather } from '@expo/vector-icons';


const OperationsScreen = () => {
  const dashboardRef = useRef(); // 👈 ADD THIS at top inside component
  const [cartClosed, setCartClosed] = useState(false); // 👈 ADD state
  const [mode, setMode] = useState('dayIn'); // or 'dayOut'
  const { inventory, setInventory } = useContext(InventoryContext);
  const { carts, setCarts } = useContext(CartContext);
  const [dayStarted, setDayStarted] = useState(false);
  const [selectedCartId, setSelectedCartId] = useState('');
  const [stickQty, setStickQty] = useState('');
  const [plateQty, setPlateQty] = useState('');
  const [dayOutStep, setDayOutStep] = useState(1);
  const [dayOutData, setDayOutData] = useState({ keptStickQty: '', keptPlateQty: '' });
  const [salesSaved, setSalesSaved] = useState({ stick: false, plate: false, receipts: false, expenses: false });
  const [receiptsData, setReceiptsData] = useState({ cash: '', qr: '', credit: '', swiggy: '', zomato: '' });
  const [expensesData, setExpensesData] = useState({
    samples: '',
    wastage: '',
    credit: '',
    swiggy: '',
    zomato: '',
    municipality: '',
    bata: '',
    shortage: '',
    others: '',
  });
  const [denominationData, setDenominationData] = useState({
    500: '',
    200: '',
    100: '',
    50: '',
    20: '',
    10: '',
    coins: '',
  });
  
  const [originalBalanceShort, setOriginalBalanceShort] = useState(0);
  const [finalDashboardData, setFinalDashboardData] = useState(null);
  const [dayClosed, setDayClosed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [loading, setLoading] = useState(true);
  const [effectiveDate, setEffectiveDate] = useState(new Date());

  
  const getEffectiveDate = async () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed
  
    try {
      for (let m = currentMonth; m >= 0; m--) {
        const year = currentYear.toString();
        const month = String(m + 1).padStart(2, '0'); // convert to '01'...'12'
  
        const yearDocRef = doc(db, 'dailyStockSummary', year); 
        const monthsCollectionRef = collection(yearDocRef, 'months');
        const monthDocRef = doc(monthsCollectionRef, month);
        const monthSnap = await getDoc(monthDocRef);
  
        if (monthSnap.exists()) {
          const monthData = monthSnap.data();
          const summaries = monthData.dailySummaries || {};
  
          const unclosedDates = Object.keys(summaries)
            .filter(date => summaries[date]?.dayClosed === false)
            .sort();
  
          if (unclosedDates.length > 0) {
            return new Date(unclosedDates[0]); // ✅ found the date
          }
        }
      }
    } catch (err) {
      console.error('Error fetching effective date:', err);
    }
  
    return today; // fallback to today
  };
  
  
  
  
  useFocusEffect(
    useCallback(() => {
      const loadEffectiveDate = async () => {
        const date = await getEffectiveDate();
        setEffectiveDate(date);
        
      };
      const initializeOperationsScreen = async () => {
        try {
          setLoading(true);
  
          // Load Carts
          const cartData = await readDocuments('kulfiCarts');
          setCarts(cartData);
  
          // Load Inventory
          const warehouseInventory = await readDocuments('warehouseInventory');
          const updatedInventory = {
            stick: { quantity: 0 },
            plate: { quantity: 0 },
          };
          warehouseInventory.forEach(doc => {
            const type = doc.id.replace('Kulfi', '').toLowerCase();
            updatedInventory[type] = {
              quantity: doc.quantity || 0,
              costPrice: doc.costPrice || 0,
              sellingPrice: doc.sellingPrice || 0,
            };
          });
          setInventory(updatedInventory);
  
          // Load Effective Date using the refactored async function
          const today = await getEffectiveDate(); // Now using async getEffectiveDate function
          const year = today.getFullYear().toString();
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const todayDate = today.toISOString().split('T')[0];
  
          const yearDocRef = doc(db, 'dailyStockSummary', year);
          const monthsCollectionRef = collection(yearDocRef, 'months');
          const monthDocRef = doc(monthsCollectionRef, month);
          const monthSnap = await getDoc(monthDocRef);
  
          if (monthSnap.exists()) {
            const monthData = monthSnap.data();
            const summaries = monthData.dailySummaries || {};
            const todaySummary = summaries[todayDate];
            // Find first unclosed day in this month
            const unclosedDates = Object.keys(summaries)
              .filter(date => summaries[date]?.dayClosed === false)
              .sort(); // sort ascending
  
            if (unclosedDates.length > 0) {
              const workingDate = unclosedDates[0];
              const workingSummary = summaries[workingDate];
              setDayStarted(true);
              // console.log(workingSummary);
              setDayClosed(false);
            } else if(todaySummary){
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
  
        } catch (err) {
          console.error('❌ Error initializing OperationsScreen:', err);
        } finally {
          setLoading(false);
        }
      };
      loadEffectiveDate();
      initializeOperationsScreen();
    }, [])
  );
  
  const parseOrZero = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };
  
  const handleSubmit = async () => {
    const stick = parseInt(stickQty, 10) || 0;
    const plate = parseInt(plateQty, 10) || 0;

    if (!selectedCartId || (stick === 0 && plate === 0)) {
      Alert.alert('Error', 'Please select a cart and enter quantities.');
      return;
    }

    if (stick > inventory.stick.quantity || plate > inventory.plate.quantity) {
      Alert.alert('Error', 'Not enough stock in warehouse.');
      return;
    }

    const cart = carts.find(c => c.id === selectedCartId);
    if (!cart) return;

    const updatedCart = {
      ...cart,
      inventory: {
        stick: (cart.inventory?.stick || 0) + stick,
        plate: (cart.inventory?.plate || 0) + plate,
      },
      status: 'open',
      openedAt: new Date().toISOString(),
    };

    const updatedStick = {
      quantity: inventory.stick.quantity - stick,
      costPrice: inventory.stick.costPrice,
      sellingPrice: inventory.stick.sellingPrice,
    };
    const updatedPlate = {
      quantity: inventory.plate.quantity - plate,
      costPrice: inventory.plate.costPrice,
      sellingPrice: inventory.plate.sellingPrice,
    };

    try {
      await Promise.all([
        updateDocument('kulfiCarts', cart.id, updatedCart),
        updateDocument('warehouseInventory', 'stickKulfi', updatedStick),
        updateDocument('warehouseInventory', 'plateKulfi', updatedPlate),
      ]);

      setInventory(prev => ({
        ...prev,
        stick: updatedStick,
        plate: updatedPlate,
      }));
      setCarts(prev => prev.map(c => (c.id === cart.id ? updatedCart : c)));
      setStickQty('');
      setPlateQty('');
      setSelectedCartId('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Inventory moved to cart.');
    } catch (error) {
      Alert.alert('Error', 'Failed to update inventory.');
    }
  };

  const hasOpenCarts = carts.some(c => c.status === 'open');


  const backgroundColor = mode === 'dayOut' ? '#311847' : '#fff';
  const textColor = mode === 'dayOut' ? '#fff' : '#000';
  const inputBgColor = mode === 'dayOut' ? 'transparent' : '#fff';

  const labelTextColor = (label) => {
    
    return mode === 'dayOut' ? '#fff' : '#000'; // Others depend on mode
  };

  const stickSoldQty = () => Math.max(
    (carts.find(c => c.id === selectedCartId)?.inventory?.stick || 0) -
    (parseInt(dayOutData.keptStickQty || '0', 10)),
    0
  );
  
  const stickSalesValue = () => (
    stickSoldQty() * (inventory.stick?.sellingPrice || 0)
  ).toFixed(2);
  
  const plateSoldQty = () => Math.max(
    (carts.find(c => c.id === selectedCartId)?.inventory?.plate || 0) -
    (parseInt(dayOutData.keptPlateQty || '0', 10)),
    0
  );
  
  const plateSalesValue = () => (
    plateSoldQty() * (inventory.plate?.sellingPrice || 0)
  ).toFixed(2);

  const isNextEnabled = () => {
    if (dayOutStep === 1) {
      return dayOutData.keptStickQty !== '' && !isNaN(parseInt(dayOutData.keptStickQty));
    }
    if (dayOutStep === 2) {
      return dayOutData.keptPlateQty !== '' && !isNaN(parseInt(dayOutData.keptPlateQty));
    }
    if (dayOutStep === 3) {
      return receiptsData.cash !== '' && receiptsData.qr !== '';
    }
    if (dayOutStep === 4) {
      // In Stage 4 (Expenses), we'll allow Next always, or you can add checks if needed later.
      return parseFloat(updatedBalanceShort()) === 0;
    }
    return false;
  };
  
  
  const handleNext = () => {
    if (dayOutStep === 1) {
      setSalesSaved(prev => ({ ...prev, stick: true }));
      setDayOutStep(2);
    } else if (dayOutStep === 2) {
      setSalesSaved(prev => ({ ...prev, plate: true }));
      setDayOutStep(3);
    } else if (dayOutStep === 3) {
      setSalesSaved(prev => ({ ...prev, receipts: true }));
      setOriginalBalanceShort(parseFloat(balanceShort()));
      if(parseFloat(balanceShort() === 0)) {
        setExpensesData({
          samples: '',
          wastage: '',
          credit: '',
          swiggy: '',
          zomato: '',
          municipality: '',
          bata: '',
          shortage: '',
          others: '',
        });
        setSalesSaved(prev => ({ ...prev, expenses: false }));  // ✅ ADD THIS LINE
      }
      setDayOutStep(4);
    } else if (dayOutStep === 4) {
      const hasExpenses = parseFloat(balanceShort()) > 0;
    
      setSalesSaved(prev => ({ ...prev, expenses: hasExpenses }));
    
      if (!hasExpenses) {
        setExpensesData({
          samples: '',
          wastage: '',
          credit: '',
          swiggy: '',
          zomato: '',
          municipality: '',
          bata: '',
          shortage: '',
          others: '',
        });
      }
      setDayOutStep(5);
      
    }
    
     else if (dayOutStep === 5) {
      Alert.alert('Success', 'Day Out Finalized Successfully!');
    }
  };
  
  
  
  

  const handlePrevious = () => {
    if (dayOutStep > 1) {
      setDayOutStep(dayOutStep - 1);
    }
  };

  const handleClearDayOut = () => {
    setSelectedCartId('');
    setDayOutData({ keptStickQty: '', keptPlateQty: '' });
    setReceiptsData({ cash: '', qr: '', credit: '', swiggy: '', zomato: '' });
    setExpensesData({
          samples: '',
          wastage: '',
          credit: '',
          swiggy: '',
          zomato: '',
          municipality: '',
          bata: '',
          shortage: '',
          others: '',
    });
    setSalesSaved({ stick: false, plate: false, receipts: false, expenses: false });
    setDenominationData({
          500: '',
          200: '',
          100: '',
          50: '',
          20: '',
          10: '',
          coins: '',
        });
    setFinalDashboardData(null);
    setDayOutStep(1);
  };

  const totalReceived = () => 
    (parseFloat(receiptsData.cash || '0') + parseFloat(receiptsData.qr || '0')).toFixed(2);
  
  const grossSalesValue = () =>
    (parseFloat(stickSalesValue()) + parseFloat(plateSalesValue())).toFixed(2);
  
  const balanceShort = () =>
    Math.max(parseFloat(grossSalesValue()) - parseFloat(totalReceived()), 0).toFixed(2);
  
  const expensesTotal = () => (
    ['samples', 'wastage', 'credit', 'swiggy', 'zomato']
      .reduce((sum, key) => sum + parseFloat(expensesData[key] || '0'), 0)
  ).toFixed(2);
  
  const dailyExpensesTotal = () => (
    ['municipality', 'bata', 'shortage', 'others']
      .reduce((sum, key) => sum + parseFloat(expensesData[key] || '0'), 0)
  ).toFixed(2);
  
  const tallyTotal = () => (
    (parseFloat(expensesTotal()) + parseFloat(dailyExpensesTotal())).toFixed(2)
  );
  
  const updatedBalanceShort = () => (
    (parseFloat(balanceShort()) - parseFloat(tallyTotal())).toFixed(2)
  );

  const receivablesTotal = () => (
    ['credit', 'swiggy', 'zomato']
      .reduce((sum, key) => sum + parseFloat(expensesData[key] || '0'), 0)
  ).toFixed(2);
  
  const actualExpensesTotal = () => (
    ['samples', 'wastage', 'municipality', 'bata', 'shortage', 'others']
      .reduce((sum, key) => sum + parseFloat(expensesData[key] || '0'), 0)
  ).toFixed(2);

  const netSalesValue = () => (
    (parseFloat(grossSalesValue()) -
    parseFloat(receivablesTotal()) -
    parseFloat(actualExpensesTotal()))
  ).toFixed(2);
  
  
  const denominationTotal = () => (
    (parseInt(denominationData['500'] || 0) * 500) +
    (parseInt(denominationData['200'] || 0) * 200) +
    (parseInt(denominationData['100'] || 0) * 100) +
    (parseInt(denominationData['50'] || 0) * 50) +
    (parseInt(denominationData['20'] || 0) * 20) +
    (parseInt(denominationData['10'] || 0) * 10) +
    (parseInt(denominationData['coins'] || 0))
  ).toFixed(2);
  
  const handleCloseCart = async () => {
    try {
      const cart = carts.find(c => c.id === selectedCartId);
      if (!cart) return;
      setFinalDashboardData({
        selectedCart: cart,
        stickSoldQty: stickSoldQty(),
        stickSalesValue: stickSalesValue(),
        plateSoldQty: plateSoldQty(),
        plateSalesValue: plateSalesValue(),
        cashCollected: receiptsData.cash,
        qrCollected: receiptsData.qr,
        receivables: {
          credit: expensesData.credit,
          swiggy: expensesData.swiggy,
          zomato: expensesData.zomato,
        },
        expenses: {
          samples: expensesData.samples,
          wastage: expensesData.wastage,
          municipality: expensesData.municipality,
          bata: expensesData.bata,
          shortage: expensesData.shortage,
          others: expensesData.others,
        },
        grossSales: grossSalesValue(),
        netSales: netSalesValue(),
      });
      
  
      const updatedCart = {
        ...cart,
        status: 'closed',
        inventory: {
          stick: 0,
          plate: 0,
        },
        closedAt: cart.openedAt,
      };
  
      const keptStickQty = parseInt(dayOutData.keptStickQty || '0', 10);
      const keptPlateQty = parseInt(dayOutData.keptPlateQty || '0', 10);
  
      const updatedWarehouseStick = {
        quantity: inventory.stick.quantity + keptStickQty,
        costPrice: inventory.stick.costPrice,
        sellingPrice: inventory.stick.sellingPrice,
      };
  
      const updatedWarehousePlate = {
        quantity: inventory.plate.quantity + keptPlateQty,
        costPrice: inventory.plate.costPrice,
        sellingPrice: inventory.plate.sellingPrice,
      };
  
      await Promise.all([
        updateDocument('kulfiCarts', cart.id, updatedCart),
        updateDocument('warehouseInventory', 'stickKulfi', updatedWarehouseStick),
        updateDocument('warehouseInventory', 'plateKulfi', updatedWarehousePlate),
      ]);
  
      setCarts(prev => prev.map(c => (c.id === cart.id ? updatedCart : c)));
      setInventory(prev => ({
        ...prev,
        stick: updatedWarehouseStick,
        plate: updatedWarehousePlate,
      }));      
      setCartClosed(true); // ✅ Update state to show only dashboard now

      // 🔥 Update today's dailyStockSummary with cart sales
      try {
        const today = new Date(cart.openedAt);
        const year = today.getFullYear().toString();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const todayDate = today.toISOString().split('T')[0];
      
        const monthDocRef = doc(db, 'dailyStockSummary', year, 'months', month);
        const monthSnap = await getDoc(monthDocRef);
      
        if (monthSnap.exists()) {
          const monthData = monthSnap.data();
          const todaySummary = monthData.dailySummaries?.[todayDate];
          // let currentMonthlySummary = {
          //   stickSold: 0,
          //   plateSold: 0,
          //   receipts: { cash: 0, qr: 0 },
          //   receivables: { credit: 0, swiggy: 0, zomato: 0 },
          //   expenses: {
          //     samples: 0,
          //     wastage: 0,
          //     other: 0,
          //     municipality: 0,
          //     bata: 0,
          //     shortage: 0,
          //   }
          // };

          // if (monthData.monthlySummary) {
          //   currentMonthlySummary = monthData.monthlySummary;
          // } else {
          //   // 🧮 Calculate from dailySummaries if monthlySummary is missing
          //   const summaries = monthData.dailySummaries || {};
          //   for (const summary of Object.values(summaries)) {
          //     currentMonthlySummary.stickSold += summary.stickSold || 0;
          //     currentMonthlySummary.plateSold += summary.plateSold || 0;
          
          //     currentMonthlySummary.receipts.cash += summary.receipts?.cash || 0;
          //     currentMonthlySummary.receipts.qr += summary.receipts?.qr || 0;
          
          //     currentMonthlySummary.receivables.credit += summary.receivables?.credit || 0;
          //     currentMonthlySummary.receivables.swiggy += summary.receivables?.swiggy || 0;
          //     currentMonthlySummary.receivables.zomato += summary.receivables?.zomato || 0;
          
          //     currentMonthlySummary.expenses.samples += summary.expenses?.samples || 0;
          //     currentMonthlySummary.expenses.wastage += summary.expenses?.wastage || 0;
          //     currentMonthlySummary.expenses.other += summary.expenses?.other || 0;
          //     currentMonthlySummary.expenses.municipality += summary.expenses?.municipality || 0;
          //     currentMonthlySummary.expenses.bata += summary.expenses?.bata || 0;
          //     currentMonthlySummary.expenses.shortage += summary.expenses?.shortage || 0;
          //   }
          // }

          if (todaySummary) {
            const updatedStickSold = (todaySummary.stickSold || 0) + stickSoldQty();
            const updatedPlateSold = (todaySummary.plateSold || 0) + plateSoldQty();
      
            await updateDoc(monthDocRef, {
              [`dailySummaries.${todayDate}.stickSold`]: updatedStickSold,
              [`dailySummaries.${todayDate}.plateSold`]: updatedPlateSold,
            });

            // // 🧮 Update monthly summary stick/plate sold
            // await updateDoc(monthDocRef, {
            //   [`monthlySummary.stickSold`]: (monthData.monthlySummary?.stickSold || 0) + updatedStickSold,
            //   [`monthlySummary.plateSold`]: (monthData.monthlySummary?.plateSold || 0) + updatedPlateSold,
            // });

            let { cash, qr } = receiptsData || {};
            cash = parseOrZero(cash);
            qr = parseOrZero(qr);
            let {
              credit,
              swiggy,
              zomato,
              samples,
              wastage,
              other,
              municipality,
              bata,
              shortage
            } = expensesData || {};
            
            credit = parseOrZero(credit);
            swiggy = parseOrZero(swiggy);
            zomato = parseOrZero(zomato);
            samples = parseOrZero(samples);
            wastage = parseOrZero(wastage);
            other = parseOrZero(other);
            municipality = parseOrZero(municipality);
            bata = parseOrZero(bata);
            shortage = parseOrZero(shortage);
            
          
            const updatedReceipts = {
              [`dailySummaries.${todayDate}.receipts.cash`]: (parseFloat(todaySummary?.receipts?.cash) || 0) + parseFloat(cash),
              [`dailySummaries.${todayDate}.receipts.qr`]: (parseFloat(todaySummary?.receipts?.qr) || 0) + parseFloat(qr),
            };

            const updatedReceivables = {
              [`dailySummaries.${todayDate}.receivables.credit`]: (parseFloat(todaySummary?.receivables?.credit) || 0) + parseFloat(credit),
              [`dailySummaries.${todayDate}.receivables.swiggy`]: (parseFloat(todaySummary?.receivables?.swiggy) || 0) + parseFloat(swiggy),
              [`dailySummaries.${todayDate}.receivables.zomato`]: (parseFloat(todaySummary?.receivables?.zomato) || 0) + parseFloat(zomato),
            };
            
            const updatedExpenses = {
              [`dailySummaries.${todayDate}.expenses.samples`]: (parseFloat(todaySummary?.expenses?.samples) || 0) + parseFloat(samples),
              [`dailySummaries.${todayDate}.expenses.wastage`]: (parseFloat(todaySummary?.expenses?.wastage) || 0) + parseFloat(wastage),
              [`dailySummaries.${todayDate}.expenses.other`]: (parseFloat(todaySummary?.expenses?.other) || 0) + parseFloat(other),
              [`dailySummaries.${todayDate}.expenses.municipality`]: (parseFloat(todaySummary?.expenses?.municipality) || 0) + parseFloat(municipality),
              [`dailySummaries.${todayDate}.expenses.bata`]: (parseFloat(todaySummary?.expenses?.bata) || 0) + parseFloat(bata),
              [`dailySummaries.${todayDate}.expenses.shortage`]: (parseFloat(todaySummary?.expenses?.shortage) || 0) + parseFloat(shortage),
            };
          
            await updateDoc(monthDocRef, {
              ...updatedReceipts,
              ...updatedReceivables,
              ...updatedExpenses,
            
              // [`monthlySummary.receipts.cash`]: currentMonthlySummary.receipts.cash + parseFloat(cash),
              // [`monthlySummary.receipts.qr`]: currentMonthlySummary.receipts.qr + parseFloat(qr),
            
              // [`monthlySummary.receivables.credit`]: currentMonthlySummary.receivables.credit + parseFloat(credit),
              // [`monthlySummary.receivables.swiggy`]: currentMonthlySummary.receivables.swiggy + parseFloat(swiggy),
              // [`monthlySummary.receivables.zomato`]: currentMonthlySummary.receivables.zomato + parseFloat(zomato),
            
              // [`monthlySummary.expenses.samples`]: currentMonthlySummary.expenses.samples + parseFloat(samples),
              // [`monthlySummary.expenses.wastage`]: currentMonthlySummary.expenses.wastage + parseFloat(wastage),
              // [`monthlySummary.expenses.other`]: currentMonthlySummary.expenses.other + parseFloat(other),
              // [`monthlySummary.expenses.municipality`]: currentMonthlySummary.expenses.municipality + parseFloat(municipality),
              // [`monthlySummary.expenses.bata`]: currentMonthlySummary.expenses.bata + parseFloat(bata),
              // [`monthlySummary.expenses.shortage`]: currentMonthlySummary.expenses.shortage + parseFloat(shortage),
            });
            
          
          } else {
            console.error('❌ No todaySummary found to update');
          }
        } else {
          console.error('❌ No month document found to update');
        }
      } catch (error) {
        console.error('❌ Error updating dailyStockSummary with cart sales:', error);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowConfetti(true);
      // Hide confetti after 3 seconds
      setTimeout(() => setShowConfetti(false), 3000);  
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to close cart.');
    }
  };

  const isCashTallied = () => {
    return parseFloat(denominationTotal()) === parseFloat(receiptsData.cash || '0');
  };

  const handleShareDashboard = async () => {
    try {
      const uri = await captureRef(dashboardRef, {
        format: 'png',
        quality: 0.8,
      });
  
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Error', 'Sharing is not available on this device.');
        return;
      }
  
      await Sharing.shareAsync(uri);
  
      // 🎉 Show a Toast or Alert after sharing
      Toast.show('🎉 Dashboard Shared Successfully!', {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
      });
      
  
    } catch (error) {
      console.error('Share failed', error);
      Alert.alert('Error', 'Failed to share dashboard.');
    }
  };
  
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');   // two digits
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Jan = 0
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };
  
   
  const handleStartDay = async () => {
    try {
      const today = new Date();
      const year = today.getFullYear().toString();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const todayDate = today.toISOString().split('T')[0];
  
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayYear = yesterday.getFullYear().toString();
      const yesterdayMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
      const yesterdayDate = yesterday.toISOString().split('T')[0];
  
      // Get yesterday's month document
      const yesterdayMonthDocRef = doc(db, 'dailyStockSummary', yesterdayYear, 'months', yesterdayMonth);
      const yesterdayMonthSnap = await getDoc(yesterdayMonthDocRef);
  
      if (yesterdayMonthSnap.exists()) {
        const yesterdayMonthData = yesterdayMonthSnap.data();
        const yesterdaySummary = yesterdayMonthData.dailySummaries?.[yesterdayDate];
  
        if (yesterdaySummary && !yesterdaySummary.dayClosed) {
          Alert.alert('Hold on!', 'Please close yesterday\'s day first before starting a new day.');
          return;
        }
      }
  
      // Now Start today's day
      const monthDocRef = doc(db, 'dailyStockSummary', year, 'months', month);
      const monthSnap = await getDoc(monthDocRef);
  
      if (!monthSnap.exists()) {
        await setDoc(monthDocRef, { dailySummaries: {} });
      }
  
      await updateDoc(monthDocRef, {
        [`dailySummaries.${todayDate}`]: {
          date: todayDate,
          openingStock: {
            stick: inventory.stick,
            plate: inventory.plate,
          },
          closingStock: null,
          stickSold: 0,
          plateSold: 0,
          dayStarted: true,
          dayClosed: false,
          remarks: '',
        }
      });
  
      setDayStarted(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Success', 'Day started and Opening Stock saved!');
    } catch (error) {
      console.error('❌ Start Day Error:', error);
      Alert.alert('Error', 'Failed to start the day.');
    }
  };
  
  
  const handleCloseDay = async () => {
    try {
      const today = effectiveDate;
      const year = today.getFullYear().toString();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const todayDate = today.toISOString().split('T')[0];
  
      const monthDocRef = doc(db, 'dailyStockSummary', year, 'months', month);
      const monthSnap = await getDoc(monthDocRef);
  
      if (!monthSnap.exists()) {
        Alert.alert('Error', 'No day started for today.');
        return;
      }
  
      const monthData = monthSnap.data();
      const todaySummary = monthData.dailySummaries?.[todayDate];
  
      if (!todaySummary) {
        Alert.alert('Error', 'No opening stock found for today.');
        return;
      }
  
      // Check all carts are closed
      const openCarts = carts.filter(c => c.status === 'open');
      if (openCarts.length > 0) {
        Alert.alert('Hold up', 'Please close all carts before ending the day!');
        return;
      }
  
      // Fix closing timestamp based on openEntry date (not today's date after 12AM)
      const closingTime = new Date(`${todaySummary.date}T23:59:00.000Z`).toISOString();
  
      await updateDoc(monthDocRef, {
        [`dailySummaries.${todayDate}.closingStock`]: {
          stick: inventory.stick,
          plate: inventory.plate,
        },
        [`dailySummaries.${todayDate}.dayClosed`]: true,
        [`dailySummaries.${todayDate}.remarks`]: 'Day closed successfully',
      });
  
      // Also update carts closedAt
      await Promise.all(carts.map(cart => {
        return updateDocument('kulfiCarts', cart.id, {
          ...cart,
          closedAt: closingTime,
        });
      }));
  
      setDayClosed(true);       
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Success', 'Day closed and closing stock saved!');
    } catch (error) {
      console.error('❌ Close Day Error:', error);
      Alert.alert('Error', 'Failed to close the day.');
    }
  };
  
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#eb7100" />
      </View>
    );
  }
  
  
  
  

  return (
    <SafeAreaView style={{flex: 1, backgroundColor}}>
    <ScrollView style={[styles.container, { backgroundColor }]}
    contentContainerStyle={{ flexGrow: 1, paddingBottom: 100}}>

       {!__DEV__ &&showConfetti && (
          <LottieView
            source={require('../assets/confetti.json')} // 🎉 your lottie confetti file
            autoPlay
            loop={false}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              zIndex: 100,
            }}
          />
        )}

      {/* Toggle */}
      <View style={styles.toggleWrapper}>
        <TouchableOpacity
          style={[styles.toggleOption, mode === 'dayIn' && styles.toggleSelected]}
          onPress={() => setMode('dayIn')}
        >
          <Text style={mode === 'dayIn' ? styles.toggleSelectedText : styles.toggleText}>
            Day In
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleOption,
            mode === 'dayOut' && styles.toggleSelected,
            (!dayStarted || dayClosed) && { opacity: 0.4 } // grayed out
          ]}
          onPress={() => {
            if (dayStarted && !dayClosed) setMode('dayOut');
          }}
          disabled={!dayStarted || dayClosed} // 🚫 disable if not started
        >
          <Text style={mode === 'dayOut' ? styles.toggleSelectedText : styles.toggleText}>
            Day Out
          </Text>
        </TouchableOpacity>

      </View>

      {/* Day In Mode */}
      {mode === 'dayIn' && (
        <>
          {dayClosed ? (
              // ✅ DAY CLOSED
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Image
                source={require('../assets/undraw_beer_ay8u.png')}
                style={{ width: '90%', height: 300, resizeMode: 'contain' }}
              />
              <Text style={{
                marginTop: 20,
                fontSize: 18,
                fontWeight: '700',
                color: '#eb7100',
                textAlign: 'center'
              }}>
                Business closed for today.  
                {"\n"}
                Have rest and come back tomorrow! 🍻
              </Text>
            </View>
          ) : (
            !dayStarted ? (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text style={styles.currentDay}>
                📅 {effectiveDate.toLocaleDateString('en-GB', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Image
                  source={require('../assets/undraw_ice-cream_mhwt.png')}
                  style={{ width: '90%', height: 300, resizeMode: 'contain' }}
                />
                <TouchableOpacity
                  style={[styles.submitButton, {
                    backgroundColor: '#311847',
                    width: '95%',
                    paddingHorizontal: 24,
                    marginTop: 20
                  }]}
                  onPress={handleStartDay}
                >
                  <Text style={styles.submitText}>Start the Day</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.currentDay}>
                📅 {effectiveDate.toLocaleDateString('en-GB', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
  
                <View style={styles.warehouseCard}>
                  {/* Background circles */}
                  <View style={styles.topRightCircle} />
                  <View style={styles.bottomLeftCircle} />

                  <Text style={styles.warehouseTitle}>Available in Warehouse</Text>

                  <View style={styles.circleRow}>
                    <View style={[styles.circle, { borderColor: '#eb7100' }]}>
                      <Text style={styles.circleQty}>{inventory?.stick?.quantity ?? 0}</Text>
                    </View>
                    <View style={[styles.circle, { borderColor: '#d90368' }]}>
                      <Text style={styles.circleQty}>{inventory?.plate?.quantity ?? 0}</Text>
                    </View>
                  </View>

                  <View style={styles.labelRow}>
                    <Text style={[styles.circleLabel, { color: '#eb7100' }]}>Stick</Text>
                    <Text style={[styles.circleLabel, { color: '#d90368' }]}>Plate</Text>
                  </View>
                </View>

    
                
                
               
                    <View style={styles.form}>
                      <Text style={[styles.label, { color: labelTextColor('Select Cart') }]}>Select Cart</Text>
                      <View style={styles.pickerWrapper}>
                        <Picker
                          selectedValue={selectedCartId}
                          onValueChange={setSelectedCartId}
                          mode="dropdown"
                          dropdownIconColor={textColor}
                        >
                          <Picker.Item key="default" label="Select a cart" value="" />
                          {carts
                            .map(cart => (
                              <Picker.Item
                                key={cart.id}
                                label={`${cart.address} (ID: ${cart.id})`}
                                value={cart.id}
                              />
                          ))}
                        </Picker>
                      </View>

                      <Text style={[styles.label, { color: labelTextColor('Stick Kulfi Qty') }]}>Stick Kulfi Qty</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: inputBgColor, color: textColor }]}
                        keyboardType="number-pad"
                        value={stickQty}
                        onChangeText={setStickQty}
                        placeholder="0"
                        placeholderTextColor="#aaa"
                      />

                      <Text style={[styles.label, { color: labelTextColor('Plate Kulfi Qty') }]}>Plate Kulfi Qty</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: inputBgColor, color: textColor }]}
                        keyboardType="number-pad"
                        value={plateQty}
                        onChangeText={setPlateQty}
                        placeholder="0"
                        placeholderTextColor="#aaa"
                      />

                      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                        <Text style={styles.submitText}>Transfer to Cart</Text>
                      </TouchableOpacity>
                    </View>                  
                
              </>
            )  
          )
        }
        </>
        // <DayInForm
        //   dayStarted={dayStarted}
        //   dayClosed={dayClosed}
        //   inventory={inventory}
        //   carts={carts}
        //   selectedCartId={selectedCartId}
        //   setSelectedCartId={setSelectedCartId}
        //   stickQty={stickQty}
        //   setStickQty={setStickQty}
        //   plateQty={plateQty}
        //   setPlateQty={setPlateQty}
        //   handleSubmit={handleSubmit}
        //   handleStartDay={handleStartDay}
        //   labelTextColor={labelTextColor}
        //   styles={styles}
        //   textColor={textColor}
        //   inputBgColor={inputBgColor}
        //   effectiveDate={effectiveDate}
        // />
      )}

      {/* Day Out Mode */}
      {mode === 'dayOut' && (
        <View>
          <Text style={[styles.dateText, { color: '#eb7100' }]}>
          📅 {effectiveDate.toLocaleDateString('en-GB', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
          </Text>

          {/* Cart Picker */}
          <Text style={[styles.label, { color: textColor }]}>Select Cart</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedCartId}
              onValueChange={(itemValue) => {
                setSelectedCartId(itemValue);
                setCartClosed(false); // ✅ Reset cartClosed when switching carts
                setDayOutData({ keptStickQty: '', keptPlateQty: '' });
                setDayOutStep(1);
                setSalesSaved({ stick: false, plate: false, receipts: false, expenses: false });
                setFinalDashboardData(null); // ✅ Optional: clear previous dashboard data
              }}
              
              mode="dropdown"
              dropdownIconColor={mode === 'dayOut' ? '#fff' : '#000'}
              style={{ color: mode === 'dayOut' ? '#fff' : '#000' }}
            >
              <Picker.Item label="Select a cart" value="" />
              {carts.filter(c => c.status === 'open').map(cart => (
                <Picker.Item
                  key={cart.id}
                  label={`${cart.address} (ID: ${cart.id})`}
                  value={cart.id}
                />
              ))}
            </Picker>
          </View>

          {selectedCartId === '' && !dayClosed && (
            <>
              <Image
                source={require('../assets/830272934580Time.gif')}
                style={{ width: '90%',height: 300, resizeMode: 'contain', alignSelf: 'center'}}
              />
              <TouchableOpacity
                onPress={handleCloseDay}
                disabled={carts.some(c => c.status === 'open')}
                style={[
                  styles.submitButton,
                  {
                    width: '95%',
                    backgroundColor: carts.some(c => c.status === 'open') ? '#aaa' : '#eb7100',
                    alignSelf: 'center',
                    marginTop: 16,
                  }
                ]}
              >
                <Text style={styles.submitText}>Close the Day</Text>
              </TouchableOpacity>
            </>
          )}


          {selectedCartId !== '' && (
            <>
            {!cartClosed &&( 
              <>          
              {/* Breadcrumbs */}
              <View style={styles.stepper}>
                {['Stick Kulfi', 'Plate Kulfi', 'Receipts', 'Expenses', 'Finalize'].map((step, index) => (
                  <View key={index} style={[
                    styles.stepCard,
                    dayOutStep === index + 1 && styles.activeStepCard,
                    index === 0 && styles.firstStepCard, // special first card
                    index === 4 && styles.lastStepCard,  // special last card
                  ]}>
                    <View style={styles.skewWrapper}>
                      <Text style={[
                        styles.stepText,
                        dayOutStep === index + 1 && styles.activeStepText
                      ]}>
                        {step}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>


              {/* Forms */}
              {dayOutStep === 1 && (
                <View style={styles.form}>
                  <Text style={[styles.label, { color: textColor }]}>Taken Out for Sale</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: 'transparent', color: textColor }]}
                    editable={false}
                    value={String(carts.find(c => c.id === selectedCartId)?.inventory?.stick || 0)}
                  />

                  <Text style={[styles.label, { color: textColor }]}>Kept in after Sale</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: 'transparent', color: textColor }]}
                    keyboardType="number-pad"
                    value={dayOutData.keptStickQty}
                    onChangeText={(text) => {
                      const input = parseInt(text || '0', 10);
                      const takenOut = carts.find(c => c.id === selectedCartId)?.inventory?.stick || 0;
                    
                      if (input >= 0 && input <= takenOut) {
                        setDayOutData(prev => ({ ...prev, keptStickQty: text }));
                      }
                    }}
                    
                    placeholder="Enter qty left after sale"
                    placeholderTextColor="#ccc"
                  />

                  <Text style={[styles.label, { color: textColor }]}>Total Sales</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: 'transparent', color: textColor }]}
                    editable={false}
                    value={String(stickSoldQty())}
                  />

                  <Text style={[styles.label, { color: textColor }]}>Sales Value</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: 'transparent', color: textColor }]}
                    editable={false}
                    value={`₹${stickSalesValue()}`}
                  />
                </View>
              )}

              {dayOutStep === 2 && (
                <View style={styles.form}>
                  <Text style={[styles.label, { color: textColor }]}>Taken Out for Sale</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: 'transparent', color: textColor }]}
                    editable={false}
                    value={String(carts.find(c => c.id === selectedCartId)?.inventory?.plate || 0)}
                  />

                  <Text style={[styles.label, { color: textColor }]}>Kept in after Sale</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: 'transparent', color: textColor }]}
                    keyboardType="number-pad"
                    value={dayOutData.keptPlateQty}
                    onChangeText={(text) => {
                      const input = parseInt(text || '0', 10);
                      const takenOut = carts.find(c => c.id === selectedCartId)?.inventory?.plate || 0;
                    
                      if (input >= 0 && input <= takenOut) {
                        setDayOutData(prev => ({ ...prev, keptPlateQty: text }));
                      }
                    }}
                    
                    placeholder="Enter qty left after sale"
                    placeholderTextColor="#ccc"
                  />

                  <Text style={[styles.label, { color: textColor }]}>Total Sales</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: 'transparent', color: textColor }]}
                    editable={false}
                    value={String(plateSoldQty())}
                  />

                  <Text style={[styles.label, { color: textColor }]}>Sales Value</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: 'transparent', color: textColor }]}
                    editable={false}
                    value={`₹${plateSalesValue()}`}
                  />
                </View>
              )}

              {dayOutStep === 3 && (
                <View style={styles.form}>
                  {/* Gross Sales Summary */}
                  <Text style={[styles.label, { color: textColor }]}>Total Sales (pcs)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: 'transparent', color: textColor }]}
                    editable={false}
                    value={String(stickSoldQty() + plateSoldQty())}
                  />

                  <Text style={[styles.label, { color: textColor }]}>Sales Value (₹)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: 'transparent', color: textColor }]}
                    editable={false}
                    value={`₹${grossSalesValue()}`}
                  />

                  {/* Cash In Hand */}
                  <Text style={[styles.label, { color: textColor }]}>Cash in Hand (₹)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: 'transparent', color: textColor }]}
                    keyboardType="number-pad"
                    value={receiptsData.cash}
                    onChangeText={(text) => {
                      const input = parseFloat(text || '0');
                      const qr = parseFloat(receiptsData.qr || '0');
                      const gross = parseFloat(grossSalesValue());

                      if (input >= 0 && (input + qr) <= gross) {
                        setReceiptsData(prev => ({ ...prev, cash: text }));
                      }
                    }}
                    placeholder="Enter cash collected"
                    placeholderTextColor="#ccc"
                  />


                  {/* QR Code Collection */}
                  <Text style={[styles.label, { color: textColor }]}>QR Collection (₹)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: 'transparent', color: textColor }]}
                    keyboardType="number-pad"
                    value={receiptsData.qr}
                    onChangeText={(text) => {
                      const input = parseFloat(text || '0');
                      const cash = parseFloat(receiptsData.cash || '0');
                      const gross = parseFloat(grossSalesValue());

                      if (input >= 0 && (cash + input) <= gross) {
                        setReceiptsData(prev => ({ ...prev, qr: text }));
                      }
                    }}
                    placeholder="Enter QR collected"
                    placeholderTextColor="#ccc"
                  />


                  {/* Total */}
                  <Text style={[styles.label, { color: textColor }]}>Total Received (₹)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: 'transparent', color: textColor }]}
                    editable={false}
                    value={`₹${totalReceived()}`}
                  />

                  {/* Balance Short if needed */}
                  {parseFloat(totalReceived()) < parseFloat(grossSalesValue()) && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={[styles.label, styles.balanceWarning]}>Balance Short (₹)</Text>
                      <TextInput
                        style={[styles.input, styles.warningInput, { backgroundColor: 'transparent' }]}
                        editable={false}
                        value={`₹-  ${balanceShort()}`}
                      />
                    </View>
                  )}
                </View>
              )}

              {dayOutStep === 4 && (
                <>
                  {parseFloat(balanceShort()) === 0 ? (
                    <View style={{ alignItems: 'center', marginTop: 40 }}>
                      <Text style={{ color: 'green', fontSize: 20, fontWeight: '700', marginBottom: 20 }}>
                        No Expenses for the Day!
                      </Text>
                      <Text style={{ fontSize: 80, color: 'green' }}>✅</Text>
                    </View>
                  ) : (
                    <View style={styles.form}>
                      {/* Balance Short */}
                      <Text style={[styles.label, {
                        color: updatedBalanceShort() === '0.00' ? 'green' : 'red'
                      }]}>
                        Balance Short (₹)
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          { backgroundColor: 'transparent', color: updatedBalanceShort() === '0.00' ? 'green' : 'red' }
                        ]}
                        editable={false}
                        value={`₹${updatedBalanceShort()}`}
                      />

                      {/* Expenses Section */}
                      {['samples', 'wastage', 'credit', 'swiggy', 'zomato'].map((key) => (
                        <View key={key}>
                          <Text style={[styles.label, { color: '#eb7100' }]}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: 'transparent', color: '#fff' }]}
                            keyboardType="number-pad"
                            value={expensesData[key]}
                            onChangeText={(text) => {
                              const input = parseFloat(text || '0');
                              const oldValue = parseFloat(expensesData[key] || '0');
                              const newTally = parseFloat(tallyTotal()) - oldValue + input;
                            
                              if (input >= 0 && newTally <= parseFloat(originalBalanceShort)) {
                                setExpensesData(prev => ({ ...prev, [key]: text }));
                              }
                            }}
                            
                            placeholder={`Enter ${key}`}
                            placeholderTextColor="#ccc"
                          />
                        </View>
                      ))}

                      <Text style={[styles.label, { color: '#eb7100', marginTop: 16 }]}>
                        Section Subtotal (₹)
                      </Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: 'transparent', color: textColor }]}
                        editable={false}
                        value={`₹${expensesTotal()}`}
                      />


                      {/* Daily Expenses Section */}
                      <Text style={[styles.label, { color: '#eb7100', marginTop: 16 }]}>Daily Expenses</Text>

                      {['municipality', 'bata', 'shortage', 'others'].map((key) => (
                        <View key={key}>
                          <Text style={[styles.label, { color: '#eb7100' }]}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: 'transparent', color: '#fff' }]}
                            keyboardType="number-pad"
                            value={expensesData[key]}
                            onChangeText={(text) => {
                              const input = parseFloat(text || '0');
                              const oldValue = parseFloat(expensesData[key] || '0');
                              const newTally = parseFloat(tallyTotal()) - oldValue + input;
                            
                              if (input >= 0 && newTally <= parseFloat(originalBalanceShort)) {
                                setExpensesData(prev => ({ ...prev, [key]: text }));
                              }
                            }}
                            
                            placeholder={`Enter ${key}`}
                            placeholderTextColor="#ccc"
                          />
                        </View>
                      ))}

                      <Text style={[styles.label, { color: '#eb7100', marginTop: 16 }]}>
                        Daily Expenses Subtotal (₹)
                      </Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: 'transparent', color: textColor }]}
                        editable={false}
                        value={`₹${dailyExpensesTotal()}`}
                      />


                      {/* Tally Total */}
                      <Text style={[styles.label, { color: updatedBalanceShort() === '0.00' ? 'green' : 'red', marginTop: 16 }]}>
                        Tally Total (₹)
                      </Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: 'transparent', color: updatedBalanceShort() === '0.00' ? 'green' : 'red' }]}
                        editable={false}
                        value={`₹${tallyTotal()}`}
                      />

                      {parseFloat(updatedBalanceShort()) !== 0 && (
                        <Text style={{ color: 'red', marginTop: 10, fontWeight: '700' }}>
                          ❌ Tally Mismatch
                        </Text>
                      )}

                      {parseFloat(updatedBalanceShort()) === 0 && (
                        <Text style={{ color: 'green', marginTop: 10, fontWeight: '700' }}>
                          ✅ Tally Matched
                        </Text>
                      )}
                    </View>
                  )}
                </>
              )}

              {dayOutStep === 5 && (
                <View style={styles.form}>
                  {/* Cash in Hand Display */}
                  <Text style={[styles.label, { color: textColor }]}>Cash in Hand (Captured)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: 'transparent', color: textColor }]}
                    editable={false}
                    value={`₹${receiptsData.cash}`}
                  />

                  {/* Denomination Inputs */}
                  <Text style={[styles.label, { color: '#eb7100', marginTop: 16 }]}>Cash Denomination</Text>

                  {['500', '200', '100', '50', '20', '10', 'coins'].map((denom) => (
                    <View key={denom} style={{ marginBottom: 8 }}>
                      <Text style={[styles.label, { color: textColor }]}>
                        {denom === 'coins' ? 'Coins (₹)' : `₹${denom} Notes`}
                      </Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: 'transparent', color: textColor }]}
                        keyboardType="number-pad"
                        value={denominationData[denom]}
                        onChangeText={(text) => {
                          setDenominationData(prev => ({ ...prev, [denom]: text }));
                        }}
                        placeholder={`Enter count of ${denom}`}
                        placeholderTextColor="#ccc"
                      />
                    </View>
                  ))}

                  {/* Total of Denominations */}
                  <Text style={[styles.label, { color: isCashTallied() ? 'green' : 'red', marginTop: 16 }]}>
                    Total Counted Cash
                  </Text>

                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: 'transparent',
                        color: isCashTallied() ? 'green' : 'red',
                        borderColor: isCashTallied() ? 'green' : 'red',
                        borderWidth: 1,
                      }
                    ]}
                    editable={false}
                    value={`₹${denominationTotal()}`}
                    placeholderTextColor="#ccc"
                  />


                  {/* Difference if needed */}
                  {parseFloat(denominationTotal()) !== parseFloat(receiptsData.cash) && (
                    <Text style={{ color: 'red', marginTop: 10, fontWeight: '700' }}>
                      ❗ Tally mismatch!
                    </Text>
                  )}

                  {parseFloat(denominationTotal()) === parseFloat(receiptsData.cash) && (
                    <Text style={{ color: 'green', marginTop: 10, fontWeight: '700' }}>
                      ✅ Tally Matched
                    </Text>
                  )}
                </View>
              )}



              {/* Navigation Buttons */}
              <View style={styles.dayOutButtons}>
                {dayOutStep > 1 && !cartClosed && (
                  <TouchableOpacity
                    style={[
                      styles.submitButton, 
                      { 
                        width: dayOutStep === 5 ? '90%' : '40%',
                        backgroundColor: '#fff'
                      }]}
                    onPress={handlePrevious}
                  >
                    <Text style={[styles.submitText, {color: '#000'}]}>Previous</Text>
                  </TouchableOpacity>
                )}
                {dayOutStep < 5 && (
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      {
                        width: dayOutStep === 1 ? '90%' : '40%',
                        backgroundColor: isNextEnabled() ? '#eb7100' : '#888',
                      }
                    ]}
                    onPress={handleNext}
                    disabled={!isNextEnabled()}
                  >
                    <Text style={styles.submitText}>Next </Text>
                  </TouchableOpacity>
                )}
                
              </View>

              

             

              {dayOutStep === 5 && (
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    {
                      width: '80%',
                      backgroundColor: isCashTallied() ? '#2ecc71' : '#aaa', // greyed if not tallied
                      alignSelf: 'center',
                      marginTop: 20,
                    }
                  ]}
                  onPress={handleCloseCart}
                  disabled={!isCashTallied()} // ✅ Disable if not tallied
                >
                  <Text style={styles.submitText}>Close Cart</Text>
                </TouchableOpacity>
              )}
              </>
            )}



              {/* Sales Dashboard */}
              
              {selectedCartId !== ''  && (
                <View ref={dashboardRef} collapsable={false} style={styles.dashboardCard}>
                  <View style={styles.dashboardTitleRow}>
                    <Text style={styles.dashboardTitle}>📦 Sales Dashboard</Text>
                      {!__DEV__ && cartClosed && (
                        <TouchableOpacity onPress={handleShareDashboard}>
                          <Feather name="share-2" size={22} color="#eb7100" />
                        </TouchableOpacity>
                      )}
                  </View>

                  <Text style={[styles.dashboardTitle, { marginBottom: 10 }]}>
                    {/* 📅 {formatDate(carts.find(c => c.id === selectedCartId)?.openedAt)} */}
                    📅 {effectiveDate.toLocaleDateString('en-GB', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                  </Text>

                  {/* Cart Address */}
                  <View style={styles.dashboardRow}>
                    <Text style={styles.dashboardLabel}>🏠 Cart Address</Text>
                    <Text style={styles.dashboardAmount}>
                      {cartClosed
                        ? finalDashboardData?.selectedCart?.address
                        : carts.find(c => c.id === selectedCartId)?.address ?? ''}
                    </Text>
                  </View>

                  {/* Stick Kulfi Sales */}
                  {salesSaved.stick || cartClosed ? (
                    <View style={[styles.dashboardRow, { borderBottomWidth: 0 }]}>
                      <View>
                        <Text style={styles.dashboardLabel}>🧊 Stick Kulfi Sales</Text>
                        <Text style={styles.dashboardSubtext}>
                          {cartClosed ? finalDashboardData?.stickSoldQty : stickSoldQty()} pcs
                        </Text>
                      </View>
                      <Text style={styles.dashboardAmount}>
                        ₹{cartClosed ? finalDashboardData?.stickSalesValue : stickSalesValue()}
                      </Text>
                    </View>
                  ) : null}

                  {/* Plate Kulfi Sales */}
                  {salesSaved.plate || cartClosed ? (
                    <View style={styles.dashboardRow}>
                      <View>
                        <Text style={styles.dashboardLabel}>🍽️ Plate Kulfi Sales</Text>
                        <Text style={styles.dashboardSubtext}>
                          {cartClosed ? finalDashboardData?.plateSoldQty : plateSoldQty()} pcs
                        </Text>
                      </View>
                      <Text style={styles.dashboardAmount}>
                        ₹{cartClosed ? finalDashboardData?.plateSalesValue : plateSalesValue()}
                      </Text>
                    </View>
                  ) : null}

                  {/* Gross Sales */}
                  {salesSaved.receipts || cartClosed ? (
                    <View style={styles.dashboardRow}>
                      <View>
                        <Text style={styles.dashboardLabel}>🧮 Gross Sales (All)</Text>
                        <Text style={styles.dashboardSubtext}>
                          {cartClosed
                            ? (Number(finalDashboardData?.stickSoldQty || 0) + Number(finalDashboardData?.plateSoldQty || 0))
                            : (stickSoldQty() + plateSoldQty())} pcs
                        </Text>
                      </View>
                      <Text style={[styles.dashboardAmount, { color: 'green' }]}>
                        ₹{cartClosed ? finalDashboardData?.grossSales : grossSalesValue()}
                      </Text>
                    </View>
                  ) : null}

                  {/* Receipts Section */}
                  {(salesSaved.receipts || salesSaved.expenses || cartClosed) && (
                    <Text style={styles.dashboardSubtitle}>💵 Receipts</Text>
                  )}
                  {salesSaved.receipts || cartClosed ? (
                    <>
                      <View style={[styles.dashboardRow, { borderBottomWidth: 0 }]}>
                        <Text style={styles.dashboardLabel}>Cash Collection</Text>
                        <Text style={styles.dashboardAmount}>
                          ₹{cartClosed ? finalDashboardData?.cashCollected : receiptsData.cash || 0}
                        </Text>
                      </View>
                      <View style={styles.dashboardRow}>
                        <Text style={styles.dashboardLabel}>QR Collection</Text>
                        <Text style={styles.dashboardAmount}>
                          ₹{cartClosed ? finalDashboardData?.qrCollected : receiptsData.qr || 0}
                        </Text>
                      </View>
                    </>
                  ) : null}

                  {/* Receivables */}
                  {(salesSaved.expenses || cartClosed) && (
                    <>
                      <Text style={styles.dashboardSubtitle}>📥 Receivables</Text>
                      <View style={styles.dashboardRow}>
                        <View>
                          <Text style={styles.dashboardLabel}>Receivables</Text>
                          <Text style={styles.dashboardSubtext}>
                            Swiggy, Zomato, Credit sales etc.
                          </Text>
                        </View>
                        <Text style={[styles.dashboardAmount, { color: 'orange' }]}>
                          ₹-{cartClosed
                            ? (
                                (Number(finalDashboardData?.receivables?.credit || 0)) +
                                (Number(finalDashboardData?.receivables?.swiggy || 0)) +
                                (Number(finalDashboardData?.receivables?.zomato || 0))
                              ).toFixed(2)
                            : receivablesTotal()}
                        </Text>
                      </View>
                    </>
                  )}

                  {/* Expenses */}
                  {(salesSaved.expenses || cartClosed) && (
                    <>
                      <Text style={styles.dashboardSubtitle}>📤 Expenses</Text>
                      <View style={styles.dashboardRow}>
                        <View>
                          <Text style={styles.dashboardLabel}>Expenses</Text>
                          <Text style={styles.dashboardSubtext}>
                            Wastages, Bata, Municipality etc.
                          </Text>
                        </View>
                        <Text style={[styles.dashboardAmount, { color: 'red' }]}>
                          -₹{cartClosed
                            ? (
                                (Number(finalDashboardData?.expenses?.samples || 0)) +
                                (Number(finalDashboardData?.expenses?.wastage || 0)) +
                                (Number(finalDashboardData?.expenses?.municipality || 0)) +
                                (Number(finalDashboardData?.expenses?.bata || 0)) +
                                (Number(finalDashboardData?.expenses?.shortage || 0)) +
                                (Number(finalDashboardData?.expenses?.others || 0))
                              ).toFixed(2)
                            : actualExpensesTotal()}
                        </Text>
                      </View>
                    </>
                  )}

                  {/* Net Sales */}
                  {dayOutStep === 5 || cartClosed ? (
                    <>
                      <Text style={styles.dashboardSubtitle}>🧾 Net Sales</Text>
                      <View style={styles.dashboardRow}>
                        <Text style={styles.dashboardLabel}>Net Sales</Text>
                        <Text style={[styles.dashboardAmount, { color: 'green' }]}>
                          +₹{cartClosed ? finalDashboardData?.netSales : netSalesValue()}
                        </Text>
                      </View>
                    </>
                  ) : null}
                </View>
              )}

              {/* Clear Day Out */}
              <TouchableOpacity
                style={[styles.submitButton, { width: '80%', backgroundColor: '#d90368', marginTop: 20, alignSelf: 'center' }]}
                onPress={handleClearDayOut}
              >
                <Text style={styles.submitText}>Clear</Text>
              </TouchableOpacity>


            </>
          )}
        </View>
      )}
  
     

    </ScrollView>
    </SafeAreaView>
  );
};

export default OperationsScreen;



const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 32,
  },
  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: '#f2f2f2',
    borderRadius: 32,
    padding: 4,
    marginBottom: 20,
    alignSelf: 'center',
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 32,
  },
  toggleSelected: {
    backgroundColor: '#d90368',
  },
  toggleText: {
    fontWeight: '700',
    color: '#311847',
  },
  toggleSelectedText: {
    fontWeight: '700',
    color: '#fff',
  },

  form: {
    marginTop: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 8,
  },
  submitButton: {
    backgroundColor: '#311847',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 8,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  dayOutButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  clearButton: {
    backgroundColor: '#d90368',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  
  infoText: {
    color: '#eb7100',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
    
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  
  stepCard: {
    backgroundColor: '#5c4a4d',
    paddingVertical: 10,
    paddingHorizontal: 16,
    transform: [{ skewX: '-15deg' }],
    marginRight: -12,
    zIndex: 10,
  },
  
  firstStepCard: {
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  
  lastStepCard: {
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    marginRight: 0, // no overlap after last
  },
  
  activeStepCard: {
    backgroundColor: '#eb7100',
    zIndex: 20,
  },
  
  skewWrapper: {
    transform: [{ skewX: '15deg' }],
  },
  
  stepText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  
  activeStepText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  
  
  dashboardCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginTop: 30,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  dashboardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#eb7100',
    marginBottom: 12,
    textAlign: 'center',
  },
  dashboardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
    paddingVertical: 12,
  },  
  dashboardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },  
  dashboardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#291720',
  },
  dashboardSubtext: {
    fontSize: 12,
    color: '#888',
  },
  dashboardAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#291720',
  },
  clearButton: {
    backgroundColor: '#d90368',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 20,
    alignSelf: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  balanceWarning: {
    color: 'red',
    fontWeight: '700',
    fontSize: 14,
    marginTop: 8,
  },
  
  warningInput: {
    borderColor: 'red',
    color: 'red',
  },

  currentDay: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#291720',
    textAlign: 'center',
  },
  warehouseWrapper: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 16,
  },
  
  warehouseTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#291720',
    marginBottom: 12,
    textAlign: 'center',
  },
  
  circleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 8,
  },
  
  circle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  
  circleQty: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 80,
  },
  
  circleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  warehouseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 10,
    marginTop: 20,
    marginBottom: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  
  topRightCircle: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eb7100',
    opacity: 0.2,
  },
  
  bottomLeftCircle: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#d90368',
    opacity: 0.2,
  },
  
  
  
  
});



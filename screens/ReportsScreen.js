import React, { useCallback, useState, useContext} from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../database/firebase';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { Picker } from '@react-native-picker/picker';
import { InventoryContext } from '../context/InventoryContext';


const today = new Date();
const currentMonth = String(today.getMonth() + 1).padStart(2, '0');  // e.g. "04"
const currentYear = today.getFullYear().toString();                  // e.g. "2025"

const ReportsScreen = () => {
  const [mainReportType, setMainReportType] = useState('');
  const [dailySummaries, setDailySummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [reportType, setReportType] = useState('Stick'); // 'Stick' or 'Plate'
  const { inventory } = useContext(InventoryContext);
  const { stickSalePrice, plateSalePrice } = useContext(InventoryContext);
  const [cashflowType, setCashflowType ] = useState('Expenses');


  useFocusEffect(
    useCallback(() => {
      const fetchDailySummaries = async () => {
        setLoading(true);
        try {
          const yearDocRef = doc(db, 'dailyStockSummary', selectedYear);
          const monthsCollectionRef = collection(yearDocRef, 'months');
          const monthDocRef = doc(monthsCollectionRef, selectedMonth);
  
          const monthSnap = await getDoc(monthDocRef);
  
          if (monthSnap.exists()) {
            const monthData = monthSnap.data();
            const summaries = monthData.dailySummaries || {};
  
            const selectedYearNumber = Number(selectedYear);
            const selectedMonthNumber = Number(selectedMonth) - 1;
            const daysInMonth = new Date(selectedYearNumber, selectedMonthNumber + 1, 0).getDate();
            const fullMonthData = [];
  
            for (let day = 1; day <= daysInMonth; day++) {
              const dateObj = new Date(selectedYearNumber, selectedMonthNumber, day);
              const yyyy = dateObj.getFullYear();
              const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
              const dd = String(dateObj.getDate()).padStart(2, '0');
              const date = `${yyyy}-${mm}-${dd}`;
  
              if (summaries[date]) {
                fullMonthData.push({
                  date,
                  ...summaries[date],
                  isHoliday: false,
                });
              } else {
                fullMonthData.push({
                  date,
                  isHoliday: true,
                });
              }
            }
  
            // 🌟 FILTER STEPS
            const todayDate = new Date().toISOString().split('T')[0];
            const availableData = fullMonthData.filter(item => item.date <= todayDate);
            const firstAvailableIndex = availableData.findIndex(item => !item.isHoliday);
            const finalData = availableData.slice(firstAvailableIndex);
  
            setDailySummaries(finalData);
            
          } else {
            setDailySummaries([]);
          }
        } catch (error) {
          console.error('Error fetching daily summaries:', error);
        } finally {
          setLoading(false);
        }
      };
  
      fetchDailySummaries();
    }, [selectedMonth, selectedYear, reportType])
  );
  

  

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d90368" />
        <Text style={{ marginTop: 10, color: '#666' }}>Loading reports...</Text>
      </View>
    );
  }

  const renderSalesTableHeader = () => (
  <View style={styles.tableHeader}>
    <Text style={[styles.headerCell, { flex: 2 }]}>Date</Text>
    <Text style={styles.headerCell}>Stick Qty</Text>
    <Text style={styles.headerCell}>Stick ₹</Text>
    <Text style={styles.headerCell}>Plate Qty</Text>
    <Text style={styles.headerCell}>Plate ₹</Text>
  </View>
  );

  const renderSalesRow = (item) => {
    if (item.isHoliday) {
      return (
        <View style={styles.holidayRow} key={item.date}>
          <Text style={[styles.cell, { flex: 2 }]}>{item.date}</Text>
          <Text style={[styles.cell, { flex: 4 }]}>🌴 Holiday</Text>
        </View>
      );
    }
  
    const stickQty = item.stickSold ?? 0;
    const plateQty = item.plateSold ?? 0;
    const stickRate = item.openingStock?.stick?.sellingPrice ?? stickSalePrice;
    const plateRate = item.openingStock?.plate?.sellingPrice ?? plateSalePrice;
    const isCurrentOpenDay = item.dayClosed === false;
    return (
      <View style={[
        styles.tableRow,
        isCurrentOpenDay && styles.currentDayRow]
        } key={item.date}>
        <Text style={[styles.cell, { flex: 2 }]}>{item.date}</Text>
        <Text style={styles.cell}>{stickQty}</Text>
        <Text style={styles.cell}>₹ {(stickQty * stickRate).toFixed(2)}</Text>
        <Text style={styles.cell}>{plateQty}</Text>
        <Text style={styles.cell}>₹ {(plateQty * plateRate).toFixed(2)}</Text>
      </View>
    );
  };

  const renderSalesTotalRow = () => {
    let totalStickQty = 0;
    let totalPlateQty = 0;
    let totalStickSales = 0;
    let totalPlateSales = 0;
  
    dailySummaries.forEach(item => {
      if (!item.isHoliday) {
        const stickQty = item.stickSold ?? 0;
        const plateQty = item.plateSold ?? 0;
        const stickRate = item.openingStock?.stick?.sellingPrice ?? stickSalePrice;
        const plateRate = item.openingStock?.plate?.sellingPrice ?? plateSalePrice;
  
        totalStickQty += stickQty;
        totalPlateQty += plateQty;
        totalStickSales += stickQty * stickRate;
        totalPlateSales += plateQty * plateRate;
      }
    });
  
    return (
      <View style={styles.totalRow}>
        <Text style={[styles.totalCell, { flex: 2 }]}>TOTAL</Text>
        <Text style={styles.totalCell}>{totalStickQty}</Text>
        <Text style={styles.totalCell}>₹ {totalStickSales.toFixed(2)}</Text>
        <Text style={styles.totalCell}>{totalPlateQty}</Text>
        <Text style={styles.totalCell}>₹ {totalPlateSales.toFixed(2)}</Text>
      </View>
    );
  };
  
  

  const calculateTotals = (data, type) => {
    const lowerType = type.toLowerCase();
    let totalOpening = 0;
    let totalSold = 0;
    let totalClosing = 0;
    let totalReceived = 0;

    data.forEach(item => {
      if (!item.isHoliday) {
        totalOpening += item.openingStock?.[lowerType]?.quantity ?? 0;
        totalSold += item[`${lowerType}Sold`] ?? 0;
        totalClosing += item.closingStock?.[lowerType]?.quantity ?? 0;
        totalReceived += item[`received${type}`] ?? 0;
      }
    });

    return { totalOpening, totalSold, totalClosing, totalReceived };
  };

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, { flex: 2 }]}>Date</Text>
      <Text style={styles.headerCell}>Opening</Text>
      <Text style={styles.headerCell}>Sale</Text>
      <Text style={styles.headerCell}>Closing</Text>
      <Text style={styles.headerCell}>Received</Text>
    </View>
  );

  const renderRow = (item, type) => {
    const lowerType = type.toLowerCase();

    if (item.isHoliday) {
      return (
        <View style={styles.holidayRow} key={item.date}>
          <Text style={[styles.cell, { flex: 2 }]}>{item.date}</Text>
          <Text style={[styles.cell, { flex: 4 }]}>🌴 Holiday</Text>
        </View>
      );
    }

    const openingQty = item.openingStock?.[lowerType]?.quantity ?? '-';
    const closingQty = item.closingStock?.[lowerType]?.quantity ?? '-';
    const soldQty = item[`${lowerType}Sold`] ?? '-';
    const receivedQty = item[`received${type}`] ?? '-';

    const isCurrentOpenDay = item.dayClosed === false;

    return ( 
          <View
            style={[
              styles.tableRow,
              isCurrentOpenDay && styles.currentDayRow
            ]}
            key={item.date}
            >
            <Text style={[styles.cell, { flex: 2 }]}>{item.date}</Text>
            <Text style={styles.cell}>{openingQty}</Text>
            <Text style={styles.cell}>{soldQty}</Text>
            <Text style={styles.cell}>{closingQty}</Text>
            <Text style={styles.cell}>{receivedQty}</Text>
            </View>
    );
  };

  const renderTotalRow = (totals) => (
    <View style={styles.totalRow}>
      <Text style={[styles.totalCell, { flex: 2 }]}>TOTAL</Text>
      <Text style={styles.totalCell}>{totals.totalOpening}</Text>
      <Text style={styles.totalCell}>{totals.totalSold}</Text>
      <Text style={styles.totalCell}>{totals.totalClosing}</Text>
      <Text style={styles.totalCell}>{totals.totalReceived}</Text>
    </View>
  );

  //Utils for Cashflow
  const renderExpensesTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, { flex: 1 }]}>Date</Text>
      <Text style={styles.headerCell}>Sample</Text>
      <Text style={styles.headerCell}>Waste</Text>
      <Text style={styles.headerCell}>Short</Text>
      <Text style={styles.headerCell}>Govt</Text>
      <Text style={styles.headerCell}>Bata</Text>
      <Text style={styles.headerCell}>Other</Text>
      <Text style={styles.headerCell}>Total</Text>
    </View>
  );


  const renderReceivablesTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, { flex: 2 }]}>Date</Text>
      <Text style={styles.headerCell}>Credit</Text>
      <Text style={styles.headerCell}>Swiggy</Text>
      <Text style={styles.headerCell}>Zomato</Text>
      <Text style={styles.headerCell}>Total</Text>
    </View>
  );
  
  const renderExpensesRow = (item) => {
    if (item.isHoliday) {
      return (
        <View style={styles.holidayRow} key={item.date}>
          <Text style={[styles.cell, { flex: 2 }]}>{item.date}</Text>
          <Text style={[styles.cell, { flex: 4 }]}>🌴 Holiday</Text>
        </View>
      );
    }

    const { expenses = {} } = item;
    const { samples = 0, wastage = 0, other = 0, municipality = 0, bata = 0, shortage = 0 } = expenses;
    const total = samples + wastage + other + municipality + bata + shortage;    
    const isCurrentOpenDay = item.dayClosed === false;
    return (
      <View style={[
        styles.tableRow,
        isCurrentOpenDay && styles.currentDayRow]
        } key={item.date}>
        <Text style={[styles.cell, { flex: 2 }]}>{item.date}</Text>
        <Text style={styles.cell}>{samples}</Text>
        <Text style={styles.cell}>{wastage}</Text>
        <Text style={styles.cell}>{shortage}</Text>
        <Text style={styles.cell}>{municipality}</Text>
        <Text style={styles.cell}>{bata}</Text>
        <Text style={styles.cell}>{other}</Text>
        <Text style={styles.cell}>{total}</Text>
      </View>
    );
  };

  const renderReceivablesRow = (item) => {
    if (item.isHoliday) {
      return (
        <View style={styles.holidayRow} key={item.date}>
          <Text style={[styles.cell, { flex: 2 }]}>{item.date}</Text>
          <Text style={[styles.cell, { flex: 4 }]}>🌴 Holiday</Text>
        </View>
      );
    }
    const { receivables = {} } = item;
    const { credit = 0, swiggy = 0, zomato = 0 } = receivables;
    const total = credit + swiggy + zomato;        
    const isCurrentOpenDay = item.dayClosed === false;
  
    return (
      <View style={[
        styles.tableRow,
        isCurrentOpenDay && styles.currentDayRow]
        } key={item.date}>
        <Text style={[styles.cell, { flex: 2 }]}>{item.date}</Text>
        <Text style={styles.cell}>{credit}</Text>
        <Text style={styles.cell}>{swiggy}</Text>
        <Text style={styles.cell}>{zomato}</Text>
        <Text style={styles.cell}>{total}</Text>
      </View>
    );
  };
  
  const renderExpensesTotalRow = () => {
    const totals = dailySummaries.reduce((acc, { expenses = {} }) => {
      acc.samples += expenses.samples || 0;
      acc.wastage += expenses.wastage || 0;
      acc.other += expenses.other || 0;
      acc.municipality += expenses.municipality || 0;
      acc.bata += expenses.bata || 0;
      acc.shortage += expenses.shortage || 0;
      return acc;
    }, { samples: 0, wastage: 0, other: 0, municipality: 0, bata: 0, shortage: 0 });
  
    const total = Object.values(totals).reduce((sum, val) => sum + val, 0);
  
    return (
      <View style={styles.totalRow}>
        <Text style={[styles.totalCell, { flex: 2 }]}>TOTAL</Text>
        <Text style={styles.totalCell}>{totals.samples}</Text>
        <Text style={styles.totalCell}>{totals.wastage}</Text>
        <Text style={styles.totalCell}>{totals.shortage}</Text>
        <Text style={styles.totalCell}>{totals.municipality}</Text>
        <Text style={styles.totalCell}>{totals.bata}</Text>
        <Text style={styles.totalCell}>{totals.other}</Text>
        <Text style={styles.totalCell}>{total}</Text>
      </View>
    );
  };

  const renderReceivablesTotalRow = () => {
    const totals = dailySummaries.reduce((acc, { receivables = {} }) => {
      acc.credit += receivables.credit || 0;
      acc.swiggy += receivables.swiggy || 0;
      acc.zomato += receivables.zomato || 0;
      return acc;
    }, { credit: 0, swiggy: 0, zomato: 0 });
  
    const total = Object.values(totals).reduce((sum, val) => sum + val, 0);
  
    return (
      <View style={styles.totalRow}>
        <Text style={styles.totalText}>Total</Text>
        <Text style={styles.totalText}>{totals.credit}</Text>
        <Text style={styles.totalText}>{totals.swiggy}</Text>
        <Text style={styles.totalText}>{totals.zomato}</Text>
        <Text style={styles.totalText}>{total}</Text>
      </View>
    );
  };
  

  const hasRealData = dailySummaries.some(item => !item.isHoliday);

  const totalQuantitySold = dailySummaries.reduce((sum, item) => {
    if (!item.isHoliday) {
      return sum + (item.stickSold ?? 0) + (item.plateSold ?? 0);
    }
    return sum;
  }, 0);

  const totalSalesValue = dailySummaries.reduce((sum, item) => {
    if (!item.isHoliday) {
      const stickQty = item.stickSold ?? 0;
      const plateQty = item.plateSold ?? 0;
      const stickPrice = item.openingStock?.stick?.sellingPrice ?? stickSalePrice;
      const platePrice = item.openingStock?.plate?.sellingPrice ?? plateSalePrice;
      return sum + stickQty * stickPrice + plateQty * platePrice;
    }
    return sum;
  }, 0);

  const totalExpensesValue = dailySummaries.reduce((sum, item) => {
    if (!item.isHoliday) {
      const samples = item.expenses?.samples || 0;
      const wastage = item.expenses?.wastage || 0;
      const shortage = item.expenses?.shortage || 0;
      const municipality = item.expenses?.municipality || 0;
      const bata = item.expenses?.bata || 0;
      const other = item.expenses?.other || 0;
      return sum + samples + wastage + shortage + municipality + bata + other;
    }
    return sum;
  }, 0);

  const totalReceivablesValue = dailySummaries.reduce((sum, item) => {
    if (!item.isHoliday) {
      const credit = item.receivables?.credit || 0;
      const swiggy = item.receivables?.swiggy || 0;
      const zomato = item.receivables?.zomato || 0;
      return sum + credit + swiggy + zomato;
    }
    return sum;
  }, 0);

  const getMonthOpeningStock = () => {
    const type = reportType.toLowerCase();
    const firstOpenDay = dailySummaries.find(item => !item.isHoliday);
    const openingQty = firstOpenDay?.openingStock?.[type]?.quantity ?? 0;
    const openingValue = openingQty * (inventory[type]?.costPrice || 0);
    return { quantity: openingQty, value: openingValue };
  };
  
  const getMonthClosingStock = () => {
    const type = reportType.toLowerCase();
    const reversed = [...dailySummaries].reverse();
    const lastOpenDay = reversed.find(item => !item.isHoliday);
    const closingQty = lastOpenDay?.closingStock?.[type]?.quantity ?? 0;
    const closingValue = closingQty * (inventory[type]?.costPrice || 0);
    return { quantity: closingQty, value: closingValue };
  };
  

  return (    
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView style={styles.container}>

        <Text style={[styles.dateText, { color: '#eb7100' }]}>
                  📅 {new Date().toLocaleDateString('en-GB', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
        </Text>

        {/* 🌟 PICKER */}
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={mainReportType}
              onValueChange={setMainReportType}
              style={styles.picker}
              mode='dropdown'
              dropdownIconColor={'#000'}
            >
              <Picker.Item label="Select a Report" value="" />
              <Picker.Item label="Stock Summary" value="stock" />
              <Picker.Item label="Sales Summary" value="sales" />
              <Picker.Item label="Cashflow" value="cashflow" />
            </Picker>
          </View>

          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedMonth}
              onValueChange={setSelectedMonth}
              style={styles.picker}
              mode='dropdown'
              dropdownIconColor={'#000'}
            >
              {/* Months 01, 02, ..., 12 */}
              {Array.from({ length: 12 }, (_, i) => (
                <Picker.Item key={i} label={String(i + 1).padStart(2, '0')} value={String(i + 1).padStart(2, '0')} />
              ))}
            </Picker>

          <Picker
            selectedValue={selectedYear}
            onValueChange={setSelectedYear}
            style={styles.picker}
            mode='dropdown'
            dropdownIconColor={'#000'}
          >
            {/* Years, for example from 2024 to 2026 */}
            {[currentYear -1, currentYear].map(year => (
              <Picker.Item key={year} label={`${year}`} value={`${year}`} />
            ))}

          </Picker>
        </View>

        {mainReportType === 'stock' && (
          <>
            {/* Wrapper */}
            <View style={styles.toggleWrapper}>
              <TouchableOpacity
                style={[styles.toggleButton, reportType === 'Stick' && styles.toggleButtonSelected]}
                onPress={() => setReportType('Stick')}
              >
                <Text style={reportType === 'Stick' ? styles.toggleTextSelected : styles.toggleText}>Stick Kulfi</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleButton, reportType === 'Plate' && styles.toggleButtonSelected]}
                onPress={() => setReportType('Plate')}
              >
                <Text style={reportType === 'Plate' ? styles.toggleTextSelected : styles.toggleText}>Plate Kulfi</Text>
              </TouchableOpacity>
            </View>    



            {hasRealData ? (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 16 }}>
                  {/* Opening Stock Card */}
                  <View style={[styles.stockCard, { backgroundColor: '#eb7100' }]}>
                    <Text style={styles.stockCardTitle}>Month Opening</Text>
                    <Text style={styles.stockCardQty}>{getMonthOpeningStock().quantity} pcs</Text>
                    <Text style={styles.stockCardValue}>₹ {getMonthOpeningStock().value.toFixed(2)}</Text>
                  </View>

                  {/* Closing Stock Card */}
                  <View style={[styles.stockCard, { backgroundColor: '#311847' }]}>
                    <Text style={styles.stockCardTitle}>Month Closing</Text>
                    <Text style={styles.stockCardQty}>{getMonthClosingStock().quantity} pcs</Text>
                    <Text style={styles.stockCardValue}>₹ {getMonthClosingStock().value.toFixed(2)}</Text>
                  </View>
                </View>

                {renderTableHeader()}
                {dailySummaries.map(item => renderRow(item, reportType))}
                {renderTotalRow(calculateTotals(dailySummaries, reportType))}
              </>
            ) : (
              <View style={{ alignItems: 'center', marginTop: 50 }}>
                <Image
                  source={require('../assets/report.png')}
                  style={{ width: '90%', height: 250, resizeMode: 'contain' }}
                />
                <Text style={{
                  color: '#311847',
                  fontSize: 16,
                  fontWeight: '600',
                  marginTop: 20,
                  textAlign: 'center'
                }}>
                  No reports found for the selected time period.
                </Text>
              </View>

            )}
          </>
        )}   

        {mainReportType === 'sales' && (
          <>
            {hasRealData && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 16 }}>
                {/* Total Quantity Sold Card */}
                <View style={[styles.stockCard, { backgroundColor: '#eb7100' }]}>
                  <Text style={styles.stockCardTitle}>Total Quantity Sold</Text>
                  <Text style={styles.stockCardQty}>{totalQuantitySold} pcs</Text>
                </View>
                {/* Total Sales Value Card */}
                <View style={[styles.stockCard, { backgroundColor: '#311847' }]}>
                  <Text style={styles.stockCardTitle}>Total Sales Value</Text>
                  <Text style={styles.stockCardQty}>+ ₹ {totalSalesValue.toFixed(2)}</Text>
                </View>
              </View>
            )}

            {hasRealData ? (
              <>
                {renderSalesTableHeader()}
                {dailySummaries.map(renderSalesRow)}
                {renderSalesTotalRow()}
              </>
            ) : (
              <View style={{ alignItems: 'center', marginTop: 50 }}>
                <Image
                  source={require('../assets/report.png')}
                  style={{ width: '90%', height: 250, resizeMode: 'contain' }}
                />
                <Text style={{
                  color: '#311847',
                  fontSize: 16,
                  fontWeight: '600',
                  marginTop: 20,
                  textAlign: 'center'
                }}>
                  No sales data found for the selected time period.
                </Text>
              </View>
            )}

          </>
        )}

        {mainReportType === 'cashflow' && (
          <>
            {hasRealData && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 16 }}>
                
                <View style={[styles.stockCard,cashflowType === 'Expenses' ? { backgroundColor: '#eb7100' } : { backgroundColor: '#ccc', color: '#000' }]}>
                  <Text style={styles.stockCardTitle}>Total Expenses</Text>
                  <Text style={styles.stockCardQty}>- ₹ {totalExpensesValue.toFixed(2)} </Text>
                </View>
                {/* Total Sales Value Card */}
                <View style={[styles.stockCard, cashflowType === 'Receivables' ? { backgroundColor: '#311847' } : { backgroundColor: '#ccc', color: '#000' }]}>
                  <Text style={styles.stockCardTitle}>Total Receivables</Text>
                  <Text style={styles.stockCardQty}>₹ {totalReceivablesValue.toFixed(2)}</Text>
                </View>
              </View>
            )}

            <View style={styles.toggleWrapper}>
              <TouchableOpacity
                style={[styles.toggleButton, cashflowType === 'Expenses' && styles.toggleButtonSelected]}
                onPress={() => setCashflowType('Expenses')}
              >
                <Text style={cashflowType === 'Expenses' ? styles.toggleTextSelected : styles.toggleText}>Expenses</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleButton, cashflowType === 'Receivables' && styles.toggleButtonSelected]}
                onPress={() => setCashflowType('Receivables')}
              >
                <Text style={cashflowType === 'Receivables' ? styles.toggleTextSelected : styles.toggleText}>Receivables</Text>
              </TouchableOpacity>
            </View>

            {hasRealData ? (
              <>
                {cashflowType === 'Expenses' ? renderExpensesTableHeader() : renderReceivablesTableHeader()}
                {dailySummaries.map(item =>
                  cashflowType === 'Expenses' ? renderExpensesRow(item) : renderReceivablesRow(item)
                )}
                {cashflowType === 'Expenses' ? renderExpensesTotalRow() : renderReceivablesTotalRow()}
              </>
            ) : (
              <View style={{ alignItems: 'center', marginTop: 50 }}>
                <Image
                  source={require('../assets/report.png')}
                  style={{ width: '90%', height: 250, resizeMode: 'contain' }}
                />
                <Text style={{
                  color: '#311847',
                  fontSize: 16,
                  fontWeight: '600',
                  marginTop: 20,
                  textAlign: 'center'
                }}>
                  No {cashflowType.toLowerCase()} data found for the selected time period.
                </Text>
              </View>
            )}
          </>
        )}

 

        {mainReportType === '' && (
          <View style={{ alignItems: 'center', marginTop: 80 }}>
            <Image
              source={require('../assets/search.png')}
              style={{ width: '90%', height: 250, resizeMode: 'contain' }}
            />
            <Text style={{
              color: '#fb8b24',
              fontSize: 16,
              fontWeight: '600',
              marginTop: 20,
              textAlign: 'center'
            }}>
              Select a report type for reconciliation
            </Text>
          </View>
        )}
        

      </ScrollView>
    </SafeAreaView>
  );
};

export default ReportsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 16,
    color: '#311847',
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#d90368',
    padding: 10,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  headerCell: {
    flex: 1,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    fontSize: 13,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#311847',
    borderBottomColor: '#ccc',
  },
  currentDayRow: {
    backgroundColor: '#9e46',
    fontWeight: 'bold',
  },
  holidayRow: {
    flexDirection: 'row',
    backgroundColor: '#ffe6f0',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#311847',
    alignItems: 'center',
    borderBottomColor: '#ccc',
  },
  cell: {
    flex: 1,
    textAlign: 'center',
    color: '#000',
    fontWeight: '600',
    fontSize: 13,
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#311847',
    paddingVertical: 10,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  totalCell: {
    flex: 1,
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#fff',
  },
  monthSummaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 8,
    elevation: 3,
  },
  monthSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#311847',
    marginBottom: 12,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#555',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  pickerWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
    elevation: 2,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  
  picker: {
    flex: 0.45,   // <--- instead of flex: 1
    height: 50,
    color: '#000',
    minWidth: 120, // <--- force minimum width
  },
  
  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: '#f2f2f2', // Light background for the toggle
    borderRadius: 32,
    padding: 4,
    marginBottom: 20,
    alignSelf: 'center',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 32,
  },
  toggleButtonSelected: {
    backgroundColor: '#d90368', 
  },
  toggleText: {
    fontWeight: '700',
    color: '#000',
  },
  toggleTextSelected: {
    fontWeight: '700',
    color: '#fff',
  },
  stockCard: {
    flex: 0.48,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  stockCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  stockCardQty: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  stockCardValue: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  
  
  
});

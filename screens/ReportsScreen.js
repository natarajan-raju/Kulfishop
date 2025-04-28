import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../database/firebase';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { Picker } from '@react-native-picker/picker';


const today = new Date();
const currentMonth = String(today.getMonth() + 1).padStart(2, '0');  // e.g. "04"
const currentYear = today.getFullYear().toString();                  // e.g. "2025"

const ReportsScreen = () => {
  const [dailySummaries, setDailySummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [reportType, setReportType] = useState('Stick'); // 'Stick' or 'Plate'
  const [openingStock, setOpeningStock] = useState(0);
  const [closingStock, setClosingStock] = useState(0);
  const [availableYears, setAvailableYears] = useState([]);


  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        try {
          const dailyStockSummaryRef = collection(db, 'dailyStockSummary');
          const snapshot = await getDocs(dailyStockSummaryRef);
          console.log(snapshot);
          const years = snapshot.docs.map(doc => doc.id);
          const sortedYears = years.sort();
          setAvailableYears(sortedYears);

          let yearToUse = selectedYear;
          if (sortedYears.length > 0) {
            yearToUse = sortedYears.includes(selectedYear) ? selectedYear : sortedYears[sortedYears.length - 1];
            setSelectedYear(yearToUse);
          }

          await fetchDailySummaries(yearToUse, selectedMonth);
        } catch (error) {
          console.error('Error fetching available years or daily summaries:', error);
        }
      };

      fetchData();
    }, [selectedMonth, selectedYear, reportType])
  );

  const fetchDailySummaries = async (yearParam, monthParam) => {
    setLoading(true);
    try {
      const yearDocRef = doc(db, 'dailyStockSummary', yearParam);
      const monthsCollectionRef = collection(yearDocRef, 'months');
      const monthDocRef = doc(monthsCollectionRef, monthParam);

      const monthSnap = await getDoc(monthDocRef);

      if (monthSnap.exists()) {
        const monthData = monthSnap.data();
        const summaries = monthData.dailySummaries || {};

        const selectedYearNumber = Number(yearParam);
        const selectedMonthNumber = Number(monthParam) - 1;
        const daysInMonth = new Date(selectedYearNumber, selectedMonthNumber + 1, 0).getDate();
        const fullMonthData = [];

        for (let day = 1; day <= daysInMonth; day++) {
          const dateObj = new Date(selectedYearNumber, selectedMonthNumber, day);
          const yyyy = dateObj.getFullYear();
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
          const dd = String(dateObj.getDate()).padStart(2, '0');
          const date = `${yyyy}-${mm}-${dd}`;

          if (summaries[date]) {
            fullMonthData.push({ date, ...summaries[date], isHoliday: false });
          } else {
            fullMonthData.push({ date, isHoliday: true });
          }
        }

        const todayDate = new Date().toISOString().split('T')[0];
        const availableData = fullMonthData.filter(item => item.date <= todayDate);
        const firstAvailableIndex = availableData.findIndex(item => !item.isHoliday);
        const finalData = availableData.slice(firstAvailableIndex);

        setDailySummaries(finalData);

        const firstDay = finalData.find(item => !item.isHoliday);
        const lastDay = [...finalData].reverse().find(item => !item.isHoliday);

        if (firstDay && lastDay) {
          setOpeningStock(
            reportType === 'Stick'
              ? firstDay.openingStock?.stick?.quantity ?? 0
              : firstDay.openingStock?.plate?.quantity ?? 0
          );
          setClosingStock(
            reportType === 'Stick'
              ? lastDay.closingStock?.stick?.quantity ?? 0
              : lastDay.closingStock?.plate?.quantity ?? 0
          );
        } else {
          setOpeningStock(0);
          setClosingStock(0);
        }
      } else {
        setDailySummaries([]);
      }
    } catch (error) {
      console.error('Error fetching daily summaries:', error);
    } finally {
      setLoading(false);
    }
  };
  

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d90368" />
        <Text style={{ marginTop: 10, color: '#666' }}>Loading reports...</Text>
      </View>
    );
  }

  const renderMonthSummary = () => (
    <View style={styles.monthSummaryCard}>
      <Text style={styles.monthSummaryTitle}>📦 Month Opening/Closing ({reportType} Kulfi)</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Opening Stock:</Text>
        <Text style={styles.summaryValue}>{openingStock} pcs</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Closing Stock:</Text>
        <Text style={styles.summaryValue}>{closingStock} pcs</Text>
      </View>
    </View>
  );
  

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

  const hasRealData = dailySummaries.some(item => !item.isHoliday);


  return (    
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView style={styles.container}>

        {/* 🌟 PICKER */}
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedMonth}
            onValueChange={setSelectedMonth}
            style={styles.picker}
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
          >
            {/* Years, for example from 2024 to 2026 */}
            {availableYears.map(year => (
              <Picker.Item key={year} label={year} value={year} />
            ))}

          </Picker>
        </View>


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
            {renderMonthSummary()}
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

      </ScrollView>
    </SafeAreaView>
  );
};

export default ReportsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 32 },
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
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  headerCell: {
    flex: 1,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#311847',
  },
  currentDayRow: {
    backgroundColor: '#fb9e46',
    fontWeight: 'bold',
  },
  holidayRow: {
    flexDirection: 'row',
    backgroundColor: '#ffe6f0',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#311847',
    alignItems: 'center',
  },
  cell: {
    flex: 1,
    textAlign: 'center',
    color: '#000',
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#311847',
    paddingVertical: 10,
  },
  totalCell: {
    flex: 1,
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
    justifyContent: 'space-evenly',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
    elevation: 2,
    marginHorizontal: 12,
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
  
  
  
});

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';


const CalculatorView = ({ onClose }) => {
  const [calcRows, setCalcRows] = useState([]);

  const addRow = () => {
    setCalcRows(prev => {
      const updated = [...prev];
      if (updated.length > 0) {
        const lastIndex = updated.length - 1;
        updated[lastIndex].locked = true; // lock current row
      }
      updated.push({ id: Date.now(), item: '', quantity: '', rate: '', locked: false });
      return updated;
    });
  };
  

  const removeRow = (id) => {
    setCalcRows(prev => prev.filter(row => row.id !== id));
  };

  const updateRow = (id, key, value) => {
    setCalcRows(prev =>
      prev.map(row =>
        row.id === id ? { ...row, [key]: value } : row
      )
    );
  };

  const clearAll = () => setCalcRows([]);

  const calculateTotal = (row) =>
    (parseFloat(row.quantity) || 0) * (parseFloat(row.rate) || 0);

  const grandTotal = calcRows.reduce((acc, row) => acc + calculateTotal(row), 0);

  // const exportToExcel = async () => {
  //   // Implement Excel export here
  //   Toast.show('Excel export not implemented yet.', {
  //     duration: Toast.durations.SHORT,
  //     position: Toast.positions.BOTTOM,
  //   });
  // };

  return (

    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
            style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#311847',
                marginBottom: 12,
                textAlign: 'center',
            }}
            >
            Stock Value Calculator
        </Text>
  
      {calcRows.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Image
            source={require('../assets/table.png')}
            style={{ width: '90%', height: 250, resizeMode: 'contain' }}
            />
            <Text style={{
            color: '#311847',
            fontSize: 16,
            fontWeight: '600',
            marginTop: 16,
            textAlign: 'center'
            }}>
            This is your Stock workspace
            </Text>

            <TouchableOpacity onPress={addRow} style={{ marginTop: 20 }}>
            <Ionicons name="add-circle" size={28} color="#d90368" />
            </TouchableOpacity>
        </View>
        ) : (
        <>
            {/* Table Header */}
            <View style={{
                flexDirection: 'row',
                marginBottom: 8,
                paddingBottom: 6,
                borderBottomWidth: 2,
                borderBottomColor: '#311847'
                }}>
                <Text style={{ fontWeight: 'bold', flex: 2 }}>Item</Text>
                <Text style={{ fontWeight: 'bold', flex: 1 }}>Qty</Text>
                <Text style={{ fontWeight: 'bold', flex: 1 }}>Rate</Text>
                <Text style={{ fontWeight: 'bold', flex: 1 }}>Total</Text>
            </View>


            {/* Input Rows */}
            {calcRows.map((row, index) => {

            return (
                <View
                  key={row.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 6,
                    borderBottomWidth: 1,
                    borderBottomColor: '#ccc',
                    paddingBottom: 6,
                  }}
                >
                  {row.locked ? (
                    <>
                      <Text style={{ flex: 2 }}>{row.item}</Text>
                      <Text style={{ flex: 1 }}>{row.quantity}</Text>
                      <Text style={{ flex: 1 }}>{row.rate}</Text>
                      <Text style={{ flex: 1 }}>{calculateTotal(row).toFixed(0)}</Text>
                    </>
                  ) : (
                    <>
                      <TextInput
                        placeholder="Item"
                        value={row.item}
                        onChangeText={(text) => updateRow(row.id, 'item', text)}
                        style={{ flex: 2, borderWidth: 1, borderColor: '#ccc', padding: 6, borderRadius: 6 }}
                      />
                      <TextInput
                        placeholder="Qty"
                        keyboardType="numeric"
                        value={row.quantity}
                        onChangeText={(text) => updateRow(row.id, 'quantity', text)}
                        style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', marginLeft: 6, padding: 6, borderRadius: 6 }}
                      />
                      <TextInput
                        placeholder="Rate"
                        keyboardType="numeric"
                        value={row.rate}
                        onChangeText={(text) => updateRow(row.id, 'rate', text)}
                        style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', marginLeft: 6, padding: 6, borderRadius: 6 }}
                      />
                      <Text style={{ flex: 1, marginLeft: 6 }}>{calculateTotal(row).toFixed(0)}</Text>
                    </>
                  )}
              
                  <TouchableOpacity onPress={() => removeRow(row.id)}>
                    <Ionicons name="remove-circle" size={20} color="red" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
              
                  {!row.locked && index === calcRows.length - 1 && (
                    <TouchableOpacity onPress={addRow}>
                      <Ionicons name="add-circle" size={20} color="#d90368" style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  )}
                </View>
              );
              
            })}

        </>
        )}


      {/* Totals and Controls */}
      <View style={{ marginTop: 16 }}>
        {calcRows.length > 0 && (
            <>
                <Text style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'right' }}>
                Grand Total: ₹ {grandTotal.toFixed(0)}
                </Text>

                <TouchableOpacity
                onPress={clearAll}
                style={{ marginTop: 10, backgroundColor: '#eb7100', padding: 12, borderRadius: 10 }}
                >
                <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>Clear Table</Text>
                </TouchableOpacity>

                
            </>
        )}
        

        <TouchableOpacity
          onPress={onClose}
          style={{ marginTop: 10, backgroundColor: '#311847', padding: 12, borderRadius: 10 }}
        >
          <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>Close Calculator</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </View>
  );
};

export default CalculatorView;

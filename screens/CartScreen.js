import React, { useContext, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { CartContext } from '../context/Cart';
import { InventoryContext } from '../context/InventoryContext';
import {
  readDocuments,
  updateDocument,
  createDocument,
  deleteDocument,
} from '../database/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const CartScreen = () => {
  const { inventory } = useContext(InventoryContext);
  const [loading, setLoading] = useState(true);

  const { carts, setCarts } = useContext(CartContext);
  const [modalVisible, setModalVisible] = useState(false);
  const [editCartId, setEditCartId] = useState(null);

  const [address, setAddress] = useState('');
  const loadAndCorrectCarts = async () => {
    setLoading(true);
    try {
      const fetchedCarts = await readDocuments('kulfiCarts');
  
      const corrected = await Promise.all(fetchedCarts.map(async cart => {
        const stickQty = cart.inventory?.stick || 0;
        const plateQty = cart.inventory?.plate || 0;
        const totalQty = stickQty + plateQty;
  
        const shouldBeOpen = totalQty > 0;
        const isCurrentlyOpen = cart.status === 'open';
  
        if (shouldBeOpen !== isCurrentlyOpen) {
          const newStatus = shouldBeOpen ? 'open' : 'closed';
          const updateData = {
            status: newStatus,
            ...(newStatus === 'open' && !cart.openedAt
              ? { openedAt: new Date().toISOString() }
              : {}),
          };
  
          await updateDocument('kulfiCarts', cart.id, updateData);
          return { ...cart, ...updateData };
        }
  
        return cart;
      }));
  
      setCarts(corrected);
    } catch (error) {
      console.error('❌ Error loading carts:', error);
    } finally {
      setLoading(false);
    }
  };
  
  

  useFocusEffect(
    useCallback(() => {
      loadAndCorrectCarts();
    }, [])
  );
  

  const openAddModal = () => {
    setEditCartId(null);
    setAddress('');
    setModalVisible(true);
  };
  

  const openEditModal = (cart) => {
    setEditCartId(cart.id);
    setAddress(cart.address);
    setModalVisible(true);
  };
  

  const handleSave = async () => {
  
    const cartData = {
      address,
    };
  
    try {
      if (editCartId) {
        await updateDocument('kulfiCarts', editCartId, cartData);
      } else {
        await createDocument('kulfiCarts', cartData);
      }
  
      setModalVisible(false);
      loadAndCorrectCarts();
    } catch (error) {
      Alert.alert('Error', 'Failed to save cart.');
    }
  };
  

  const handleDelete = async (id) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this cart?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDocument('kulfiCarts', id);
            loadAndCorrectCarts();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete cart.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const isOpen = item.status === 'open';
    let openedAgo = '';
    if (isOpen && item.openedAt) {
      openedAgo = formatDistanceToNow(new Date(item.openedAt), { addSuffix: true });
    }

    

    const stickQty = item.inventory?.stick || 0;
    const plateQty = item.inventory?.plate || 0;
  
    const stickCost = inventory?.stick?.costPrice || 0;
    const plateCost = inventory?.plate?.costPrice || 0;

    const stickValue = stickQty * stickCost;
    const plateValue = plateQty * plateCost;

  
    const totalQty = stickQty + plateQty;
    const totalValue = stickValue + plateValue;
  
    return (
      <View style={[styles.card, isOpen ? styles.cardOpen : styles.cardClosed]}>        

        <View style={{ flex: 1 }}>
          <Text style={[
            styles.statusBadge,
            isOpen ? [styles.openBadge, { color: '#2e7d32' }] : [styles.closedBadge, { color: '#555' }]
          ]}>
            {isOpen ? 'OPEN' : 'CLOSED'}
          </Text>
            {isOpen && openedAgo && (
              <Text style={styles.openedAtText}>Opened {openedAgo}</Text>
            )}

          {/* <Text style={styles.cardTitle}>Cart ID: {item.id}</Text> */}
          <Text style={styles.cardTitle}>Cart ID: {item.address}</Text>
          <Text style={styles.cardText}>🟠 Stick: {stickQty} pcs | ₹{stickValue}</Text>
          <Text style={styles.cardText}>🟣 Plate: {plateQty} pcs | ₹{plateValue}</Text>
          <Text style={[styles.cardText, { fontWeight: 'bold', marginTop: 4 }]}>
            Total: {totalQty} pcs | ₹{totalValue}
          </Text>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={() => openEditModal(item)}>
            <MaterialCommunityIcons name="pencil" size={24} color="#eb7100" />
          </TouchableOpacity>

          {!isOpen && (
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <MaterialCommunityIcons name="delete" size={24} color="#d90368" />
            </TouchableOpacity>
          )}
        </View>

      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.spinnerContainer}>
        <ActivityIndicator size="large" color="#d90368" />
      </View>
    );
  }
  
  

  return (
    <SafeAreaView style={{flex: 1}}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <MaterialCommunityIcons name="plus-circle" size={28} color="#fff" />
          <Text style={styles.addText}>Add Cart</Text>
        </TouchableOpacity>

        

        <FlatList
          data={[...carts].sort((a, b) => {
            const aOpen = a.status === 'open';
            const bOpen = b.status === 'open';
            return aOpen === bOpen ? 0 : aOpen ? -1 : 1;
          })}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
        />


        {/* Modal */}
        <Modal
          animationType="slide"
          transparent
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>
                {editCartId ? 'Edit Cart' : 'Add New Cart'}
              </Text>

              

              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter address"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalButton} onPress={handleSave}>
                  <Text style={styles.modalButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default CartScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 32,
  },
  card: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'column',
    marginBottom: 12,
    alignItems: 'center',
    textAlign: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 24,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: '#000',
  },
  cardText: {
    fontSize: 14,
    color: '#311847',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d90368',
    padding: 12,
    borderRadius: 12,
    justifyContent: 'center',
    marginBottom: 16,
  },
  addText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#d90368',
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 10,
    marginBottom: 4,
    color: '#311847',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  modalButton: {
    backgroundColor: '#eb7100',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#d90368',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  spinnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardOpen: {
    borderLeftWidth: 4,
    borderLeftColor: '#00C851',
    backgroundColor: '#f0fff5',
  },
  
  cardClosed: {
    borderLeftWidth: 4,
    borderLeftColor: '#888',
    backgroundColor: '#f9f9f9',
  },
  
  statusBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 6,
    overflow: 'hidden',
  },
  
  openBadge: {
    backgroundColor: '#c8f7c5',
    color: '#2e7d32',
  },
  
  closedBadge: {
    backgroundColor: '#e0e0e0',
    color: '#555',
  },
  openedAtText: {
    fontSize: 12,
    color: '#333',
    marginTop: 2,
  },
  
  
  
});

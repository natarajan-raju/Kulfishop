import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { updateDocument } from '../database/firebase';

const KulfiCard = ({ type, iconName, inventory, setInventory, documentId }) => {
  const [modalVisible, setModalVisible] = useState(false);
  // const [quantity, setQuantity] = useState(inventory?.quantity?.toString() || '0');
  const [costPrice, setCostPrice] = useState(inventory?.costPrice?.toString() || '0');
  const [sellingPrice, setSellingPrice] = useState(inventory?.sellingPrice?.toString() || '0');
  const quantity = inventory?.quantity?.toString() || '0';

  const openModal = () => {
    // setQuantity(inventory?.quantity?.toString() || '0');
    setCostPrice(inventory?.costPrice?.toString() || '0');
    setSellingPrice(inventory?.sellingPrice?.toString() || '0');
    setModalVisible(true);
  };

  const handleSave = async () => {
    const updatedData = {
      quantity: parseInt(quantity),
      costPrice: parseFloat(costPrice),
      sellingPrice: parseFloat(sellingPrice),
    };

    try {
      await updateDocument('warehouseInventory', documentId, updatedData);

      setInventory(prev => ({
      ...prev,
      [type.toLowerCase()]: updatedData,
    }));


      Alert.alert('Success', `${type} Kulfi updated.`);
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error', `Failed to update ${type} Kulfi.`);
    }
  };

  return (
    <>
      <View 
        style={styles.card}
      >
        <View style={styles.iconSection}>
          <MaterialCommunityIcons name={iconName} size={48} color="#eb7100" />
          <Text style={styles.kulfiType}>{type}</Text>
        </View>
        <View style={styles.dataSection}>
          <Text style={styles.quantity}>{inventory?.quantity ?? 0} pcs</Text>
          {/* <Text style={styles.price}>Cost: ₹{inventory?.costPrice ?? 0}</Text> */}
          <Text style={styles.price}>Price: ₹{inventory?.sellingPrice ?? 0}</Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={openModal}>
          <MaterialCommunityIcons name="pencil-circle-outline" size={32} color="#007aff" />
        </TouchableOpacity>
      </View>

      {/* Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit {type} Kulfi</Text>

            {/* <Text style={styles.inputLabel}>Quantity</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="Enter Quantity"
              value={quantity}
              onChangeText={setQuantity}
            /> */}

            {/* <Text style={styles.inputLabel}>Cost Price</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="Enter Cost Price"
              value={costPrice}
              onChangeText={setCostPrice}
            /> */}

            <Text style={styles.inputLabel}>Price</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="Enter Selling Price"
              value={sellingPrice}
              onChangeText={setSellingPrice}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={handleSave}>
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default KulfiCard;

// Styles remain unchanged below...


const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#eef0f2',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  iconSection: {
    alignItems: 'center',
    marginRight: 16,
  },
  kulfiType: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  dataSection: {
    flex: 1,
    justifyContent: 'center',
  },
  quantity: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    color: '#666',
  },
  editButton: {
    marginLeft: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    width: '85%',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  modalButton: {
    backgroundColor: '#007aff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#ff4d4d',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

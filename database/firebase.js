import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';

// ✅ Firebase config


// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 📦 Generic CRUD Functions

// Create a new document in a collection
export const createDocument = async (collectionName, data) => {
  try {
    const colRef = collection(db, collectionName);
    const docRef = await addDoc(colRef, data);
    return { id: docRef.id, ...data };
  } catch (error) {
    console.error(`❌ Error creating document in ${collectionName}:`, error);
    throw error;
  }
};

// Read all documents from a collection
export const readDocuments = async (collectionName) => {
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`❌ Error reading documents from ${collectionName}:`, error);
    throw error;
  }
};

// Generic update function using setDoc with merge
export const updateDocument = async (collectionName, id, updatedData) => {
  try {
    const docRef = doc(db, collectionName, id);
    // setDoc with { merge: true } creates or updates the document
    await setDoc(docRef, updatedData, { merge: true });
    return true;
  } catch (error) {
    console.error(`❌ Error updating document in ${collectionName}:`, error);
    throw error;
  }
};

// Delete a document in a collection by ID
export const deleteDocument = async (collectionName, id) => {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error(`❌ Error deleting document from ${collectionName}:`, error);
    throw error;
  }
};



export { db};

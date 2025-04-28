import React from 'react';
import AppNavigator from './navigation/AppNavigator';
import { InventoryProvider } from './context/InventoryContext';
import { CartProvider } from './context/Cart';
import { ReportsProvider } from './context/ReportsContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <InventoryProvider>
        <CartProvider>
          <ReportsProvider>
            <AppNavigator />
          </ReportsProvider>
        </CartProvider>
      </InventoryProvider>
    </SafeAreaProvider>
  );
}


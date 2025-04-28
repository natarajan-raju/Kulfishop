import React, { createContext, useState } from 'react';

export const InventoryContext = createContext();

export const InventoryProvider = ({ children }) => {
  const [inventory, setInventory] = useState({
    // Initial state for Stick Kulfi (can add more types later if needed)
    stick: {
      quantity: 0,
      costPrice: 0,
      sellingPrice: 0,
    },
    plate: {
      quantity: 0,
      costPrice: 0,
      sellingPrice: 0,
    },
    // Future inventory types can be added here.
  });

  return (
    <InventoryContext.Provider value={{ inventory, setInventory }}>
      {children}
    </InventoryContext.Provider>
  );
};

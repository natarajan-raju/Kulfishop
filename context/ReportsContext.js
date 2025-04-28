import React, { createContext, useContext, useState, useEffect } from 'react';
import { readDocuments, createDocument, updateDocument } from '../database/firebase';

const ReportsContext = createContext();

export const useReports = () => useContext(ReportsContext);

export const ReportsProvider = ({ children }) => {
  

  return (
    <ReportsContext.Provider value={{  }}>
      {children}
    </ReportsContext.Provider>
  );
};

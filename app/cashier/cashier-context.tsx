'use client';

import { createContext, useContext, ReactNode } from 'react';

interface CashierContextValue {
  email: string;
  fullName: string;
  branch: string;
}

const CashierContext = createContext<CashierContextValue | null>(null);

export function CashierProvider({
  children,
  email,
  fullName,
  branch,
}: {
  children: ReactNode;
  email: string;
  fullName: string;
  branch: string;
}) {
  return (
    <CashierContext.Provider value={{ email, fullName, branch }}>
      {children}
    </CashierContext.Provider>
  );
}

export function useCashierContext() {
  const value = useContext(CashierContext);
  if (!value) {
    throw new Error('useCashierContext must be used within CashierProvider');
  }
  return value;
}

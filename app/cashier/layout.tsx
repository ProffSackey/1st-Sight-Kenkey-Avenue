'use client';

import { ReactNode, useState } from 'react';
import { useCashierAuthGuard } from './_components/use-cashier-auth-guard';
import { CashierProvider } from './cashier-context';
import CashierNavbar from './_components/cashier-navbar';
import CashierSidebar from './_components/cashier-sidebar';

export default function CashierLayout({ children }: { children: ReactNode }) {
  const { email, fullName, branch, isLoading } = useCashierAuthGuard();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm font-medium text-slate-600">Loading cashier account...</p>
      </main>
    );
  }

  return (
    <CashierProvider email={email} fullName={fullName} branch={branch}>
      <CashierNavbar email={email} userName={fullName} branch={branch} />
      <div className="flex min-h-[calc(100vh-80px)] bg-slate-100">
        <CashierSidebar
          fullName={fullName}
          branch={branch}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </CashierProvider>
  );
}

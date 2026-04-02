'use client';

import { Dispatch, SetStateAction } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface CashierSidebarProps {
  fullName?: string;
  branch?: string;
  isSidebarOpen: boolean;
  setIsSidebarOpen: Dispatch<SetStateAction<boolean>>;
}

export default function CashierSidebar({ fullName, branch, isSidebarOpen, setIsSidebarOpen }: CashierSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const navLinks = [
    { path: '/cashier', label: 'New Order', icon: '🛒' },
    { path: '/cashier/items', label: 'Items', icon: '📦' },
    { path: '/cashier/orders', label: 'Order History', icon: '📜' },
  ];

  return (
    <aside className={`hidden lg:block rounded-none border-r border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-20 lg:max-h-[calc(100vh-5rem)] ${isSidebarOpen ? 'w-64' : 'w-20'} overflow-y-auto`}>
      <div className="mb-4 flex items-center justify-between">
        {isSidebarOpen ? (
          <div>
            <h2 className="text-base font-semibold text-slate-900">Cashier</h2>
            <p className="text-xs text-slate-500">Quick navigation</p>
          </div>
        ) : (
          <div className="text-center"></div>
        )}
        <button
          type="button"
          onClick={() => setIsSidebarOpen((cur) => !cur)}
          className="h-8 w-8 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isSidebarOpen ? '«' : '»'}
        </button>
      </div>

      {isSidebarOpen && (
        <div className="mt-2 rounded-lg bg-emerald-50 p-3 text-sm text-slate-700 shadow-inner">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Staff</p>
          <p className="mt-1 text-base font-semibold text-slate-900">{fullName ?? 'Cashier'}</p>
          <p className="text-xs font-medium text-slate-500">{branch ?? 'Branch'}</p>
        </div>
      )}

      <nav className="mt-4 space-y-2">
        {navLinks.map((link) => {
          const isActive = pathname === link.path;
          return (
            <button
              key={link.path}
              onClick={() => router.push(link.path)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition ${isSidebarOpen ? 'justify-start text-left' : 'justify-center'} ${isActive ? 'bg-amber-100 text-amber-700' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <span className="h-7 w-7 rounded-lg bg-slate-100 text-center text-sm leading-7">{link.icon}</span>
              {isSidebarOpen && <span>{link.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

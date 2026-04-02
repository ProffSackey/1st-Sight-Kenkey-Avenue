'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AccountPasswordModal } from '@/app/_components/account-password-modal';

const sidebarItems = [
  {
    label: 'Home',
    href: '/admin',
    description: 'Dashboard overview',
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M3.75 12 12 5.25 20.25 12M5.25 10.8v8.45h13.5V10.8"
        />
      </svg>
    ),
  },
  {
    label: 'Items',
    href: '/admin/items',
    description: 'Stock and catalog',
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M4.5 7.5 12 3.75l7.5 3.75M4.5 7.5 12 11.25m-7.5-3.75v9L12 20.25m0-9 7.5-3.75v9L12 20.25m0-9v9"
        />
      </svg>
    ),
  },
  {
    label: 'Employee',
    href: '/admin/employees',
    description: 'Team access and roles',
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M18 18.75a6 6 0 0 0-12 0M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
        />
      </svg>
    ),
  },
  {
    label: 'Orders',
    href: '/admin/orders',
    description: 'Sales and fulfillment',
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M7.5 6.75h9m-9 4.5h9m-9 4.5h5.25M6.75 3.75h10.5a1.5 1.5 0 0 1 1.5 1.5v13.5a1.5 1.5 0 0 1-1.5 1.5H6.75a1.5 1.5 0 0 1-1.5-1.5V5.25a1.5 1.5 0 0 1 1.5-1.5Z"
        />
      </svg>
    ),
  },
  {
    label: 'Branches',
    href: '/admin/branches',
    description: 'Locations and coverage',
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M12 21s6-5.686 6-11.25a6 6 0 1 0-12 0C6 15.314 12 21 12 21Zm0-8.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
        />
      </svg>
    ),
  },
  {
    label: 'Reports and Analytics',
    href: '/admin/reports',
    description: 'Performance insights',
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M7.5 15V18m4.5-7.5V18m4.5-10.5V18M4.5 20.25h15"
        />
      </svg>
    ),
  },
];

type AdminShellProps = {
  children: ReactNode;
  email: string;
  fullName: string;
};

export function AdminShell({ children, email, fullName }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    const syncSidebar = () => {
      setIsSidebarOpen(window.innerWidth >= 1024);
    };

    syncSidebar();
    window.addEventListener('resize', syncSidebar);

    return () => {
      window.removeEventListener('resize', syncSidebar);
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
    router.refresh();
  };

  const handleOpenPasswordModal = () => {
    setIsMenuOpen(false);
    setPasswordError(null);
    setIsResetPasswordOpen(true);
  };

  const handleClosePasswordModal = () => {
    if (isUpdatingPassword) return;
    setPasswordError(null);
    setIsResetPasswordOpen(false);
  };

  const handleResetPassword = async (newPassword: string) => {
    setIsUpdatingPassword(true);
    setPasswordError(null);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordError(error.message || 'Unable to update password.');
      setIsUpdatingPassword(false);
      return;
    }

    await supabase.auth.signOut();
    setIsUpdatingPassword(false);
    setIsResetPasswordOpen(false);
    router.replace('/');
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {isResetPasswordOpen && (
        <AccountPasswordModal
          accountLabel={fullName || 'your administrator account'}
          onClose={handleClosePasswordModal}
          onSubmit={handleResetPassword}
          isSubmitting={isUpdatingPassword}
          errorMessage={passwordError}
        />
      )}

      <header className="sticky top-0 z-40 border-b border-slate-900/10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-4 py-2.5 shadow-lg sm:px-6 sm:py-2">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3 sm:gap-2.5">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((current) => !current)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/8 text-slate-200 transition-colors hover:bg-white/12 hover:text-white lg:hidden"
              aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              aria-expanded={isSidebarOpen}
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isSidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m6 6 12 12M18 6 6 18" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.5 6.75h15m-15 5.25h15m-15 5.25h15" />
                )}
              </svg>
            </button>
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/10 shadow-lg backdrop-blur sm:h-10 sm:w-10 sm:rounded-lg">
              <Image
                src="/inno.jpeg"
                alt="1ST SIGHT KENKEY AVENUE"
                width={44}
                height={44}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h1 className="truncate text-sm font-semibold tracking-[0.08em] text-white sm:text-xl">
                1ST SIGHT KENKEY AVENUE
              </h1>
            </div>
          </div>

          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((current) => !current)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-2 py-2 text-left text-white backdrop-blur transition-colors hover:bg-white/12 sm:w-full sm:gap-2 sm:px-2.5 sm:py-1.5"
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-500 text-sm font-semibold text-slate-950 shadow-md sm:h-8 sm:w-8 sm:text-xs">
                {fullName.charAt(0).toUpperCase()}
              </span>
              <div className="hidden sm:block">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Administrator</p>
                <p className="text-sm font-semibold leading-tight text-white">{fullName}</p>
                <p className="text-xs leading-tight text-slate-400">{email}</p>
              </div>
              <svg
                aria-hidden="true"
                className={`hidden h-4 w-4 text-slate-300 transition-transform sm:ml-2 sm:block ${isMenuOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 z-20 mt-3 min-w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                <button
                  type="button"
                  onClick={handleOpenPasswordModal}
                  className="flex w-full items-center rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Settings
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center rounded-xl px-4 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-0 pt-0 pb-6">
        {isSidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar overlay"
            className="fixed inset-0 z-20 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-30 w-[17rem] transform border-r border-slate-200 bg-white transition-transform duration-300 lg:sticky lg:top-24 lg:left-auto lg:z-20 lg:h-auto lg:max-h-[calc(100vh-6rem)] lg:shrink-0 lg:self-start lg:rounded-none lg:border lg:shadow-[0_10px_30px_-24px_rgba(15,23,42,0.28)] ${
            isSidebarOpen ? 'translate-x-0 lg:w-64' : '-translate-x-full lg:w-20 lg:translate-x-0'
          }`}
        >
          <div className="flex h-full min-h-0 flex-col overflow-hidden px-3 py-4 lg:px-4 lg:py-5">
            <div
              className={`flex items-center border-b border-slate-200/80 pb-5 ${
                isSidebarOpen ? 'justify-between' : 'justify-center'
              }`}
            >
              {isSidebarOpen && (
                <div>
                  <p className="text-lg font-semibold tracking-tight text-slate-900">Menu</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Navigation Panel
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsSidebarOpen((current) => !current)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isSidebarOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m6 6 12 12M18 6 6 18" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.5 6.75h15m-15 5.25h15m-15 5.25h15" />
                  )}
                </svg>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto pt-5">
              <div className="space-y-2 pb-14">
                {sidebarItems.map((item, index) => {
                  const isActive = item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href);
                  const isLastItem = index === sidebarItems.length - 1;

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => {
                        if (window.innerWidth < 1024) {
                          setIsSidebarOpen(false);
                        }
                      }}
                      title={!isSidebarOpen ? item.label : undefined}
                      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                        isActive
                          ? 'bg-yellow-50 text-slate-950 ring-1 ring-yellow-200'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                      } ${isSidebarOpen ? '' : 'justify-center px-2'} ${isLastItem ? 'mb-6' : ''}`}
                    >
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                          isActive
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                        }`}
                      >
                        {item.icon}
                      </span>
                      {isSidebarOpen && (
                        <>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-current">{item.label}</p>
                            <p className="truncate text-xs text-slate-400">{item.description}</p>
                          </div>
                          {isActive && <span className="h-2 w-2 rounded-full bg-yellow-500" />}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        </aside>

        {children}
      </div>
    </main>
  );
}

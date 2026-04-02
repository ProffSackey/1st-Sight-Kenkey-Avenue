'use client';

import { useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AccountPasswordModal } from '@/app/_components/account-password-modal';

interface CashierNavbarProps {
  email: string;
  userName?: string;
  branch?: string;
}

export default function CashierNavbar({ email, userName, branch }: CashierNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const mobileNavLinks = [
    { path: '/cashier', label: 'New Order', icon: 'Cart' },
    { path: '/cashier/items', label: 'Items', icon: 'Box' },
    { path: '/cashier/orders', label: 'Order History', icon: 'List' },
  ];

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.replace('/');
      router.refresh();
    } catch (error) {
      console.log('Sign out error:', error);
      setIsSigningOut(false);
    }
  };

  const getUserInitials = () => {
    if (userName) {
      return userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || 'U';
  };

  const handleOpenPasswordModal = () => {
    setDropdownOpen(false);
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

    setIsUpdatingPassword(false);
    setIsResetPasswordOpen(false);
  };

  const handleNavigate = (path: string) => {
    setIsMenuOpen(false);
    router.push(path);
  };

  return (
    <>
      {isResetPasswordOpen && (
        <AccountPasswordModal
          accountLabel={userName || 'your cashier account'}
          onClose={handleClosePasswordModal}
          onSubmit={handleResetPassword}
          isSubmitting={isUpdatingPassword}
          errorMessage={passwordError}
        />
      )}

      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500">
              <Image
                src="/inno.jpeg"
                alt="Logo"
                width={40}
                height={40}
                className="rounded-lg object-cover"
              />
            </div>
            <div className="hidden sm:block">
              <h2 className="text-lg font-bold text-slate-900">1ST SIGHT KENKEY</h2>
              <p className="text-xs text-slate-500">Cashier Portal</p>
            </div>
          </div>

          {/* Center: Status Indicator */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-emerald-700">Ready to Serve</span>
          </div>

          {/* Right: User Menu */}
          <div className="flex items-center gap-4">
            {/* User Info (Desktop) */}
            <div className="hidden sm:flex items-center gap-3 relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 bg-slate-100 py-1.5 px-3 rounded-full hover:bg-slate-200 transition"
                aria-label="User settings"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">{getUserInitials()}</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-900">{userName || 'Cashier'}</p>
                  {branch && <p className="text-xs text-slate-400">Branch: {branch}</p>}
                </div>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg z-30">
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenPasswordModal();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      handleSignOut();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="sm:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="sm:hidden border-t border-slate-200 py-4 space-y-3">
            <div className="px-4 py-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-900">{userName || 'Cashier'}</p>
              <p className="text-xs text-slate-500 mt-1">{email}</p>
              {branch && <p className="text-xs text-slate-400 mt-1">Branch: {branch}</p>}
            </div>
            <div className="space-y-2">
              {mobileNavLinks.map((link) => {
                const isActive = pathname === link.path;

                return (
                  <button
                    key={link.path}
                    type="button"
                    onClick={() => handleNavigate(link.path)}
                    className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 font-medium transition-colors ${
                      isActive
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{link.label}</span>
                    <span className="text-xs uppercase tracking-wide text-slate-400">{link.icon}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleOpenPasswordModal}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15.75A3.75 3.75 0 1 0 12 8.25a3.75 3.75 0 0 0 0 7.5Z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 12a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
              </svg>
              <span>Settings</span>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full px-4 py-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-red-200 flex items-center justify-center gap-2"
            >
              {isSigningOut ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign Out</span>
                </>
              )}
            </button>
          </div>
          )}
        </div>
      </nav>
    </>
  );
}

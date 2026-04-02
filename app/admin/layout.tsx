'use client';

import { ReactNode } from 'react';
import { AdminShell } from '@/app/admin/_components/admin-shell';
import { useAdminAuthGuard } from '@/app/admin/_components/use-admin-auth-guard';

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { email, fullName, isLoading, loadingMessage } = useAdminAuthGuard('Loading admin page...');

  if (isLoading) {
    return <main className="flex min-h-screen items-center justify-center">{loadingMessage}</main>;
  }

  return <AdminShell email={email} fullName={fullName}>{children}</AdminShell>;
}

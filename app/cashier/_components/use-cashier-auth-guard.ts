'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getRouteForRole } from '@/lib/roles';

export function useCashierAuthGuard(loadingFallback = 'Loading cashier page...') {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [branch, setBranch] = useState('');
  const [loadingMessage, setLoadingMessage] = useState(loadingFallback);

  useEffect(() => {
    let isMounted = true;

    const guardPage = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;
        if (!session?.user?.id) {
          router.replace('/');
          return;
        }

        if (!session.access_token) {
          router.replace('/');
          return;
        }

        const profileResponse = await fetch('/api/auth/profile', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!profileResponse.ok) {
          router.replace('/');
          return;
        }
        const employee = (await profileResponse.json()) as {
          role?: string | null;
          fullName?: string | null;
          status?: string | null;
          branchName?: string | null;
        };

        const isActive = employee?.status?.trim().toLowerCase() === 'active';
        if (!isActive) {
          router.replace('/');
          return;
        }

        const route = getRouteForRole(employee?.role);
        if (!route) {
          router.replace('/');
          return;
        }

        if (route !== '/cashier') {
          router.replace(route);
          return;
        }

        setEmail(session.user.email || '');
        setFullName(employee?.fullName || 'Cashier');
        setBranch(employee?.branchName || '');
        setLoadingMessage(loadingFallback);
        setIsLoading(false);
      } catch {
        if (isMounted) {
          setIsLoading(false);
          router.replace('/');
        }
      }
    };

    void guardPage();

    return () => {
      isMounted = false;
    };
  }, [loadingFallback, router]);

  return { email, fullName, branch, isLoading, loadingMessage };
}

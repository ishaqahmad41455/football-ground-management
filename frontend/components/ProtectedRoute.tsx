'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Spinner } from './ui';

const LOGIN_PATH_BY_ROLE: Record<string, string> = {
  admin: '/admin/login',
  ground_owner: '/ground-owner/login',
  team: '/login',
};

export default function ProtectedRoute({
  role,
  children,
}: {
  role: 'team' | 'admin' | 'ground_owner';
  children: React.ReactNode;
}) {
  const { role: currentRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && currentRole !== role) {
      router.replace(LOGIN_PATH_BY_ROLE[role] || '/login');
    }
  }, [loading, currentRole, role, router]);

  if (loading || currentRole !== role) {
    return <Spinner label="Checking your session…" />;
  }
  return <>{children}</>;
}

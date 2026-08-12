'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Spinner } from './ui';

export default function ProtectedRoute({
  role,
  children,
}: {
  role: 'team' | 'admin';
  children: React.ReactNode;
}) {
  const { role: currentRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && currentRole !== role) {
      router.replace(role === 'admin' ? '/admin/login' : '/login');
    }
  }, [loading, currentRole, role, router]);

  if (loading || currentRole !== role) {
    return <Spinner label="Checking your session…" />;
  }
  return <>{children}</>;
}

'use client';

import { usePathname } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminSidebar from '@/components/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/admin/login') return <>{children}</>;

  return (
    <ProtectedRoute role="admin">
      <div className="max-w-7xl mx-auto px-5 py-8 flex gap-8">
        <AdminSidebar />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </ProtectedRoute>
  );
}

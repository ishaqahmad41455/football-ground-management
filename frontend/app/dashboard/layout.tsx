'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardSidebar from '@/components/DashboardSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute role="team">
      <div className="max-w-7xl mx-auto px-5 py-8 flex gap-8">
        <DashboardSidebar />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </ProtectedRoute>
  );
}

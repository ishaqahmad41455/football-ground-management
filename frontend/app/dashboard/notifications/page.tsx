'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { EmptyState, Spinner } from '@/components/ui';

interface Notification {
  id: number;
  type: string;
  message: string;
  read: boolean;
  createdAt: number;
}

const ICONS: Record<string, string> = {
  invitation: '✉',
  invitation_accepted: '✅',
  invitation_rejected: '❌',
  payment_success: '💳',
  match_confirmed: '🏆',
  result_submitted: '📊',
};

export default function NotificationsPage() {
  const { team } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!team) return;
    api<Notification[]>('/notifications/mine').then((n) => {
      setNotifications(n);
      setLoading(false);
      n.filter((x) => !x.read).forEach((x) => api(`/notifications/${x.id}/read`, { method: 'POST' }).catch(() => {}));
    });
  }, [team]);

  if (loading) return <Spinner />;

  return (
    <div>
      <h1 className="font-display font-bold text-2xl">Notifications</h1>
      <p className="text-mist-500 text-sm mt-1">Everything that needs your attention, in one place.</p>

      <div className="mt-8">
        {notifications.length === 0 ? (
          <EmptyState title="You're all caught up" description="New challenges, payments, and match updates will appear here." />
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className={`glass rounded-xl p-4 flex items-start gap-3 ${!n.read ? 'border-pitch-500/25' : ''}`}>
                <span className="text-lg">{ICONS[n.type] || '🔔'}</span>
                <div>
                  <p className="text-sm">{n.message}</p>
                  <p className="text-xs text-mist-700 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

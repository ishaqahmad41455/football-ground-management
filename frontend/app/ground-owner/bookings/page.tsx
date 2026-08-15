'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Badge, Spinner, EmptyState } from '@/components/ui';

interface Booking {
  id: number;
  venueId: number;
  date: string;
  time: string;
  matchType: string;
  status: string;
  teamId: number;
  opponentTeamId: number | null;
}

export default function GroundOwnerBookingsPage() {
  const { venues } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Booking[]>('/ground-owner/bookings').then((b) => {
      setBookings(b.sort((a, c) => c.id - a.id));
      setLoading(false);
    });
  }, []);

  const venueName = (id: number) => venues.find((v: any) => v.id === id)?.name || `Ground #${id}`;

  if (loading) return <Spinner />;

  return (
    <div>
      <h1 className="font-display font-bold text-2xl">Bookings</h1>
      <p className="text-mist-500 text-sm mt-1">Every slot reserved, invited, or confirmed at your ground(s).</p>

      <div className="mt-6">
        {bookings.length === 0 ? (
          <EmptyState title="No bookings yet" description="Slot reservations at your ground will appear here." />
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="glass rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm">{venueName(b.venueId)}</div>
                  <div className="text-xs text-mist-500 mt-1">
                    {b.date} · {b.time} · {b.matchType}
                  </div>
                </div>
                <Badge
                  tone={
                    b.status === 'confirmed'
                      ? 'success'
                      : b.status === 'cancelled' || b.status === 'expired'
                      ? 'danger'
                      : 'warning'
                  }
                >
                  {b.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { Badge, EmptyState, PrimaryButton, SecondaryButton, Spinner } from '@/components/ui';

interface Invitation {
  id: number;
  bookingId: number;
  fromTeamId: number;
  toTeamId: number;
  status: string;
  message: string;
  createdAt: number;
}
interface Booking {
  id: number;
  venueId: number;
  date: string;
  time: string;
  matchType: string;
}

export default function InvitationsPage() {
  const { team } = useAuth();
  const { push } = useToast();
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [teamsById, setTeamsById] = useState<Record<number, any>>({});
  const [bookingsById, setBookingsById] = useState<Record<number, Booking>>({});
  const [venuesById, setVenuesById] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    if (!team) return;
    setLoading(true);
    const [invites, bookings, venues, teams] = await Promise.all([
      api<Invitation[]>('/invitations/mine'),
      api<Booking[]>('/bookings/mine'),
      api<any[]>('/venues', { auth: false }),
      api<any[]>('/teams', { auth: false }),
    ]);
    setInvitations(invites.sort((a, b) => b.createdAt - a.createdAt));
    setBookingsById(Object.fromEntries(bookings.map((b) => [b.id, b])));
    setVenuesById(Object.fromEntries(venues.map((v) => [v.id, v])));
    setTeamsById(Object.fromEntries(teams.map((t) => [t.id, t])));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [team]); // eslint-disable-line

  async function respond(id: number, action: 'accept' | 'reject') {
    setBusyId(id);
    try {
      await api(`/invitations/${id}/${action}`, { method: 'POST' });
      if (action === 'accept') {
        push('success', 'Invitation accepted! Head to Payments to confirm the match.');
        router.push('/dashboard/payments');
      } else {
        push('info', 'Invitation declined and the slot released.');
        await load();
      }
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Could not update invitation.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Spinner />;

  const received = invitations.filter((i) => i.toTeamId === team?.id);
  const sent = invitations.filter((i) => i.fromTeamId === team?.id);

  return (
    <div>
      <h1 className="font-display font-bold text-2xl">Invitations</h1>
      <p className="text-mist-500 text-sm mt-1">Challenges you've received and sent.</p>

      <section className="mt-8">
        <h2 className="font-display font-semibold text-sm text-mist-300 mb-3">Received</h2>
        {received.length === 0 ? (
          <EmptyState title="No invitations yet" description="Challenges from other teams will show up here." />
        ) : (
          <div className="space-y-3">
            {received.map((inv) => {
              const from = teamsById[inv.fromTeamId];
              const booking = bookingsById[inv.bookingId];
              const venue = booking ? venuesById[booking.venueId] : null;
              return (
                <div key={inv.id} className="glass rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{from?.name || 'A team'} challenged you</div>
                    <div className="text-xs text-mist-500 mt-1">
                      {venue?.name} · {booking?.date} · {booking?.time} · {booking?.matchType}
                    </div>
                    {inv.message && <div className="text-xs text-mist-300 mt-1.5 italic">"{inv.message}"</div>}
                  </div>
                  {inv.status === 'pending' ? (
                    <div className="flex gap-2">
                      <SecondaryButton onClick={() => respond(inv.id, 'reject')} disabled={busyId === inv.id}>
                        Decline
                      </SecondaryButton>
                      <PrimaryButton onClick={() => respond(inv.id, 'accept')} disabled={busyId === inv.id}>
                        Accept
                      </PrimaryButton>
                    </div>
                  ) : (
                    <Badge tone={inv.status === 'accepted' ? 'success' : 'danger'}>{inv.status}</Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display font-semibold text-sm text-mist-300 mb-3">Sent</h2>
        {sent.length === 0 ? (
          <EmptyState title="No invitations sent" description="Schedule a match and challenge an opponent to see it here." />
        ) : (
          <div className="space-y-3">
            {sent.map((inv) => {
              const to = teamsById[inv.toTeamId];
              const booking = bookingsById[inv.bookingId];
              return (
                <div key={inv.id} className="glass rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">Challenge to {to?.name || 'a team'}</div>
                    <div className="text-xs text-mist-500 mt-1">
                      {booking?.date} · {booking?.time}
                    </div>
                  </div>
                  <Badge tone={inv.status === 'pending' ? 'warning' : inv.status === 'accepted' ? 'success' : 'danger'}>{inv.status}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

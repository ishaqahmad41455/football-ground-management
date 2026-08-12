'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { Badge, EmptyState, PrimaryButton, Spinner } from '@/components/ui';

interface Payment {
  id: number;
  matchId: number;
  teamId: number;
  amount: number;
  status: string;
  method: string | null;
  createdAt: number;
  paidAt?: number;
}

export default function PaymentsPage() {
  const { team } = useAuth();
  const { push } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [matchesById, setMatchesById] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<number | null>(null);

  async function load() {
    if (!team) return;
    setLoading(true);
    const list = await api<Payment[]>('/payments/mine');
    setPayments(list.sort((a, b) => b.createdAt - a.createdAt));
    const matches = await Promise.all(list.map((p) => api<any>(`/matches/${p.matchId}`, { auth: false })));
    setMatchesById(Object.fromEntries(matches.map((m) => [m.id, m])));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [team]); // eslint-disable-line

  async function pay(id: number) {
    setPayingId(id);
    try {
      await api(`/payments/${id}/pay`, { method: 'POST', body: { method: 'card' } });
      push('success', 'Payment successful — your match is confirmed!');
      await load();
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Payment failed.');
    } finally {
      setPayingId(null);
    }
  }

  if (loading) return <Spinner />;

  const pending = payments.filter((p) => p.status === 'pending');
  const history = payments.filter((p) => p.status !== 'pending');

  return (
    <div>
      <h1 className="font-display font-bold text-2xl">Payments</h1>
      <p className="text-mist-500 text-sm mt-1">Confirm bookings and review your transaction history.</p>

      <section className="mt-8">
        <h2 className="font-display font-semibold text-sm text-mist-300 mb-3">Awaiting payment</h2>
        {pending.length === 0 ? (
          <EmptyState title="Nothing to pay" description="Accepted invitations that need payment will appear here." />
        ) : (
          <div className="space-y-3">
            {pending.map((p) => {
              const match = matchesById[p.matchId];
              return (
                <div key={p.id} className="glass rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">{match?.teamA?.name} vs {match?.teamB?.name}</div>
                    <div className="text-xs text-mist-500 mt-1">
                      {match?.venue?.name} · {match?.date} · {match?.time}
                    </div>
                    <div className="mt-2 text-sm text-mist-300">
                      Booking fee <span className="font-mono">PKR {p.amount.toLocaleString()}</span>
                    </div>
                  </div>
                  <PrimaryButton onClick={() => pay(p.id)} disabled={payingId === p.id}>
                    {payingId === p.id ? 'Processing…' : `Pay PKR ${p.amount.toLocaleString()}`}
                  </PrimaryButton>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display font-semibold text-sm text-mist-300 mb-3">Transaction history</h2>
        {history.length === 0 ? (
          <EmptyState title="No transactions yet" description="Your paid and refunded bookings will show up here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-mist-500 border-b border-white/10">
                  <th className="py-2 pr-4 font-normal">Match</th>
                  <th className="py-2 pr-4 font-normal">Amount</th>
                  <th className="py-2 pr-4 font-normal">Method</th>
                  <th className="py-2 pr-4 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p) => {
                  const match = matchesById[p.matchId];
                  return (
                    <tr key={p.id} className="border-b border-white/5">
                      <td className="py-3 pr-4">{match?.teamA?.name} vs {match?.teamB?.name}</td>
                      <td className="py-3 pr-4 font-mono">PKR {p.amount.toLocaleString()}</td>
                      <td className="py-3 pr-4 capitalize">{p.method || '—'}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={p.status === 'paid' ? 'success' : p.status === 'refunded' ? 'info' : 'danger'}>{p.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

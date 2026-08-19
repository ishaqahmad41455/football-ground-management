'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { Badge, EmptyState, PrimaryButton, Spinner, Field, inputClass } from '@/components/ui';

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

const METHODS = [
  { id: 'card', label: 'Card', icon: '💳' },
  { id: 'easypaisa', label: 'Easypaisa', icon: '📱' },
  { id: 'jazzcash', label: 'JazzCash', icon: '📱' },
];

export default function PaymentsPage() {
  const { team } = useAuth();
  const { push } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [matchesById, setMatchesById] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<number | null>(null);

  // Per-payment selected method + (for mobile wallets) the phone number to charge.
  const [methodById, setMethodById] = useState<Record<number, string>>({});
  const [phoneById, setPhoneById] = useState<Record<number, string>>({});

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

  function methodFor(id: number) {
    return methodById[id] || 'card';
  }

  async function pay(id: number) {
    const method = methodFor(id);
    if ((method === 'easypaisa' || method === 'jazzcash') && !(phoneById[id] || '').trim()) {
      push('error', `Enter the mobile number to charge via ${method === 'easypaisa' ? 'Easypaisa' : 'JazzCash'}.`);
      return;
    }
    setPayingId(id);
    try {
      await api(`/payments/${id}/pay`, {
        method: 'POST',
        body: { method, phone: phoneById[id] || undefined },
      });
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
          <div className="space-y-4">
            {pending.map((p) => {
              const match = matchesById[p.matchId];
              const method = methodFor(p.id);
              const isWallet = method === 'easypaisa' || method === 'jazzcash';
              return (
                <div key={p.id} className="glass rounded-xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">{match?.teamA?.name} vs {match?.teamB?.name}</div>
                      <div className="text-xs text-mist-500 mt-1">
                        {match?.venue?.name} · {match?.date} · {match?.time}
                      </div>
                      <div className="mt-2 text-sm text-mist-300">
                        Booking fee <span className="font-mono">PKR {p.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/10">
                    <span className="block text-xs uppercase tracking-wider text-mist-500 mb-2">Pay with</span>
                    <div className="flex gap-2 flex-wrap">
                      {METHODS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMethodById({ ...methodById, [p.id]: m.id })}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                            method === m.id ? 'bg-pitch-500/20 border-pitch-500/40 text-pitch-400' : 'border-white/10 text-mist-500'
                          }`}
                        >
                          {m.icon} {m.label}
                        </button>
                      ))}
                    </div>

                    {isWallet && (
                      <div className="mt-4 max-w-xs">
                        <Field label={`${method === 'easypaisa' ? 'Easypaisa' : 'JazzCash'} Mobile Number`}>
                          <input
                            className={inputClass}
                            placeholder="03XXXXXXXXX"
                            value={phoneById[p.id] || ''}
                            onChange={(e) => setPhoneById({ ...phoneById, [p.id]: e.target.value })}
                          />
                        </Field>
                        <p className="text-xs text-mist-700 mt-1.5">You'll get a payment request on this number to approve. (Demo: any confirmation succeeds.)</p>
                      </div>
                    )}

                    <div className="mt-4">
                      <PrimaryButton onClick={() => pay(p.id)} disabled={payingId === p.id}>
                        {payingId === p.id ? 'Processing…' : `Pay PKR ${p.amount.toLocaleString()} via ${METHODS.find((m) => m.id === method)?.label}`}
                      </PrimaryButton>
                    </div>
                  </div>
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
                  const methodLabel = METHODS.find((m) => m.id === p.method)?.label || p.method;
                  return (
                    <tr key={p.id} className="border-b border-white/5">
                      <td className="py-3 pr-4">{match?.teamA?.name} vs {match?.teamB?.name}</td>
                      <td className="py-3 pr-4 font-mono">PKR {p.amount.toLocaleString()}</td>
                      <td className="py-3 pr-4 capitalize">{methodLabel || '—'}</td>
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

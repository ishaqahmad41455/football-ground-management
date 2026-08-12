'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { Badge, Field, inputClass, PrimaryButton, SecondaryButton, Spinner } from '@/components/ui';
import Countdown from '@/components/Countdown';

interface Sport {
  id: number;
  name: string;
  icon: string;
}
interface Venue {
  id: number;
  name: string;
  city: string;
  address: string;
  sportIds: number[];
}
interface Slot {
  time: string;
  price: number;
  status: 'available' | 'booked';
}
interface Team {
  id: number;
  name: string;
  sportId: number;
  city: string;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function SchedulePage() {
  const { team } = useAuth();
  const { push } = useToast();
  const router = useRouter();

  const [sports, setSports] = useState<Sport[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [sportId, setSportId] = useState<number | null>(null);
  const [venueId, setVenueId] = useState<number | null>(null);
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [booking, setBooking] = useState<any>(null); // reserved booking
  const [opponents, setOpponents] = useState<Team[]>([]);
  const [opponentId, setOpponentId] = useState<number | null>(null);
  const [matchType, setMatchType] = useState('Friendly Match');
  const [message, setMessage] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    api<Sport[]>('/sports', { auth: false }).then((s) => {
      setSports(s);
      if (team) setSportId(team.sportId);
    });
  }, [team]);

  useEffect(() => {
    if (!sportId) return;
    api<Venue[]>(`/venues?sportId=${sportId}`, { auth: false }).then((v) => {
      setVenues(v);
      setVenueId(v[0]?.id ?? null);
    });
  }, [sportId]);

  useEffect(() => {
    if (!venueId || !date) return;
    setLoadingSlots(true);
    api<any>(`/slots?venueId=${venueId}&date=${date}`, { auth: false })
      .then((res) => setSlots(res.slots))
      .finally(() => setLoadingSlots(false));
  }, [venueId, date]);

  useEffect(() => {
    if (!sportId) return;
    api<Team[]>(`/teams?sportId=${sportId}`, { auth: false }).then((list) => setOpponents(list.filter((t) => t.id !== team?.id)));
  }, [sportId, team]);

  async function reserveSlot(time: string) {
    if (!sportId || !venueId) return;
    try {
      const b = await api<any>('/bookings', { method: 'POST', body: { venueId, sportId, date, time, matchType } });
      setBooking(b);
      push('success', `Slot ${time} reserved for 10 minutes.`);
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Could not reserve slot.');
      // refresh slots to reflect reality
      api<any>(`/slots?venueId=${venueId}&date=${date}`, { auth: false }).then((res) => setSlots(res.slots));
    }
  }

  async function sendInvite() {
    if (!booking || !opponentId) return;
    setSendingInvite(true);
    try {
      await api(`/bookings/${booking.id}/invite`, { method: 'POST', body: { opponentTeamId: opponentId, message } });
      push('success', 'Invitation sent! Redirecting to your invitations…');
      router.push('/dashboard/invitations');
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Could not send invitation.');
    } finally {
      setSendingInvite(false);
    }
  }

  function releaseAndReset() {
    if (booking) api(`/bookings/${booking.id}/cancel`, { method: 'POST' }).catch(() => {});
    setBooking(null);
    api<any>(`/slots?venueId=${venueId}&date=${date}`, { auth: false }).then((res) => setSlots(res.slots));
  }

  if (booking) {
    return (
      <div className="max-w-xl">
        <div className="flex items-center justify-between">
          <h1 className="font-display font-bold text-2xl">Invite an opponent</h1>
          <div className="text-sm text-mist-500">
            Reservation expires in <Countdown expiresAt={booking.expiresAt} onExpire={() => { push('error', 'Your reservation expired. The slot has been released.'); releaseAndReset(); }} />
          </div>
        </div>

        <div className="mt-5 glass rounded-2xl p-5 flex items-center justify-between">
          <div>
            <div className="font-medium">{venues.find((v) => v.id === venueId)?.name}</div>
            <div className="text-xs text-mist-500 mt-1">{date} · {booking.time}</div>
          </div>
          <Badge tone="warning">Reserved</Badge>
        </div>

        <div className="mt-6 glass rounded-2xl p-6 space-y-5">
          <Field label="Opponent Team">
            <select className={inputClass} value={opponentId ?? ''} onChange={(e) => setOpponentId(Number(e.target.value))}>
              <option value="">Select a team</option>
              {opponents.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} · {o.city}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Match Type">
            <select className={inputClass} value={matchType} onChange={(e) => setMatchType(e.target.value)}>
              {['Friendly Match', 'Competitive Match', 'Tournament Match', 'League Match', 'Practice Match'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Message">
            <textarea className={inputClass} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="We would like to challenge your team…" />
          </Field>
          <div className="flex gap-3">
            <SecondaryButton onClick={releaseAndReset}>Cancel & Release Slot</SecondaryButton>
            <PrimaryButton onClick={sendInvite} disabled={!opponentId || sendingInvite}>
              {sendingInvite ? 'Sending…' : 'Send Invitation'}
            </PrimaryButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display font-bold text-2xl">Schedule a match</h1>
      <p className="text-mist-500 text-sm mt-1">Reserve a slot, then invite an opponent to lock it in.</p>

      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        <Field label="Sport">
          <select className={inputClass} value={sportId ?? ''} onChange={(e) => setSportId(Number(e.target.value))}>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Venue">
          <select className={inputClass} value={venueId ?? ''} onChange={(e) => setVenueId(Number(e.target.value))}>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {v.city}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input type="date" min={todayISO()} className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      <div className="mt-8">
        <h2 className="font-display font-semibold text-sm text-mist-300 mb-3">Available slots</h2>
        {loadingSlots ? (
          <Spinner />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {slots.map((s) => (
              <button
                key={s.time}
                disabled={s.status === 'booked'}
                onClick={() => reserveSlot(s.time)}
                className={`rounded-xl px-4 py-4 text-left transition-colors border ${
                  s.status === 'booked'
                    ? 'border-white/5 bg-white/2 text-mist-700 cursor-not-allowed'
                    : 'border-pitch-500/20 bg-pitch-500/5 hover:bg-pitch-500/15 hover:border-pitch-500/40'
                }`}
              >
                <div className="font-mono font-semibold">{s.time}</div>
                <div className="text-xs mt-1 text-mist-500">
                  {s.status === 'booked' ? 'Booked' : `PKR ${s.price.toLocaleString()}`}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

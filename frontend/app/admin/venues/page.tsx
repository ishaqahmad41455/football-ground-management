'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { Field, inputClass, PrimaryButton, Spinner, Badge } from '@/components/ui';

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
  openingTime: string;
  closingTime: string;
  slotDurationMinutes: number;
  pricePerSlot: number;
  weekendPricePerSlot: number;
  status: string;
}

export default function AdminVenuesPage() {
  const { push } = useToast();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    city: '',
    address: '',
    sportIds: [] as number[],
    openingTime: '09:00',
    closingTime: '23:00',
    slotDurationMinutes: 90,
    pricePerSlot: 3000,
    weekendPricePerSlot: 3500,
  });

  async function load() {
    setLoading(true);
    const [v, s] = await Promise.all([api<Venue[]>('/venues', { auth: false }), api<Sport[]>('/sports', { auth: false })]);
    setVenues(v);
    setSports(s);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function toggleSport(id: number) {
    setForm((f) => ({ ...f, sportIds: f.sportIds.includes(id) ? f.sportIds.filter((x) => x !== id) : [...f.sportIds, id] }));
  }

  async function createVenue(e: React.FormEvent) {
    e.preventDefault();
    if (form.sportIds.length === 0) {
      push('error', 'Select at least one supported sport.');
      return;
    }
    setSaving(true);
    try {
      await api('/venues', { method: 'POST', body: form });
      push('success', `${form.name} added to venues.`);
      setShowForm(false);
      setForm({ name: '', city: '', address: '', sportIds: [], openingTime: '09:00', closingTime: '23:00', slotDurationMinutes: 90, pricePerSlot: 3000, weekendPricePerSlot: 3500 });
      await load();
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Could not create venue.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display font-bold text-2xl">Venues</h1>
        <PrimaryButton onClick={() => setShowForm((s) => !s)}>{showForm ? 'Close' : '+ Add Venue'}</PrimaryButton>
      </div>

      {showForm && (
        <form onSubmit={createVenue} className="mt-5 glass rounded-2xl p-6 grid sm:grid-cols-2 gap-4">
          <Field label="Ground Name">
            <input required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="City">
            <input required className={inputClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address">
              <input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <span className="block text-xs uppercase tracking-wider text-mist-500 mb-2">Sports Supported</span>
            <div className="flex gap-2 flex-wrap">
              {sports.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => toggleSport(s.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    form.sportIds.includes(s.id) ? 'bg-pitch-500/20 border-pitch-500/40 text-pitch-400' : 'border-white/10 text-mist-500'
                  }`}
                >
                  {s.icon} {s.name}
                </button>
              ))}
            </div>
          </div>
          <Field label="Opening Time">
            <input type="time" className={inputClass} value={form.openingTime} onChange={(e) => setForm({ ...form, openingTime: e.target.value })} />
          </Field>
          <Field label="Closing Time">
            <input type="time" className={inputClass} value={form.closingTime} onChange={(e) => setForm({ ...form, closingTime: e.target.value })} />
          </Field>
          <Field label="Slot Duration (minutes)">
            <input type="number" className={inputClass} value={form.slotDurationMinutes} onChange={(e) => setForm({ ...form, slotDurationMinutes: Number(e.target.value) })} />
          </Field>
          <Field label="Price / Slot (PKR)">
            <input type="number" className={inputClass} value={form.pricePerSlot} onChange={(e) => setForm({ ...form, pricePerSlot: Number(e.target.value) })} />
          </Field>
          <Field label="Weekend Price / Slot (PKR)">
            <input type="number" className={inputClass} value={form.weekendPricePerSlot} onChange={(e) => setForm({ ...form, weekendPricePerSlot: Number(e.target.value) })} />
          </Field>
          <div className="sm:col-span-2">
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Create Venue'}
            </PrimaryButton>
          </div>
        </form>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {venues.map((v) => (
            <div key={v.id} className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="font-display font-semibold">{v.name}</div>
                <Badge tone="success">{v.status}</Badge>
              </div>
              <div className="text-xs text-mist-500 mt-1">{v.city} · {v.address}</div>
              <div className="text-xs text-mist-500 mt-2">
                {v.openingTime} – {v.closingTime} · {v.slotDurationMinutes}min slots
              </div>
              <div className="text-sm mt-2 font-mono text-pitch-400">
                PKR {v.pricePerSlot.toLocaleString()} <span className="text-mist-500">/ {v.weekendPricePerSlot.toLocaleString()} weekend</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { Field, inputClass, PrimaryButton, Spinner } from '@/components/ui';

interface Venue {
  id: number;
  name: string;
  city: string;
  address: string;
  openingTime: string;
  closingTime: string;
  slotDurationMinutes: number;
  breakMinutes: number;
  pricePerSlot: number;
  weekendPricePerSlot: number;
  capacity: number;
  teamCount: number;
}

export default function GroundOwnerVenuePage() {
  const { push } = useToast();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [forms, setForms] = useState<Record<number, any>>({});

  async function load() {
    setLoading(true);
    const list = await api<Venue[]>('/ground-owner/venues');
    setVenues(list);
    setForms(Object.fromEntries(list.map((v) => [v.id, { ...v }])));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(id: number) {
    setSaving(id);
    try {
      const f = forms[id];
      await api(`/ground-owner/venues/${id}`, {
        method: 'PATCH',
        body: {
          openingTime: f.openingTime,
          closingTime: f.closingTime,
          slotDurationMinutes: Number(f.slotDurationMinutes),
          breakMinutes: Number(f.breakMinutes),
          pricePerSlot: Number(f.pricePerSlot),
          weekendPricePerSlot: Number(f.weekendPricePerSlot),
          address: f.address,
        },
      });
      push('success', 'Ground settings saved.');
      await load();
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Could not save settings.');
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <h1 className="font-display font-bold text-2xl">My Ground</h1>
      <p className="text-mist-500 text-sm mt-1">Hours, slot length, and pricing for the ground(s) you manage.</p>

      <div className="mt-6 space-y-6">
        {venues.map((v) => {
          const f = forms[v.id] || v;
          return (
            <div key={v.id} className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-display font-semibold text-lg">{v.name}</div>
                  <div className="text-xs text-mist-500">{v.city} · {v.teamCount} team(s) registered</div>
                </div>
              </div>

              <div className="mt-5 grid sm:grid-cols-2 gap-4">
                <Field label="Address">
                  <input className={inputClass} value={f.address} onChange={(e) => setForms({ ...forms, [v.id]: { ...f, address: e.target.value } })} />
                </Field>
                <Field label="Capacity">
                  <input type="number" className={inputClass} value={f.capacity} disabled />
                </Field>
                <Field label="Opening Time">
                  <input type="time" className={inputClass} value={f.openingTime} onChange={(e) => setForms({ ...forms, [v.id]: { ...f, openingTime: e.target.value } })} />
                </Field>
                <Field label="Closing Time">
                  <input type="time" className={inputClass} value={f.closingTime} onChange={(e) => setForms({ ...forms, [v.id]: { ...f, closingTime: e.target.value } })} />
                </Field>
                <Field label="Slot Duration (minutes)">
                  <input type="number" className={inputClass} value={f.slotDurationMinutes} onChange={(e) => setForms({ ...forms, [v.id]: { ...f, slotDurationMinutes: e.target.value } })} />
                </Field>
                <Field label="Break Between Slots (minutes)">
                  <input type="number" className={inputClass} value={f.breakMinutes} onChange={(e) => setForms({ ...forms, [v.id]: { ...f, breakMinutes: e.target.value } })} />
                </Field>
                <Field label="Price / Slot (PKR)">
                  <input type="number" className={inputClass} value={f.pricePerSlot} onChange={(e) => setForms({ ...forms, [v.id]: { ...f, pricePerSlot: e.target.value } })} />
                </Field>
                <Field label="Weekend Price / Slot (PKR)">
                  <input type="number" className={inputClass} value={f.weekendPricePerSlot} onChange={(e) => setForms({ ...forms, [v.id]: { ...f, weekendPricePerSlot: e.target.value } })} />
                </Field>
              </div>

              <div className="mt-5">
                <PrimaryButton onClick={() => save(v.id)} disabled={saving === v.id}>
                  {saving === v.id ? 'Saving…' : 'Save Changes'}
                </PrimaryButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

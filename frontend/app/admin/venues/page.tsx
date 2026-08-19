'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { Field, inputClass, PrimaryButton, SecondaryButton, Spinner, Badge } from '@/components/ui';

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
  breakMinutes: number;
  pricePerSlot: number;
  weekendPricePerSlot: number;
  status: string;
  ownerId: number | null;
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

  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);

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

  function toggleEditSport(id: number) {
    setEditForm((f: any) => ({ ...f, sportIds: f.sportIds.includes(id) ? f.sportIds.filter((x: number) => x !== id) : [...f.sportIds, id] }));
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

  function startEdit(v: Venue) {
    setEditId(v.id);
    setEditForm({
      name: v.name,
      city: v.city,
      address: v.address,
      sportIds: [...v.sportIds],
      openingTime: v.openingTime,
      closingTime: v.closingTime,
      slotDurationMinutes: v.slotDurationMinutes,
      breakMinutes: v.breakMinutes,
      pricePerSlot: v.pricePerSlot,
      weekendPricePerSlot: v.weekendPricePerSlot,
      status: v.status,
    });
  }

  function cancelEdit() {
    setEditId(null);
    setEditForm(null);
  }

  async function saveEdit(id: number) {
    if (editForm.sportIds.length === 0) {
      push('error', 'Select at least one supported sport.');
      return;
    }
    setSavingEdit(true);
    try {
      await api(`/venues/${id}`, {
        method: 'PATCH',
        body: {
          ...editForm,
          slotDurationMinutes: Number(editForm.slotDurationMinutes),
          breakMinutes: Number(editForm.breakMinutes),
          pricePerSlot: Number(editForm.pricePerSlot),
          weekendPricePerSlot: Number(editForm.weekendPricePerSlot),
        },
      });
      push('success', 'Ground updated.');
      cancelEdit();
      await load();
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Could not save changes.');
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display font-bold text-2xl">Grounds</h1>
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
              <div className="mt-3">
                <button onClick={() => (editId === v.id ? cancelEdit() : startEdit(v))} className="text-blue-300 text-xs hover:text-blue-200">
                  {editId === v.id ? 'Close' : 'Edit'}
                </button>
              </div>

              {editId === v.id && editForm && (
                <div className="mt-4 pt-4 border-t border-white/10 grid gap-3">
                  <Field label="Ground Name">
                    <input className={inputClass} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  </Field>
                  <Field label="City">
                    <input className={inputClass} value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
                  </Field>
                  <Field label="Address">
                    <input className={inputClass} value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                  </Field>
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-mist-500 mb-2">Sports Supported</span>
                    <div className="flex gap-2 flex-wrap">
                      {sports.map((s) => (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => toggleEditSport(s.id)}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                            editForm.sportIds.includes(s.id) ? 'bg-pitch-500/20 border-pitch-500/40 text-pitch-400' : 'border-white/10 text-mist-500'
                          }`}
                        >
                          {s.icon} {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Opening Time">
                      <input type="time" className={inputClass} value={editForm.openingTime} onChange={(e) => setEditForm({ ...editForm, openingTime: e.target.value })} />
                    </Field>
                    <Field label="Closing Time">
                      <input type="time" className={inputClass} value={editForm.closingTime} onChange={(e) => setEditForm({ ...editForm, closingTime: e.target.value })} />
                    </Field>
                    <Field label="Slot Duration (min)">
                      <input type="number" className={inputClass} value={editForm.slotDurationMinutes} onChange={(e) => setEditForm({ ...editForm, slotDurationMinutes: e.target.value })} />
                    </Field>
                    <Field label="Break (min)">
                      <input type="number" className={inputClass} value={editForm.breakMinutes} onChange={(e) => setEditForm({ ...editForm, breakMinutes: e.target.value })} />
                    </Field>
                    <Field label="Price / Slot (PKR)">
                      <input type="number" className={inputClass} value={editForm.pricePerSlot} onChange={(e) => setEditForm({ ...editForm, pricePerSlot: e.target.value })} />
                    </Field>
                    <Field label="Weekend Price (PKR)">
                      <input type="number" className={inputClass} value={editForm.weekendPricePerSlot} onChange={(e) => setEditForm({ ...editForm, weekendPricePerSlot: e.target.value })} />
                    </Field>
                  </div>
                  <Field label="Status">
                    <select className={inputClass} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                    </select>
                  </Field>
                  <div className="flex gap-3">
                    <SecondaryButton onClick={cancelEdit}>Cancel</SecondaryButton>
                    <PrimaryButton onClick={() => saveEdit(v.id)} disabled={savingEdit}>
                      {savingEdit ? 'Saving…' : 'Save Changes'}
                    </PrimaryButton>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

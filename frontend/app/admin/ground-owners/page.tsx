'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { Field, inputClass, PrimaryButton, Spinner, Badge, EmptyState, SecondaryButton } from '@/components/ui';

interface Venue {
  id: number;
  name: string;
  city: string;
  ownerId: number | null;
}
interface Owner {
  id: number;
  email: string;
  name: string;
  createdAt: number;
  venues: { id: number; name: string; city: string }[];
}

export default function AdminGroundOwnersPage() {
  const { push } = useToast();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', venueId: '' });
  const [reassign, setReassign] = useState<Record<number, string>>({});

  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    setLoading(true);
    const [o, v] = await Promise.all([api<Owner[]>('/admin/ground-owners'), api<Venue[]>('/venues', { auth: false })]);
    setOwners(o);
    setVenues(v);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const unassignedVenues = venues.filter((v) => !v.ownerId);

  async function createOwner(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/admin/ground-owners', {
        method: 'POST',
        body: { ...form, venueId: form.venueId ? Number(form.venueId) : undefined },
      });
      push('success', `${form.name} created as a ground owner.`);
      setForm({ name: '', email: '', password: '', venueId: '' });
      setShowForm(false);
      await load();
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Could not create ground owner.');
    } finally {
      setSaving(false);
    }
  }

  async function assignVenue(ownerId: number) {
    const venueId = reassign[ownerId];
    if (!venueId) return;
    try {
      await api(`/admin/venues/${venueId}/owner`, { method: 'PATCH', body: { ownerId } });
      push('success', 'Ground assigned.');
      await load();
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Could not assign ground.');
    }
  }

  async function unassignVenue(venueId: number) {
    try {
      await api(`/admin/venues/${venueId}/owner`, { method: 'PATCH', body: { ownerId: null } });
      push('success', 'Ground unassigned.');
      await load();
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Could not unassign ground.');
    }
  }

  function startEdit(o: Owner) {
    setEditId(o.id);
    setEditForm({ name: o.name, email: o.email, password: '' });
  }

  function cancelEdit() {
    setEditId(null);
    setEditForm({ name: '', email: '', password: '' });
  }

  async function saveEdit(id: number) {
    setSavingEdit(true);
    try {
      const body: any = { name: editForm.name, email: editForm.email };
      if (editForm.password) body.password = editForm.password;
      await api(`/admin/ground-owners/${id}`, { method: 'PATCH', body });
      push('success', 'Ground owner updated.');
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
        <div>
          <h1 className="font-display font-bold text-2xl">Ground Owners</h1>
          <p className="text-mist-500 text-sm mt-1">Create ground-owner accounts and assign them to grounds.</p>
        </div>
        <PrimaryButton onClick={() => setShowForm((s) => !s)}>{showForm ? 'Close' : '+ New Ground Owner'}</PrimaryButton>
      </div>

      {showForm && (
        <form onSubmit={createOwner} className="mt-5 glass rounded-2xl p-6 grid sm:grid-cols-2 gap-4">
          <Field label="Full Name">
            <input required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <input required type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Temporary Password">
            <input required type="text" className={inputClass} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" />
          </Field>
          <Field label="Assign Ground (optional)">
            <select className={inputClass} value={form.venueId} onChange={(e) => setForm({ ...form, venueId: e.target.value })}>
              <option value="">Assign later</option>
              {unassignedVenues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {v.city}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create Ground Owner'}
            </PrimaryButton>
          </div>
        </form>
      )}

      {unassignedVenues.length > 0 && (
        <div className="mt-6 rounded-xl border border-floodlight-500/30 bg-floodlight-500/10 px-4 py-3 text-sm text-floodlight-500">
          {unassignedVenues.length} ground(s) have no owner yet: {unassignedVenues.map((v) => v.name).join(', ')}.
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <Spinner />
        ) : owners.length === 0 ? (
          <EmptyState title="No ground owners yet" description="Create one above to start delegating ground management." />
        ) : (
          <div className="grid gap-4">
            {owners.map((o) => (
              <div key={o.id} className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-medium">{o.name}</div>
                    <div className="text-xs text-mist-500">{o.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={o.venues.length > 0 ? 'success' : 'warning'}>
                      {o.venues.length} ground{o.venues.length === 1 ? '' : 's'}
                    </Badge>
                    <button onClick={() => (editId === o.id ? cancelEdit() : startEdit(o))} className="text-blue-300 text-xs hover:text-blue-200">
                      {editId === o.id ? 'Close' : 'Edit'}
                    </button>
                  </div>
                </div>

                {editId === o.id && (
                  <div className="mt-4 pt-4 border-t border-white/10 grid sm:grid-cols-3 gap-3 items-end">
                    <Field label="Full Name">
                      <input className={inputClass} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    </Field>
                    <Field label="Email">
                      <input type="email" className={inputClass} value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                    </Field>
                    <Field label="New Password (optional)">
                      <input type="text" className={inputClass} placeholder="Leave blank to keep current" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
                    </Field>
                    <div className="sm:col-span-3 flex gap-3">
                      <SecondaryButton onClick={cancelEdit}>Cancel</SecondaryButton>
                      <PrimaryButton onClick={() => saveEdit(o.id)} disabled={savingEdit}>
                        {savingEdit ? 'Saving…' : 'Save Changes'}
                      </PrimaryButton>
                    </div>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {o.venues.map((v) => (
                    <span key={v.id} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs">
                      {v.name}
                      <button onClick={() => unassignVenue(v.id)} className="text-clay-400 hover:text-clay-300">
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                {unassignedVenues.length > 0 && (
                  <div className="mt-4 flex items-center gap-2">
                    <select
                      className={`${inputClass} w-auto`}
                      value={reassign[o.id] || ''}
                      onChange={(e) => setReassign({ ...reassign, [o.id]: e.target.value })}
                    >
                      <option value="">Assign another ground…</option>
                      {unassignedVenues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} · {v.city}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => assignVenue(o.id)} className="text-pitch-400 text-xs hover:text-pitch-300">
                      Assign
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

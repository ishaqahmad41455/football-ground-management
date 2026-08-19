'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { Badge, Spinner, inputClass, SecondaryButton, PrimaryButton, Field } from '@/components/ui';

interface Sport {
  id: number;
  name: string;
  icon: string;
}
interface Venue {
  id: number;
  name: string;
  city: string;
  sportIds: number[];
}
interface Team {
  id: number;
  name: string;
  sportId: number;
  venueId: number;
  city: string;
  area?: string;
  description?: string;
  captainName: string;
  captainPhone: string;
  captainEmail: string;
  preferredFormat?: string;
  status: string;
  verified: boolean;
  playerCount: number;
  stats: { played: number; wins: number };
}

const STATUS_OPTIONS = ['pending', 'approved', 'suspended', 'blocked'];

export default function AdminTeamsPage() {
  const { push } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const qs = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
    const [list, s, v] = await Promise.all([
      api<Team[]>(`/admin/teams${qs}`),
      api<Sport[]>('/sports', { auth: false }),
      api<Venue[]>('/venues', { auth: false }),
    ]);
    setTeams(list);
    setSports(s);
    setVenues(v);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [statusFilter]); // eslint-disable-line

  async function updateStatus(id: number, status: string) {
    setBusyId(id);
    try {
      await api(`/admin/teams/${id}/status`, { method: 'PATCH', body: { status } });
      push('success', `Team status updated to ${status}.`);
      await load();
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Could not update status.');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteTeam(id: number) {
    if (!confirm('Permanently delete this team and its players?')) return;
    try {
      await api(`/admin/teams/${id}`, { method: 'DELETE' });
      push('success', 'Team deleted.');
      await load();
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Could not delete team.');
    }
  }

  function startEdit(t: Team) {
    setEditId(t.id);
    setEditForm({
      name: t.name,
      sportId: t.sportId,
      venueId: t.venueId,
      city: t.city,
      area: t.area || '',
      description: t.description || '',
      captainName: t.captainName,
      captainPhone: t.captainPhone,
      captainEmail: t.captainEmail,
      preferredFormat: t.preferredFormat || '',
      verified: t.verified,
    });
  }

  function cancelEdit() {
    setEditId(null);
    setEditForm(null);
  }

  async function saveEdit(id: number) {
    setSaving(true);
    try {
      await api(`/admin/teams/${id}`, {
        method: 'PATCH',
        body: { ...editForm, sportId: Number(editForm.sportId), venueId: Number(editForm.venueId) },
      });
      push('success', 'Team updated.');
      cancelEdit();
      await load();
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  const venuesForSport = (sportId: number) => venues.filter((v) => v.sportIds.includes(Number(sportId)));

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display font-bold text-2xl">Teams</h1>
        <select className={`${inputClass} w-auto`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="mt-6 overflow-x-auto glass rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-mist-500 border-b border-white/10">
                <th className="py-3 px-4 font-normal">Team</th>
                <th className="py-3 px-4 font-normal">Sport</th>
                <th className="py-3 px-4 font-normal">City</th>
                <th className="py-3 px-4 font-normal">Players</th>
                <th className="py-3 px-4 font-normal">Record</th>
                <th className="py-3 px-4 font-normal">Status</th>
                <th className="py-3 px-4 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <>
                  <tr key={t.id} className="border-b border-white/5">
                    <td className="py-3 px-4">
                      <Link href={`/teams/${t.id}`} className="hover:text-pitch-400">
                        {t.name}
                      </Link>
                      {t.verified && <Badge tone="info">Verified</Badge>}
                    </td>
                    <td className="py-3 px-4">{t.sportId === 1 ? 'Futsal' : 'Cricket'}</td>
                    <td className="py-3 px-4">{t.city}</td>
                    <td className="py-3 px-4">{t.playerCount}</td>
                    <td className="py-3 px-4 font-mono">{t.stats.wins}W / {t.stats.played}P</td>
                    <td className="py-3 px-4">
                      <Badge tone={t.status === 'approved' ? 'success' : t.status === 'pending' ? 'warning' : 'danger'}>{t.status}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => (editId === t.id ? cancelEdit() : startEdit(t))} className="text-blue-300 text-xs hover:text-blue-200">
                          {editId === t.id ? 'Close' : 'Edit'}
                        </button>
                        {t.status !== 'approved' && (
                          <button disabled={busyId === t.id} onClick={() => updateStatus(t.id, 'approved')} className="text-pitch-400 text-xs hover:text-pitch-300">
                            Approve
                          </button>
                        )}
                        {t.status !== 'suspended' && (
                          <button disabled={busyId === t.id} onClick={() => updateStatus(t.id, 'suspended')} className="text-floodlight-500 text-xs hover:text-floodlight-400">
                            Suspend
                          </button>
                        )}
                        <button onClick={() => deleteTeam(t.id)} className="text-clay-400 text-xs hover:text-clay-300">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editId === t.id && editForm && (
                    <tr className="border-b border-white/5 bg-white/2">
                      <td colSpan={7} className="p-5">
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                          <Field label="Team Name">
                            <input className={inputClass} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                          </Field>
                          <Field label="Sport">
                            <select
                              className={inputClass}
                              value={editForm.sportId}
                              onChange={(e) => {
                                const newSportId = Number(e.target.value);
                                const stillValid = venuesForSport(newSportId).some((v) => v.id === editForm.venueId);
                                setEditForm({ ...editForm, sportId: newSportId, venueId: stillValid ? editForm.venueId : venuesForSport(newSportId)[0]?.id ?? '' });
                              }}
                            >
                              {sports.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.icon} {s.name}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Ground">
                            <select className={inputClass} value={editForm.venueId} onChange={(e) => setEditForm({ ...editForm, venueId: Number(e.target.value) })}>
                              {venuesForSport(editForm.sportId).map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.name} · {v.city}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="City">
                            <input className={inputClass} value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
                          </Field>
                          <Field label="Area">
                            <input className={inputClass} value={editForm.area} onChange={(e) => setEditForm({ ...editForm, area: e.target.value })} />
                          </Field>
                          <Field label="Preferred Format">
                            <input className={inputClass} value={editForm.preferredFormat} onChange={(e) => setEditForm({ ...editForm, preferredFormat: e.target.value })} />
                          </Field>
                          <Field label="Captain Name">
                            <input className={inputClass} value={editForm.captainName} onChange={(e) => setEditForm({ ...editForm, captainName: e.target.value })} />
                          </Field>
                          <Field label="Captain Phone">
                            <input className={inputClass} value={editForm.captainPhone} onChange={(e) => setEditForm({ ...editForm, captainPhone: e.target.value })} />
                          </Field>
                          <Field label="Captain Email">
                            <input className={inputClass} value={editForm.captainEmail} onChange={(e) => setEditForm({ ...editForm, captainEmail: e.target.value })} />
                          </Field>
                          <div className="sm:col-span-2 md:col-span-3">
                            <Field label="Description">
                              <textarea rows={3} className={inputClass} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                            </Field>
                          </div>
                          <label className="flex items-center gap-2 text-sm text-mist-300">
                            <input type="checkbox" checked={editForm.verified} onChange={(e) => setEditForm({ ...editForm, verified: e.target.checked })} />
                            Verified team
                          </label>
                        </div>
                        <div className="mt-5 flex gap-3">
                          <SecondaryButton onClick={cancelEdit}>Cancel</SecondaryButton>
                          <PrimaryButton onClick={() => saveEdit(t.id)} disabled={saving}>
                            {saving ? 'Saving…' : 'Save Changes'}
                          </PrimaryButton>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

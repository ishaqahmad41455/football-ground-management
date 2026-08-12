'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { Badge, Field, inputClass, PrimaryButton, SecondaryButton, Spinner, EmptyState } from '@/components/ui';

interface Player {
  id: number;
  teamId: number;
  name: string;
  jerseyNumber: number;
  position: string;
  dob: string;
  phone: string;
  status: string;
  isCaptain: boolean;
}

const FUTSAL_FORMATION = [
  { label: 'GK', row: 4 },
  { label: 'LB', row: 3 },
  { label: 'CB', row: 3 },
  { label: 'RB', row: 3 },
  { label: 'CM', row: 2 },
  { label: 'CM', row: 2 },
  { label: 'LW', row: 1 },
  { label: 'ST', row: 0 },
  { label: 'RW', row: 1 },
];

export default function PlayersPage() {
  const { team, refreshTeam } = useAuth();
  const { push } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [squadLimit, setSquadLimit] = useState(11);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', jerseyNumber: '', position: '', dob: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    if (!team) return;
    setLoading(true);
    const full = await api<any>(`/teams/${team.id}`, { auth: false });
    setPlayers(full.players || []);
    const sport = await api<any[]>('/sports', { auth: false });
    const s = sport.find((sp) => sp.id === team.sportId);
    if (s) setSquadLimit(s.squadLimit);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [team]); // eslint-disable-line

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!team) return;
    setSubmitting(true);
    try {
      await api(`/teams/${team.id}/players`, {
        method: 'POST',
        body: { ...form, jerseyNumber: Number(form.jerseyNumber) || undefined },
      });
      push('success', `${form.name} added to the squad.`);
      setForm({ name: '', jerseyNumber: '', position: '', dob: '', phone: '' });
      setShowForm(false);
      await load();
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Could not add player.');
    } finally {
      setSubmitting(false);
    }
  }

  async function removePlayer(id: number) {
    if (!team) return;
    if (!confirm('Remove this player from your squad?')) return;
    try {
      await api(`/teams/${team.id}/players/${id}`, { method: 'DELETE' });
      push('success', 'Player removed.');
      await load();
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Could not remove player.');
    }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl">Players</h1>
          <p className="text-mist-500 text-sm mt-1">
            {players.length} / {squadLimit} squad slots filled
          </p>
        </div>
        <PrimaryButton onClick={() => setShowForm((s) => !s)} disabled={players.length >= squadLimit}>
          {players.length >= squadLimit ? 'Squad Full' : '+ Add Player'}
        </PrimaryButton>
      </div>

      {showForm && (
        <form onSubmit={addPlayer} className="mt-5 glass rounded-2xl p-6 grid sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
          <Field label="Full Name">
            <input required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Jersey #">
            <input type="number" className={inputClass} value={form.jerseyNumber} onChange={(e) => setForm({ ...form, jerseyNumber: e.target.value })} />
          </Field>
          <Field label="Position">
            <input className={inputClass} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="GK / FWD" />
          </Field>
          <Field label="Phone">
            <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Player'}
          </PrimaryButton>
        </form>
      )}

      {team?.sportId === 1 && players.length > 0 && (
        <div className="mt-8 glass rounded-2xl p-6">
          <h2 className="font-display font-semibold mb-4 text-sm text-mist-300">Squad formation preview</h2>
          <div className="grid gap-3">
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="flex justify-center gap-4">
                {FUTSAL_FORMATION.filter((f) => f.row === row).map((f, i) => {
                  const p = players[FUTSAL_FORMATION.indexOf(f)];
                  return (
                    <div key={f.label + i} className="w-14 h-14 rounded-full bg-pitch-500/15 border border-pitch-500/30 flex flex-col items-center justify-center text-[10px] text-pitch-400 font-mono">
                      <span className="font-bold">{f.label}</span>
                      <span className="text-mist-500">{p?.jerseyNumber ?? '-'}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        {players.length === 0 ? (
          <EmptyState title="No players yet" description="Add your first squad member to get started." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map((p) => (
              <div key={p.id} className="glass rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {p.name}
                      {p.isCaptain && <Badge tone="info">Captain</Badge>}
                    </div>
                    <div className="text-xs text-mist-500 mt-1">
                      #{p.jerseyNumber} · {p.position || 'Unassigned'}
                    </div>
                  </div>
                  <button onClick={() => removePlayer(p.id)} className="text-clay-400 text-xs hover:text-clay-300">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { Badge, Field, inputClass, PrimaryButton, SecondaryButton, Spinner, EmptyState } from '@/components/ui';

interface Team {
  id: number;
  name: string;
  venueId: number;
  status: string;
}
interface Match {
  id: number;
  teamAId: number;
  teamBId: number;
  venueId: number;
  date: string;
  time: string;
  matchType: string;
  status: string;
  result: any;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function GroundOwnerMatchesPage() {
  const { venues } = useAuth();
  const { push } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resultTarget, setResultTarget] = useState<Match | null>(null);
  const [resultForm, setResultForm] = useState({ scoreA: 0, scoreB: 0, mvp: '', notes: '' });

  const [form, setForm] = useState({
    venueId: venues[0]?.id ?? '',
    teamAId: '',
    teamBId: '',
    date: todayISO(),
    time: '18:00',
    matchType: 'League Match',
  });

  async function load() {
    setLoading(true);
    const [t, m] = await Promise.all([api<Team[]>('/ground-owner/teams'), api<Match[]>('/ground-owner/matches')]);
    setTeams(t.filter((x) => x.status === 'approved'));
    setMatches(m);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const teamsForSelectedVenue = teams.filter((t) => t.venueId === Number(form.venueId));
  const teamNameById = (id: number) => teams.find((t) => t.id === id)?.name || `Team #${id}`;

  async function createMatch(e: React.FormEvent) {
    e.preventDefault();
    if (!form.teamAId || !form.teamBId) {
      push('error', 'Select both teams.');
      return;
    }
    if (form.teamAId === form.teamBId) {
      push('error', 'A team cannot play itself.');
      return;
    }
    setSaving(true);
    try {
      await api('/ground-owner/matches', {
        method: 'POST',
        body: { ...form, venueId: Number(form.venueId), teamAId: Number(form.teamAId), teamBId: Number(form.teamBId) },
      });
      push('success', 'Match scheduled.');
      setShowForm(false);
      setForm((f) => ({ ...f, teamAId: '', teamBId: '' }));
      await load();
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Could not schedule match.');
    } finally {
      setSaving(false);
    }
  }

  async function submitResult(e: React.FormEvent) {
    e.preventDefault();
    if (!resultTarget) return;
    try {
      await api(`/ground-owner/matches/${resultTarget.id}/result`, { method: 'POST', body: resultForm });
      push('success', 'Result recorded.');
      setResultTarget(null);
      await load();
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Could not record result.');
    }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl">Matches</h1>
          <p className="text-mist-500 text-sm mt-1">Create, schedule, and manage matches between your registered teams.</p>
        </div>
        <PrimaryButton onClick={() => setShowForm((s) => !s)}>{showForm ? 'Close' : '+ Schedule Match'}</PrimaryButton>
      </div>

      {showForm && (
        <form onSubmit={createMatch} className="mt-5 glass rounded-2xl p-6 grid sm:grid-cols-2 gap-4">
          <Field label="Ground">
            <select className={inputClass} value={form.venueId} onChange={(e) => setForm({ ...form, venueId: e.target.value, teamAId: '', teamBId: '' })}>
              {venues.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Match Type">
            <select className={inputClass} value={form.matchType} onChange={(e) => setForm({ ...form, matchType: e.target.value })}>
              {['League Match', 'Friendly Match', 'Competitive Match', 'Tournament Match'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Team A">
            <select className={inputClass} value={form.teamAId} onChange={(e) => setForm({ ...form, teamAId: e.target.value })}>
              <option value="">Select team</option>
              {teamsForSelectedVenue.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Team B">
            <select className={inputClass} value={form.teamBId} onChange={(e) => setForm({ ...form, teamBId: e.target.value })}>
              <option value="">Select team</option>
              {teamsForSelectedVenue.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input type="date" min={todayISO()} className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Time">
            <input type="time" className={inputClass} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? 'Scheduling…' : 'Schedule Match'}
            </PrimaryButton>
          </div>
        </form>
      )}

      {resultTarget && (
        <form onSubmit={submitResult} className="mt-5 glass rounded-2xl p-6 grid sm:grid-cols-2 gap-4">
          <p className="sm:col-span-2 text-sm text-mist-300">
            Recording result for <strong>{teamNameById(resultTarget.teamAId)}</strong> vs <strong>{teamNameById(resultTarget.teamBId)}</strong>
          </p>
          <Field label={`${teamNameById(resultTarget.teamAId)} Score`}>
            <input type="number" className={inputClass} value={resultForm.scoreA} onChange={(e) => setResultForm({ ...resultForm, scoreA: Number(e.target.value) })} />
          </Field>
          <Field label={`${teamNameById(resultTarget.teamBId)} Score`}>
            <input type="number" className={inputClass} value={resultForm.scoreB} onChange={(e) => setResultForm({ ...resultForm, scoreB: Number(e.target.value) })} />
          </Field>
          <Field label="MVP">
            <input className={inputClass} value={resultForm.mvp} onChange={(e) => setResultForm({ ...resultForm, mvp: e.target.value })} />
          </Field>
          <Field label="Notes">
            <input className={inputClass} value={resultForm.notes} onChange={(e) => setResultForm({ ...resultForm, notes: e.target.value })} />
          </Field>
          <div className="sm:col-span-2 flex gap-3">
            <SecondaryButton onClick={() => setResultTarget(null)}>Cancel</SecondaryButton>
            <PrimaryButton type="submit">Save Result</PrimaryButton>
          </div>
        </form>
      )}

      <div className="mt-8">
        {matches.length === 0 ? (
          <EmptyState title="No matches yet" description="Schedule your first match between two approved teams." />
        ) : (
          <div className="overflow-x-auto glass rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-mist-500 border-b border-white/10">
                  <th className="py-3 px-4 font-normal">Match</th>
                  <th className="py-3 px-4 font-normal">Date</th>
                  <th className="py-3 px-4 font-normal">Status</th>
                  <th className="py-3 px-4 font-normal">Result</th>
                  <th className="py-3 px-4 font-normal">Actions</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <tr key={m.id} className="border-b border-white/5">
                    <td className="py-3 px-4">
                      {teamNameById(m.teamAId)} vs {teamNameById(m.teamBId)}
                    </td>
                    <td className="py-3 px-4">{m.date} · {m.time}</td>
                    <td className="py-3 px-4">
                      <Badge tone={m.status === 'completed' ? 'info' : m.status === 'confirmed' ? 'success' : 'danger'}>{m.status}</Badge>
                    </td>
                    <td className="py-3 px-4 font-mono">{m.result ? `${m.result.scoreA} – ${m.result.scoreB}` : '—'}</td>
                    <td className="py-3 px-4">
                      {m.status === 'confirmed' && (
                        <button onClick={() => { setResultTarget(m); setResultForm({ scoreA: 0, scoreB: 0, mvp: '', notes: '' }); }} className="text-pitch-400 text-xs hover:text-pitch-300">
                          Enter Result
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

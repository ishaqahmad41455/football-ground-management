'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { Badge, Spinner, inputClass, SecondaryButton } from '@/components/ui';

interface Team {
  id: number;
  name: string;
  sportId: number;
  city: string;
  status: string;
  verified: boolean;
  playerCount: number;
  stats: { played: number; wins: number };
}

const STATUS_OPTIONS = ['pending', 'approved', 'suspended', 'blocked'];

export default function AdminTeamsPage() {
  const { push } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const qs = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
    const list = await api<Team[]>(`/admin/teams${qs}`);
    setTeams(list);
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
                <tr key={t.id} className="border-b border-white/5">
                  <td className="py-3 px-4">
                    <Link href={`/teams/${t.id}`} className="hover:text-pitch-400">
                      {t.name}
                    </Link>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

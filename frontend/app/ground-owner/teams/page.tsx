'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { Badge, Spinner, EmptyState, inputClass } from '@/components/ui';

interface Team {
  id: number;
  name: string;
  sportId: number;
  city: string;
  status: string;
  captainName: string;
  captainPhone: string;
  captainEmail: string;
  playerCount: number;
  stats: { played: number; wins: number };
}

const STATUS_OPTIONS = ['pending', 'approved', 'suspended', 'blocked'];

export default function GroundOwnerTeamsPage() {
  const { push } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const list = await api<Team[]>('/ground-owner/teams');
    setTeams(list);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: number, status: string) {
    setBusyId(id);
    try {
      await api(`/ground-owner/teams/${id}/status`, { method: 'PATCH', body: { status } });
      push('success', `Team status updated to ${status}.`);
      await load();
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Could not update status.');
    } finally {
      setBusyId(null);
    }
  }

  const filtered = statusFilter === 'all' ? teams : teams.filter((t) => t.status === statusFilter);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl">Teams</h1>
          <p className="text-mist-500 text-sm mt-1">Teams registered under your ground(s).</p>
        </div>
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
      ) : filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No teams here yet" description="Teams that register under your ground will show up here for approval." />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto glass rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-mist-500 border-b border-white/10">
                <th className="py-3 px-4 font-normal">Team</th>
                <th className="py-3 px-4 font-normal">Captain</th>
                <th className="py-3 px-4 font-normal">Players</th>
                <th className="py-3 px-4 font-normal">Record</th>
                <th className="py-3 px-4 font-normal">Status</th>
                <th className="py-3 px-4 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-white/5">
                  <td className="py-3 px-4">{t.name}</td>
                  <td className="py-3 px-4">
                    <div>{t.captainName}</div>
                    <div className="text-xs text-mist-500">{t.captainPhone}</div>
                  </td>
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
                      {t.status !== 'blocked' && (
                        <button disabled={busyId === t.id} onClick={() => updateStatus(t.id, 'blocked')} className="text-clay-400 text-xs hover:text-clay-300">
                          Block
                        </button>
                      )}
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

'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Badge, Spinner, inputClass } from '@/components/ui';

interface Match {
  id: number;
  teamAId: number;
  teamBId: number;
  sportId: number;
  date: string;
  time: string;
  status: string;
  matchType: string;
  result: any;
}

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teamsById, setTeamsById] = useState<Record<number, any>>({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api<Match[]>('/admin/matches'), api<any[]>('/teams', { auth: false })]).then(([m, t]) => {
      setMatches(m);
      setTeamsById(Object.fromEntries(t.map((x) => [x.id, x])));
      setLoading(false);
    });
  }, []);

  const filtered = statusFilter === 'all' ? matches : matches.filter((m) => m.status === statusFilter);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display font-bold text-2xl">Matches</h1>
        <select className={`${inputClass} w-auto`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {['all', 'awaiting_payment', 'confirmed', 'completed', 'cancelled'].map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
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
                <th className="py-3 px-4 font-normal">Match</th>
                <th className="py-3 px-4 font-normal">Type</th>
                <th className="py-3 px-4 font-normal">Date</th>
                <th className="py-3 px-4 font-normal">Status</th>
                <th className="py-3 px-4 font-normal">Result</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-white/5">
                  <td className="py-3 px-4">
                    {teamsById[m.teamAId]?.name || '—'} vs {teamsById[m.teamBId]?.name || '—'}
                  </td>
                  <td className="py-3 px-4">{m.matchType}</td>
                  <td className="py-3 px-4">{m.date} · {m.time}</td>
                  <td className="py-3 px-4">
                    <Badge
                      tone={
                        m.status === 'completed'
                          ? 'info'
                          : m.status === 'confirmed'
                          ? 'success'
                          : m.status === 'cancelled'
                          ? 'danger'
                          : 'warning'
                      }
                    >
                      {m.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 font-mono">{m.result ? `${m.result.scoreA} – ${m.result.scoreB}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

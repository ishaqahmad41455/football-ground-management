'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Badge, Spinner, inputClass } from '@/components/ui';

interface Sport {
  id: number;
  name: string;
  icon: string;
}
interface RankRow {
  rank: number;
  team: { id: number; name: string; city: string; verified: boolean };
  stats: { played: number; wins: number; losses: number; draws: number; points: number; scoreFor: number; scoreAgainst: number };
}

export default function RankingsPage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [sportId, setSportId] = useState<number | null>(null);
  const [rows, setRows] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Sport[]>('/sports', { auth: false }).then((s) => {
      setSports(s);
      setSportId(s[0]?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!sportId) return;
    setLoading(true);
    api<RankRow[]>(`/rankings?sportId=${sportId}`, { auth: false })
      .then(setRows)
      .finally(() => setLoading(false));
  }, [sportId]);

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <h1 className="font-display font-bold text-3xl">Rankings</h1>
      <p className="text-mist-500 mt-2">Ranked by points (3 per win, 1 per draw), then goal/run difference.</p>

      <select className={`${inputClass} w-auto mt-6`} value={sportId ?? ''} onChange={(e) => setSportId(Number(e.target.value))}>
        {sports.map((s) => (
          <option key={s.id} value={s.id}>
            {s.icon} {s.name}
          </option>
        ))}
      </select>

      <div className="mt-6 glass rounded-2xl overflow-hidden">
        {loading ? (
          <Spinner />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-mist-500 border-b border-white/10">
                <th className="py-3 px-4 font-normal">#</th>
                <th className="py-3 px-4 font-normal">Team</th>
                <th className="py-3 px-4 font-normal text-center">P</th>
                <th className="py-3 px-4 font-normal text-center">W</th>
                <th className="py-3 px-4 font-normal text-center">L</th>
                <th className="py-3 px-4 font-normal text-center">D</th>
                <th className="py-3 px-4 font-normal text-center">GD</th>
                <th className="py-3 px-4 font-normal text-center">Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.team.id} className="border-b border-white/5 hover:bg-white/3">
                  <td className="py-3 px-4 font-mono text-mist-500">{r.rank}</td>
                  <td className="py-3 px-4">
                    <Link href={`/teams/${r.team.id}`} className="hover:text-pitch-400 flex items-center gap-2">
                      {r.team.name}
                      {r.team.verified && <Badge tone="success">✓</Badge>}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-center font-mono">{r.stats.played}</td>
                  <td className="py-3 px-4 text-center font-mono text-pitch-400">{r.stats.wins}</td>
                  <td className="py-3 px-4 text-center font-mono text-clay-400">{r.stats.losses}</td>
                  <td className="py-3 px-4 text-center font-mono">{r.stats.draws}</td>
                  <td className="py-3 px-4 text-center font-mono">{r.stats.scoreFor - r.stats.scoreAgainst}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold">{r.stats.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

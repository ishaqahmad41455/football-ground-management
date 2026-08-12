'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Badge, EmptyState, Spinner, inputClass, Field } from '@/components/ui';

interface Team {
  id: number;
  name: string;
  sportId: number;
  city: string;
  rating: number;
  verified: boolean;
  stats: { played: number; wins: number };
}
interface Match {
  id: number;
  sportId: number;
  date: string;
  time: string;
  status: string;
  matchType: string;
  teamAId: number;
  teamBId: number;
}
interface Sport {
  id: number;
  name: string;
  icon: string;
}

export default function FindMatchPage() {
  const [tab, setTab] = useState<'teams' | 'matches'>('teams');
  const [sports, setSports] = useState<Sport[]>([]);
  const [sportFilter, setSportFilter] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teamsById, setTeamsById] = useState<Record<number, Team>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Sport[]>('/sports', { auth: false }).then(setSports);
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (sportFilter !== 'all') qs.set('sportId', String(sportFilter));
    if (search) qs.set('search', search);
    Promise.all([
      api<Team[]>(`/teams?${qs.toString()}`, { auth: false }),
      api<Match[]>(`/matches?status=confirmed${sportFilter !== 'all' ? `&sportId=${sportFilter}` : ''}`, { auth: false }),
    ]).then(([t, m]) => {
      setTeams(t);
      setMatches(m);
      setTeamsById(Object.fromEntries(t.map((x) => [x.id, x])));
      setLoading(false);
    });
  }, [sportFilter, search]);

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <h1 className="font-display font-bold text-3xl">Find a Match</h1>
      <p className="text-mist-500 mt-2">Browse teams and open matches across the community.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 glass rounded-full p-1">
          {(['teams', 'matches'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full text-sm capitalize transition-colors ${
                tab === t ? 'bg-pitch-500 text-night-900 font-semibold' : 'text-mist-400'
              }`}
            >
              {t === 'teams' ? 'Teams' : 'Upcoming Matches'}
            </button>
          ))}
        </div>
        <select className={`${inputClass} w-auto`} value={sportFilter} onChange={(e) => setSportFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          <option value="all">All sports</option>
          {sports.map((s) => (
            <option key={s.id} value={s.id}>
              {s.icon} {s.name}
            </option>
          ))}
        </select>
        {tab === 'teams' && (
          <input className={`${inputClass} max-w-xs`} placeholder="Search teams…" value={search} onChange={(e) => setSearch(e.target.value)} />
        )}
      </div>

      <div className="mt-8">
        {loading ? (
          <Spinner />
        ) : tab === 'teams' ? (
          teams.length === 0 ? (
            <EmptyState title="No teams found" description="Try a different sport or search term." />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((t) => (
                <Link key={t.id} href={`/teams/${t.id}`} className="glass rounded-2xl p-5 hover:border-white/25 border border-transparent transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-white/8 flex items-center justify-center font-display font-bold">{t.name.charAt(0)}</div>
                    {t.verified && <Badge tone="success">Verified</Badge>}
                  </div>
                  <div className="mt-3 font-display font-semibold">{t.name}</div>
                  <div className="text-xs text-mist-500 mt-1">{t.city} · {t.sportId === 1 ? 'Futsal' : 'Cricket'}</div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span>⭐ {t.rating || '—'}</span>
                    <span className="text-mist-500">{t.stats?.wins ?? 0}W / {t.stats?.played ?? 0}P</span>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : matches.length === 0 ? (
          <EmptyState title="No open matches" description="Confirmed upcoming matches will show up here." />
        ) : (
          <div className="space-y-3">
            {matches.map((m) => {
              const a = teamsById[m.teamAId];
              const b = teamsById[m.teamBId];
              return (
                <div key={m.id} className="glass rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{a?.name || 'Team A'}</span>
                    <span className="text-mist-500 text-sm">vs</span>
                    <span className="font-medium">{b?.name || 'Team B'}</span>
                  </div>
                  <div className="text-xs text-mist-500">{m.date} · {m.time} · {m.matchType}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

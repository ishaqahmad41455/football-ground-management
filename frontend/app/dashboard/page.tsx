'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Badge, Spinner, StatCard } from '@/components/ui';

interface Match {
  id: number;
  teamAId: number;
  teamBId: number;
  sportId: number;
  venueId: number;
  date: string;
  time: string;
  status: string;
  matchType: string;
  result: any;
}

const quickActions = [
  { href: '/dashboard/schedule', label: 'Schedule Match', icon: '📅' },
  { href: '/find-match', label: 'Invite Team', icon: '✉' },
  { href: '/dashboard/players', label: 'Manage Players', icon: '👥' },
  { href: '/rankings', label: 'View Rankings', icon: '🏆' },
  { href: '/dashboard/payments', label: 'Payments', icon: '💳' },
  { href: '/dashboard/team-profile', label: 'Team Profile', icon: '🛡' },
];

export default function DashboardHome() {
  const { team, refreshTeam } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [teamsById, setTeamsById] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshTeam();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!team) return;
    api<Match[]>(`/matches?teamId=${team.id}`, { auth: false })
      .then(async (list) => {
        setMatches(list);
        const ids = new Set<number>();
        list.forEach((m) => {
          ids.add(m.teamAId);
          ids.add(m.teamBId);
        });
        const entries = await Promise.all(
          Array.from(ids).map(async (id) => [id, await api<any>(`/teams/${id}`, { auth: false })] as const)
        );
        setTeamsById(Object.fromEntries(entries));
      })
      .finally(() => setLoading(false));
  }, [team]);

  if (!team) return <Spinner />;

  const upcoming = matches.filter((m) => m.status === 'confirmed').sort((a, b) => a.date.localeCompare(b.date));
  const recent = matches.filter((m) => m.status === 'completed').sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-16 h-16 rounded-2xl bg-white/8 flex items-center justify-center font-display font-bold text-2xl">
          {team.name.charAt(0)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-2xl">{team.name}</h1>
            {team.status === 'pending' && <Badge tone="warning">Pending approval</Badge>}
            {team.status === 'approved' && <Badge tone="success">Active</Badge>}
          </div>
          <p className="text-mist-500 text-sm mt-1">
            {team.sportId === 1 ? 'Futsal' : 'Cricket'} · Captain {team.captainName} · {team.city}
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Matches Played" value={team.stats?.played ?? 0} />
        <StatCard label="Wins" value={team.stats?.wins ?? 0} />
        <StatCard label="Losses" value={team.stats?.losses ?? 0} />
        <StatCard label="Win %" value={team.stats?.winPercentage ?? 0} suffix="%" />
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quickActions.map((a) => (
          <Link key={a.href} href={a.href} className="glass rounded-xl px-4 py-3.5 flex items-center gap-3 hover:border-white/25 border border-transparent transition-colors text-sm">
            <span className="text-lg">{a.icon}</span>
            {a.label}
          </Link>
        ))}
      </div>

      <div className="mt-10 grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="font-display font-semibold text-lg mb-3">Upcoming Matches</h2>
          {loading ? (
            <Spinner />
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-mist-500 glass rounded-2xl px-5 py-8 text-center">No upcoming matches yet. Schedule one!</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((m) => (
                <MatchRow key={m.id} match={m} team={team} teamsById={teamsById} />
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="font-display font-semibold text-lg mb-3">Recent Matches</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-mist-500 glass rounded-2xl px-5 py-8 text-center">No completed matches yet.</p>
          ) : (
            <div className="space-y-3">
              {recent.slice(0, 5).map((m) => (
                <MatchRow key={m.id} match={m} team={team} teamsById={teamsById} showResult />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchRow({ match, team, teamsById, showResult }: { match: Match; team: any; teamsById: Record<number, any>; showResult?: boolean }) {
  const isA = match.teamAId === team.id;
  const opponent = teamsById[isA ? match.teamBId : match.teamAId];
  const mine = match.result ? (isA ? match.result.scoreA : match.result.scoreB) : null;
  const theirs = match.result ? (isA ? match.result.scoreB : match.result.scoreA) : null;

  return (
    <Link href={`/teams/${opponent?.id}`} className="glass rounded-xl p-4 flex items-center justify-between hover:border-white/25 border border-transparent transition-colors">
      <div>
        <div className="font-medium text-sm">vs {opponent?.name || 'Opponent'}</div>
        <div className="text-xs text-mist-500 mt-1">
          {match.date} · {match.time} · {match.matchType}
        </div>
      </div>
      {showResult && match.result ? (
        <div className="font-mono font-bold text-lg">
          {mine} <span className="text-mist-500 text-sm">–</span> {theirs}
        </div>
      ) : (
        <Badge tone="success">Confirmed</Badge>
      )}
    </Link>
  );
}

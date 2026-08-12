'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { Badge, Spinner, StatCard, EmptyState, PrimaryButton } from '@/components/ui';

export default function TeamProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { team: myTeam } = useAuth();
  const { push } = useToast();
  const [team, setTeam] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params?.id;
    if (!id) return;
    Promise.all([api<any>(`/teams/${id}`, { auth: false }), api<any[]>(`/matches?teamId=${id}`, { auth: false })])
      .then(([t, m]) => {
        setTeam(t);
        setMatches(m);
      })
      .finally(() => setLoading(false));
  }, [params?.id]);

  if (loading) return <Spinner />;
  if (!team) return <EmptyState title="Team not found" description="This team profile does not exist." />;

  const upcoming = matches.filter((m) => m.status === 'confirmed');
  const completed = matches.filter((m) => m.status === 'completed');

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="glass rounded-2xl p-6 flex flex-wrap items-center gap-5 justify-between">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-white/8 flex items-center justify-center font-display font-bold text-3xl">
            {team.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-bold text-2xl">{team.name}</h1>
              {team.verified && <Badge tone="success">Verified</Badge>}
            </div>
            <p className="text-mist-500 text-sm mt-1">
              {team.sportId === 1 ? '⚽ Futsal' : '🏏 Cricket'} · {team.city} · Captain {team.captainName}
            </p>
          </div>
        </div>
        {myTeam && myTeam.id !== team.id && (
          <PrimaryButton
            onClick={() => {
              push('info', 'Head to Schedule Match to reserve a slot and challenge this team.');
              router.push('/dashboard/schedule');
            }}
          >
            Challenge Team
          </PrimaryButton>
        )}
      </div>

      {team.description && <p className="mt-5 text-mist-300">{team.description}</p>}

      <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Rating" value={team.rating || '—'} />
        <StatCard label="Played" value={team.stats?.played ?? 0} />
        <StatCard label="Wins" value={team.stats?.wins ?? 0} />
        <StatCard label="Losses" value={team.stats?.losses ?? 0} />
        <StatCard label="Win %" value={team.stats?.winPercentage ?? 0} suffix="%" />
      </div>

      <div className="mt-10 grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-display font-semibold text-lg mb-3">Squad ({team.players?.length ?? 0})</h2>
          <div className="grid grid-cols-2 gap-2">
            {(team.players || []).map((p: any) => (
              <div key={p.id} className="glass rounded-xl px-3 py-2.5 text-sm flex items-center justify-between">
                <span>{p.name}</span>
                <span className="text-mist-500 font-mono text-xs">#{p.jerseyNumber}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-display font-semibold text-lg mb-3">Upcoming Matches</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-mist-500 glass rounded-xl px-4 py-6 text-center">No upcoming matches.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((m) => (
                <div key={m.id} className="glass rounded-xl px-4 py-3 text-sm flex justify-between">
                  <span>{m.date} · {m.time}</span>
                  <Badge tone="success">Confirmed</Badge>
                </div>
              ))}
            </div>
          )}
          <h2 className="font-display font-semibold text-lg mb-3 mt-6">Match History</h2>
          {completed.length === 0 ? (
            <p className="text-sm text-mist-500 glass rounded-xl px-4 py-6 text-center">No matches played yet.</p>
          ) : (
            <div className="space-y-2">
              {completed.slice(0, 6).map((m) => (
                <div key={m.id} className="glass rounded-xl px-4 py-3 text-sm flex justify-between">
                  <span>{m.date}</span>
                  <span className="font-mono">{m.result?.scoreA} – {m.result?.scoreB}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

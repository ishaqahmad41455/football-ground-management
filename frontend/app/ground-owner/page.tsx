'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { StatCard, Spinner, Badge } from '@/components/ui';

interface Stats {
  totalGrounds: number;
  totalTeams: number;
  pendingTeams: number;
  totalMatches: number;
  upcomingMatches: number;
  completedMatches: number;
  activeBookings: number;
  revenue: number;
}

export default function GroundOwnerHome() {
  const { name, venues } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api<Stats>('/ground-owner/stats').then(setStats);
  }, []);

  if (!stats) return <Spinner />;

  return (
    <div>
      <h1 className="font-display font-bold text-2xl">Welcome, {name}</h1>
      <p className="text-mist-500 text-sm mt-1">
        Managing {venues.length} ground{venues.length === 1 ? '' : 's'}:{' '}
        {venues.map((v) => v.name).join(', ') || '—'}
      </p>

      {stats.pendingTeams > 0 && (
        <div className="mt-5 rounded-xl border border-floodlight-500/30 bg-floodlight-500/10 px-4 py-3 text-sm text-floodlight-500 flex items-center justify-between">
          <span>
            {stats.pendingTeams} team{stats.pendingTeams === 1 ? '' : 's'} waiting on your approval.
          </span>
          <a href="/ground-owner/teams" className="underline hover:text-floodlight-400">
            Review now →
          </a>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Grounds" value={stats.totalGrounds} />
        <StatCard label="Teams" value={stats.totalTeams} />
        <StatCard label="Pending Teams" value={stats.pendingTeams} />
        <StatCard label="Active Bookings" value={stats.activeBookings} />
        <StatCard label="Total Matches" value={stats.totalMatches} />
        <StatCard label="Upcoming" value={stats.upcomingMatches} />
        <StatCard label="Completed" value={stats.completedMatches} />
        <StatCard label="Revenue" value={`PKR ${stats.revenue.toLocaleString()}`} />
      </div>

      <div className="mt-8 glass rounded-2xl p-5">
        <h2 className="font-display font-semibold text-sm text-mist-300 mb-3">Your Grounds</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {venues.map((v: any) => (
            <div key={v.id} className="rounded-xl border border-white/10 px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{v.name}</div>
                <div className="text-xs text-mist-500 mt-0.5">{v.city}</div>
              </div>
              <Badge tone="success">{v.status}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

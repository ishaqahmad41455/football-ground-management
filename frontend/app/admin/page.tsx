'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '@/lib/api';
import { StatCard, Spinner } from '@/components/ui';

interface Stats {
  totalTeams: number;
  activeTeams: number;
  pendingTeams: number;
  totalPlayers: number;
  totalMatches: number;
  upcomingMatches: number;
  completedMatches: number;
  cancelledMatches: number;
  totalRevenue: number;
  pendingPayments: number;
  activeBookings: number;
  sportsPopularity: { sport: string; matches: number; teams: number }[];
}

export default function AdminHome() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api<Stats>('/admin/stats').then(setStats);
  }, []);

  if (!stats) return <Spinner />;

  return (
    <div>
      <h1 className="font-display font-bold text-2xl">Admin Dashboard</h1>
      <p className="text-mist-500 text-sm mt-1">Platform-wide overview.</p>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Teams" value={stats.totalTeams} />
        <StatCard label="Active Teams" value={stats.activeTeams} />
        <StatCard label="Pending Approval" value={stats.pendingTeams} />
        <StatCard label="Total Players" value={stats.totalPlayers} />
        <StatCard label="Total Matches" value={stats.totalMatches} />
        <StatCard label="Upcoming" value={stats.upcomingMatches} />
        <StatCard label="Completed" value={stats.completedMatches} />
        <StatCard label="Cancelled" value={stats.cancelledMatches} />
      </div>

      <div className="mt-6 grid md:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 md:col-span-1">
          <div className="text-xs uppercase tracking-wider text-mist-500">Total Revenue</div>
          <div className="font-mono text-3xl font-bold mt-2 text-pitch-400">PKR {stats.totalRevenue.toLocaleString()}</div>
          <div className="text-xs text-mist-500 mt-3">{stats.pendingPayments} pending payment(s)</div>
          <div className="text-xs text-mist-500">{stats.activeBookings} active bookings</div>
        </div>
        <div className="glass rounded-2xl p-5 md:col-span-2">
          <div className="text-xs uppercase tracking-wider text-mist-500 mb-4">Sport Popularity (matches)</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.sportsPopularity}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="sport" stroke="#8B93A7" fontSize={12} />
              <YAxis stroke="#8B93A7" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#111726', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
              <Bar dataKey="matches" fill="#2BD97C" radius={[6, 6, 0, 0]} />
              <Bar dataKey="teams" fill="#F2664B" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

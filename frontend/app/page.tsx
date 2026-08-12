'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import AnimatedCounter from '@/components/AnimatedCounter';
import { Badge } from '@/components/ui';

interface PublicStats {
  registeredTeams: number;
  matchesPlayed: number;
  upcomingMatches: number;
  activePlayers: number;
  tournaments: number;
  totalMatches: number;
}

interface Team {
  id: number;
  name: string;
  sportId: number;
  city: string;
  rating: number;
  verified: boolean;
  stats: { wins: number; played: number };
}

export default function LandingPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    api<PublicStats>('/public/stats', { auth: false }).then(setStats).catch(() => {});
    api<Team[]>('/teams', { auth: false }).then((t) => setTeams(t.slice(0, 6))).catch(() => {});
  }, []);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden floodlight-bg">
        <div className="max-w-7xl mx-auto px-5 pt-16 md:pt-24 pb-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Badge tone="success">⚽ Futsal &nbsp;·&nbsp; 🏏 Cricket &nbsp;·&nbsp; live booking</Badge>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-5 font-display font-bold text-5xl md:text-6xl leading-[1.05] scoreline pb-3"
            >
              Play. Compete.
              <br />
              <span className="text-pitch-500">Win.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-mist-300 text-lg max-w-md"
            >
              Book your match, challenge the best teams, manage your squad, and compete in the ultimate sports community.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link href="/find-match" className="px-6 py-3.5 rounded-full bg-pitch-500 text-night-900 font-semibold text-sm shadow-glow hover:bg-pitch-400 transition-colors">
                Find a Match
              </Link>
              <Link href="/register" className="px-6 py-3.5 rounded-full border border-white/15 text-mist-100 font-medium text-sm hover:border-white/35 transition-colors">
                Create a Team
              </Link>
              <Link href="#teams-preview" className="px-6 py-3.5 rounded-full text-mist-300 font-medium text-sm hover:text-mist-100 transition-colors">
                Explore Teams →
              </Link>
            </motion.div>
          </div>

          {/* Signature element: two spinning "3D" balls under floodlight glow */}
          <div className="relative h-72 md:h-96 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.7, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="ball-3d w-40 h-40 md:w-56 md:h-56 absolute -translate-x-10 translate-y-6"
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.7, rotate: 20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.35 }}
              className="ball-3d cricket w-24 h-24 md:w-32 md:h-32 absolute translate-x-24 -translate-y-16"
              aria-hidden
            />
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="max-w-7xl mx-auto px-5 -mt-6 md:-mt-10 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4">
          {[
            { label: 'Registered Teams', value: stats?.registeredTeams ?? 0 },
            { label: 'Matches Played', value: stats?.matchesPlayed ?? 0 },
            { label: 'Upcoming Matches', value: stats?.upcomingMatches ?? 0 },
            { label: 'Active Players', value: stats?.activePlayers ?? 0 },
            { label: 'Tournaments', value: stats?.tournaments ?? 0 },
            { label: 'Total Matches', value: stats?.totalMatches ?? 0 },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl px-3 py-5 text-center">
              <div className="font-mono stat-number text-2xl md:text-3xl font-bold">
                <AnimatedCounter value={s.value} />
              </div>
              <div className="mt-1.5 text-[11px] uppercase tracking-wider text-mist-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SPORTS */}
      <section className="max-w-7xl mx-auto px-5 py-16">
        <h2 className="font-display font-bold text-3xl">Two sports. One arena.</h2>
        <p className="text-mist-500 mt-2 max-w-xl">Built to scale — more sports can be switched on from the admin dashboard whenever you're ready.</p>
        <div className="mt-8 grid md:grid-cols-2 gap-5">
          <SportCard
            icon="⚽"
            name="Futsal"
            tone="pitch"
            desc="Fast 5-a-side football on a compact court. Configurable squad size, match length, and venues."
            tags={['11 squad slots', 'Configurable duration', 'Formation planner']}
          />
          <SportCard
            icon="🏏"
            name="Cricket"
            tone="clay"
            desc="Classic 11-a-side limited-overs cricket, with full scoring and bowling/batting statistics."
            tags={['11 squad slots', 'Overs & innings', 'Strike-rate & economy']}
          />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-5 py-16">
        <h2 className="font-display font-bold text-3xl">From empty slot to confirmed match</h2>
        <p className="text-mist-500 mt-2 max-w-xl">A slot is reserved the moment you tap it — nobody else can take it while you decide.</p>
        <div className="mt-8 grid md:grid-cols-4 gap-4">
          {[
            { t: 'Reserve a slot', d: 'Pick a sport, venue, date and time. It\u2019s held for 10 minutes.' },
            { t: 'Invite an opponent', d: 'Send a challenge to any approved team playing your sport.' },
            { t: 'They accept', d: 'The opponent accepts, rejects, or asks for another time.' },
            { t: 'Pay & play', d: 'Confirm with payment and the match locks into both calendars.' },
          ].map((s, i) => (
            <div key={s.t} className="glass rounded-2xl p-5">
              <div className="font-mono text-pitch-500 text-sm">0{i + 1}</div>
              <div className="font-display font-semibold mt-2">{s.t}</div>
              <div className="text-sm text-mist-500 mt-1.5">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TEAMS PREVIEW */}
      <section id="teams-preview" className="max-w-7xl mx-auto px-5 py-16 scroll-mt-24">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-display font-bold text-3xl">Teams on the pitch right now</h2>
            <p className="text-mist-500 mt-2">Browse squads, ratings, and rankings before you send a challenge.</p>
          </div>
          <Link href="/find-match" className="text-sm text-pitch-400 hover:text-pitch-300">
            View all teams →
          </Link>
        </div>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((t) => (
            <Link
              key={t.id}
              href={`/teams/${t.id}`}
              className="glass rounded-2xl p-5 hover:border-white/25 transition-colors border border-transparent"
            >
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-white/8 flex items-center justify-center font-display font-bold">
                  {t.name.charAt(0)}
                </div>
                {t.verified && <Badge tone="success">Verified</Badge>}
              </div>
              <div className="mt-3 font-display font-semibold">{t.name}</div>
              <div className="text-xs text-mist-500 mt-1">{t.city} · {t.sportId === 1 ? 'Futsal' : 'Cricket'}</div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-mist-300">⭐ {t.rating || '—'}</span>
                <span className="text-mist-500">{t.stats?.played ?? 0} matches</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-7xl mx-auto px-5 py-20">
        <div className="glass-strong rounded-3xl px-8 py-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 floodlight-bg pointer-events-none" />
          <h2 className="font-display font-bold text-3xl md:text-4xl relative">Find your team. Book your ground.</h2>
          <p className="text-mist-300 mt-3 relative">Challenge your opponent. Play the game.</p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center relative">
            <Link href="/register" className="px-6 py-3.5 rounded-full bg-pitch-500 text-night-900 font-semibold text-sm shadow-glow hover:bg-pitch-400 transition-colors">
              Create a Team
            </Link>
            <Link href="/find-match" className="px-6 py-3.5 rounded-full border border-white/15 text-mist-100 font-medium text-sm hover:border-white/35 transition-colors">
              Find a Match
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function SportCard({
  icon,
  name,
  desc,
  tags,
  tone,
}: {
  icon: string;
  name: string;
  desc: string;
  tags: string[];
  tone: 'pitch' | 'clay';
}) {
  return (
    <div className={`glass rounded-2xl p-7 border ${tone === 'pitch' ? 'hover:border-pitch-500/40' : 'hover:border-clay-500/40'} transition-colors`}>
      <div className="text-4xl">{icon}</div>
      <div className="font-display font-bold text-2xl mt-3">{name}</div>
      <p className="text-sm text-mist-500 mt-2">{desc}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
      </div>
    </div>
  );
}

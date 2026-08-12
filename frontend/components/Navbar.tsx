'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function Navbar() {
  const { role, team, logout, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  if (pathname?.startsWith('/admin') && pathname !== '/admin/login') return <AdminBar />;

  const links = [
    { href: '/find-match', label: 'Find a Match' },
    { href: '/rankings', label: 'Rankings' },
    { href: '/#teams-preview', label: 'Explore Teams' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-night-900/80 backdrop-blur-xl">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-lg tracking-tight">
          <span className="w-2.5 h-2.5 rounded-full bg-pitch-500 shadow-glow" />
          SportsHub
        </Link>

        <div className="hidden md:flex items-center gap-7 text-sm text-mist-300">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-mist-100 transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {!loading && role === 'team' && (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-mist-300 hover:text-mist-100 transition-colors"
              >
                {team?.name || 'Dashboard'}
              </Link>
              <button
                onClick={() => {
                  logout();
                  router.push('/');
                }}
                className="text-sm px-4 py-2 rounded-full border border-white/10 hover:border-white/25 transition-colors"
              >
                Log out
              </button>
            </>
          )}
          {!loading && role !== 'team' && (
            <>
              <Link href="/login" className="text-sm px-4 py-2 rounded-full border border-white/10 hover:border-white/25 transition-colors">
                Team Login
              </Link>
              <Link
                href="/register"
                className="text-sm px-4 py-2 rounded-full bg-pitch-500 text-night-900 font-semibold hover:bg-pitch-400 transition-colors shadow-glow"
              >
                Create a Team
              </Link>
            </>
          )}
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
          <div className="w-6 h-0.5 bg-mist-100 mb-1.5" />
          <div className="w-6 h-0.5 bg-mist-100 mb-1.5" />
          <div className="w-6 h-0.5 bg-mist-100" />
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-white/5 px-5 py-4 flex flex-col gap-4 bg-night-900">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-mist-300">
              {l.label}
            </Link>
          ))}
          {role === 'team' ? (
            <>
              <Link href="/dashboard" onClick={() => setOpen(false)} className="text-mist-100 font-medium">
                Dashboard
              </Link>
              <button
                onClick={() => {
                  logout();
                  setOpen(false);
                  router.push('/');
                }}
                className="text-left text-clay-400"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setOpen(false)} className="text-mist-100 font-medium">
                Team Login
              </Link>
              <Link href="/register" onClick={() => setOpen(false)} className="text-pitch-400 font-semibold">
                Create a Team
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}

function AdminBar() {
  const { role, logout } = useAuth();
  const router = useRouter();
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-night-900/90 backdrop-blur-xl">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-5 py-4">
        <Link href="/admin" className="flex items-center gap-2 font-display font-bold text-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-clay-500 shadow-glowClay" />
          SportsHub <span className="text-mist-500 font-normal">Admin</span>
        </Link>
        {role === 'admin' && (
          <button
            onClick={() => {
              logout();
              router.push('/admin/login');
            }}
            className="text-sm px-4 py-2 rounded-full border border-white/10 hover:border-white/25"
          >
            Log out
          </button>
        )}
      </nav>
    </header>
  );
}

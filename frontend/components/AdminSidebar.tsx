'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/admin', label: 'Dashboard', icon: '▦' },
  { href: '/admin/teams', label: 'Teams', icon: '🛡' },
  { href: '/admin/venues', label: 'Venues', icon: '📍' },
  { href: '/admin/matches', label: 'Matches', icon: '⚔' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 gap-1 py-2">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors ${
              active ? 'bg-clay-500/12 text-clay-400 font-medium' : 'text-mist-500 hover:text-mist-100 hover:bg-white/5'
            }`}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </aside>
  );
}

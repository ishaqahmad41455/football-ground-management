import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 mt-16">
      <div className="max-w-7xl mx-auto px-5 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-mist-500">
        <div className="flex items-center gap-2 font-display font-semibold text-mist-300">
          <span className="w-2 h-2 rounded-full bg-pitch-500" />
          SportsHub
        </div>
        <p>Find your team. Book your ground. Challenge your opponent. Play the game.</p>
        <div className="flex gap-5">
          <Link href="/find-match" className="hover:text-mist-100">Find a Match</Link>
          <Link href="/rankings" className="hover:text-mist-100">Rankings</Link>
          <Link href="/admin/login" className="hover:text-mist-100">Admin</Link>
        </div>
      </div>
    </footer>
  );
}

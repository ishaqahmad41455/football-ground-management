import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ToastProvider } from '@/lib/toast-context';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Fonts are loaded via app/font-fallback.css (system font stacks) instead of
// next/font/google, so the app builds and runs fully offline / in sandboxed
// networks. Swap in next/font/google (Space Grotesk / Inter / JetBrains Mono)
// any time by uncommenting the import below once you have normal internet
// access — the CSS variable names already match.
// import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';

export const metadata: Metadata = {
  title: 'SportsHub — Play. Compete. Win.',
  description: 'Book your match, challenge the best teams, manage your squad, and compete in the ultimate sports community.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body min-h-screen flex flex-col">
        <AuthProvider>
          <ToastProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

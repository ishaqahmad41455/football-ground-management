'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { ApiError } from '@/lib/api';
import { Field, inputClass, PrimaryButton } from '@/components/ui';

export default function LoginPage() {
  const { login } = useAuth();
  const { push } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState('demo@team.com');
  const [password, setPassword] = useState('Demo@123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const role = await login(email, password);
      if (role !== 'team') {
        setError('This account is not a team account. Try the admin login instead.');
        return;
      }
      push('success', 'Welcome back!');
      router.push('/dashboard');
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Login failed.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-5 py-20">
      <h1 className="font-display font-bold text-3xl">Team login</h1>
      <p className="text-mist-500 mt-2 text-sm">
        Demo account pre-filled — just hit sign in. Or{' '}
        <Link href="/register" className="text-pitch-400 hover:text-pitch-300">
          create a new team
        </Link>
        .
      </p>

      <form onSubmit={handleSubmit} className="mt-8 glass rounded-2xl p-6 space-y-5">
        {error && <div className="rounded-xl border border-clay-500/30 bg-clay-500/10 px-4 py-3 text-sm text-clay-400">{error}</div>}
        <Field label="Email">
          <input type="email" required className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <input type="password" required className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="flex items-center justify-between text-xs text-mist-500">
          <Link href="#" className="hover:text-mist-300">
            Forgot password?
          </Link>
        </div>
        <PrimaryButton type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Signing in…' : 'Sign In'}
        </PrimaryButton>
      </form>
    </div>
  );
}

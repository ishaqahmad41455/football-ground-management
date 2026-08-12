'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { ApiError } from '@/lib/api';
import { Field, inputClass, PrimaryButton } from '@/components/ui';

export default function AdminLoginPage() {
  const { login } = useAuth();
  const { push } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState('admin@sportshub.com');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const role = await login(email, password);
      if (role !== 'admin') {
        setError('This account does not have admin access.');
        return;
      }
      push('success', 'Welcome back, admin.');
      router.push('/admin');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-5 py-20">
      <h1 className="font-display font-bold text-3xl">Admin sign in</h1>
      <p className="text-mist-500 mt-2 text-sm">Restricted access. Demo credentials pre-filled.</p>

      <form onSubmit={handleSubmit} className="mt-8 glass rounded-2xl p-6 space-y-5 border-clay-500/20">
        {error && <div className="rounded-xl border border-clay-500/30 bg-clay-500/10 px-4 py-3 text-sm text-clay-400">{error}</div>}
        <Field label="Email">
          <input type="email" required className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <input type="password" required className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <PrimaryButton type="submit" disabled={submitting} className="w-full !bg-clay-500 !shadow-glowClay hover:!bg-clay-400">
          {submitting ? 'Signing in…' : 'Sign In'}
        </PrimaryButton>
      </form>
    </div>
  );
}

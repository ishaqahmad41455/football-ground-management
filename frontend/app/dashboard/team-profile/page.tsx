'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { Field, inputClass, PrimaryButton, Spinner, Badge } from '@/components/ui';

export default function TeamProfileEditPage() {
  const { team, refreshTeam } = useAuth();
  const { push } = useToast();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (team) {
      setForm({
        name: team.name,
        description: team.description || '',
        city: team.city || '',
        area: team.area || '',
        homeGround: team.homeGround || '',
        captainName: team.captainName || '',
        captainPhone: team.captainPhone || '',
        captainEmail: team.captainEmail || '',
        preferredFormat: team.preferredFormat || '',
      });
    }
  }, [team]);

  if (!team || !form) return <Spinner />;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/teams/${team!.id}`, { method: 'PATCH', body: form });
      await refreshTeam();
      push('success', 'Team profile updated.');
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl">My Team</h1>
          <p className="text-mist-500 text-sm mt-1">Edit your public profile. See it live at your team page.</p>
        </div>
        <Link href={`/teams/${team.id}`} className="text-sm text-pitch-400 hover:text-pitch-300">
          View public profile →
        </Link>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {team.status === 'approved' && <Badge tone="success">Active</Badge>}
        {team.status === 'pending' && <Badge tone="warning">Pending approval</Badge>}
        {team.status === 'suspended' && <Badge tone="danger">Suspended</Badge>}
        {team.verified && <Badge tone="info">Verified</Badge>}
      </div>

      <form onSubmit={save} className="mt-6 glass rounded-2xl p-6 grid sm:grid-cols-2 gap-5 max-w-3xl">
        <Field label="Team Name">
          <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Preferred Format">
          <input className={inputClass} value={form.preferredFormat} onChange={(e) => setForm({ ...form, preferredFormat: e.target.value })} />
        </Field>
        <Field label="City">
          <input className={inputClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>
        <Field label="Area">
          <input className={inputClass} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
        </Field>
        <Field label="Home Ground">
          <input className={inputClass} value={form.homeGround} onChange={(e) => setForm({ ...form, homeGround: e.target.value })} />
        </Field>
        <Field label="Captain Name">
          <input className={inputClass} value={form.captainName} onChange={(e) => setForm({ ...form, captainName: e.target.value })} />
        </Field>
        <Field label="Captain Phone">
          <input className={inputClass} value={form.captainPhone} onChange={(e) => setForm({ ...form, captainPhone: e.target.value })} />
        </Field>
        <Field label="Captain Email">
          <input className={inputClass} value={form.captainEmail} onChange={(e) => setForm({ ...form, captainEmail: e.target.value })} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            <textarea rows={4} className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}

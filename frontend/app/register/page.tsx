'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { Field, inputClass, PrimaryButton, SecondaryButton } from '@/components/ui';

interface Sport {
  id: number;
  name: string;
  icon: string;
  squadLimit: number;
}

interface Venue {
  id: number;
  name: string;
  city: string;
  sportIds: number[];
}

interface PlayerDraft {
  name: string;
  jerseyNumber: number;
  position: string;
  dob: string;
  phone: string;
}

const emptyPlayer = (n: number): PlayerDraft => ({ name: '', jerseyNumber: n, position: '', dob: '', phone: '' });

export default function RegisterPage() {
  const router = useRouter();
  const { registerTeam } = useAuth();
  const { push } = useToast();

  const [step, setStep] = useState(1);
  const [sports, setSports] = useState<Sport[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [team, setTeam] = useState({
    name: '',
    sportId: '',
    venueId: '',
    description: '',
    city: '',
    area: '',
    homeGround: '',
    captainName: '',
    captainPhone: '',
    captainEmail: '',
    preferredFormat: '',
  });

  const [players, setPlayers] = useState<PlayerDraft[]>([emptyPlayer(1), emptyPlayer(2)]);

  const [account, setAccount] = useState({ email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    api<Sport[]>('/sports', { auth: false }).then(setSports).catch(() => {});
    api<Venue[]>('/venues', { auth: false }).then(setVenues).catch(() => {});
  }, []);

  const selectedSport = sports.find((s) => s.id === Number(team.sportId));
  const squadLimit = selectedSport?.squadLimit ?? 11;

  // Only grounds that support the chosen sport can be selected.
  const availableVenues = team.sportId ? venues.filter((v) => v.sportIds.includes(Number(team.sportId))) : [];

  function updatePlayer(idx: number, patch: Partial<PlayerDraft>) {
    setPlayers((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  function addPlayer() {
    if (players.length >= squadLimit) return;
    setPlayers((prev) => [...prev, emptyPlayer(prev.length + 1)]);
  }

  function removePlayer(idx: number) {
    setPlayers((prev) => prev.filter((_, i) => i !== idx).map((p, i) => ({ ...p, jerseyNumber: i + 1 })));
  }

  function validateStep1() {
    if (!team.name || !team.sportId || !team.venueId || !team.city || !team.captainName || !team.captainPhone || !team.captainEmail) {
      setError('Please fill in team name, sport, ground, city, and captain details.');
      return false;
    }
    setError('');
    return true;
  }

  function validateStep2() {
    const names = new Set<string>();
    for (const p of players) {
      if (!p.name.trim()) continue;
      const key = p.name.trim().toLowerCase();
      if (names.has(key)) {
        setError(`Duplicate player name found: "${p.name}". Please make each player unique.`);
        return false;
      }
      names.add(key);
    }
    setError('');
    return true;
  }

  async function handleSubmit() {
    if (account.password !== account.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (account.password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await registerTeam({
        team,
        players: players.filter((p) => p.name.trim()),
        account,
      });
      push('success', `Welcome, ${team.name}! Your team is registered and pending approval from your ground.`);
      router.push('/dashboard');
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Registration failed. Please try again.';
      setError(msg);
      push('error', msg);
    } finally {
      setSubmitting(false);
    }
  }

  const steps = ['Team Information', 'Team Players', 'Account'];

  return (
    <div className="max-w-3xl mx-auto px-5 py-14">
      <h1 className="font-display font-bold text-3xl">Create your team</h1>
      <p className="text-mist-500 mt-2">Three quick steps and you're on the pitch.</p>

      <div className="mt-8 flex items-center gap-3">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-3 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-semibold shrink-0 ${
                step === i + 1 ? 'bg-pitch-500 text-night-900' : step > i + 1 ? 'bg-pitch-500/30 text-pitch-400' : 'bg-white/8 text-mist-500'
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-sm hidden sm:block ${step === i + 1 ? 'text-mist-100' : 'text-mist-500'}`}>{s}</span>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-white/10" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-clay-500/30 bg-clay-500/10 px-4 py-3 text-sm text-clay-400">{error}</div>
      )}

      <div className="mt-8 glass rounded-2xl p-6 md:p-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="grid sm:grid-cols-2 gap-5">
              <Field label="Team Name">
                <input className={inputClass} value={team.name} onChange={(e) => setTeam({ ...team, name: e.target.value })} placeholder="Thunder FC" />
              </Field>
              <Field label="Sport">
                <select
                  className={inputClass}
                  value={team.sportId}
                  onChange={(e) => setTeam({ ...team, sportId: e.target.value, venueId: '' })}
                >
                  <option value="">Select a sport</option>
                  {sports.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.icon} {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Futsal Ground">
                  <select
                    className={inputClass}
                    value={team.venueId}
                    onChange={(e) => {
                      const v = venues.find((x) => x.id === Number(e.target.value));
                      setTeam({ ...team, venueId: e.target.value, homeGround: v?.name || '' });
                    }}
                    disabled={!team.sportId}
                  >
                    <option value="">{team.sportId ? 'Select the ground you want to register under' : 'Pick a sport first'}</option>
                    {availableVenues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} · {v.city}
                      </option>
                    ))}
                  </select>
                </Field>
                <p className="text-xs text-mist-700 mt-1.5">
                  Your team will register under this ground — its manager reviews and approves your registration.
                </p>
              </div>
              <Field label="City">
                <input className={inputClass} value={team.city} onChange={(e) => setTeam({ ...team, city: e.target.value })} placeholder="Rawalpindi" />
              </Field>
              <Field label="Area">
                <input className={inputClass} value={team.area} onChange={(e) => setTeam({ ...team, area: e.target.value })} placeholder="Sector F-10" />
              </Field>
              <Field label="Preferred Playing Format">
                <input className={inputClass} value={team.preferredFormat} onChange={(e) => setTeam({ ...team, preferredFormat: e.target.value })} placeholder="5-a-side / T20" />
              </Field>
              <Field label="Captain Name">
                <input className={inputClass} value={team.captainName} onChange={(e) => setTeam({ ...team, captainName: e.target.value })} placeholder="Ali Khan" />
              </Field>
              <Field label="Captain Phone">
                <input className={inputClass} value={team.captainPhone} onChange={(e) => setTeam({ ...team, captainPhone: e.target.value })} placeholder="03001234567" />
              </Field>
              <Field label="Captain Email">
                <input className={inputClass} value={team.captainEmail} onChange={(e) => setTeam({ ...team, captainEmail: e.target.value })} placeholder="captain@team.com" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Team Description">
                  <textarea className={inputClass} rows={3} value={team.description} onChange={(e) => setTeam({ ...team, description: e.target.value })} placeholder="Tell opponents what your team is about…" />
                </Field>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-mist-500">
                  {players.length} / {squadLimit} players added
                </p>
                <SecondaryButton onClick={addPlayer} disabled={players.length >= squadLimit}>
                  + Add Player
                </SecondaryButton>
              </div>
              <div className="space-y-4 max-h-[440px] overflow-y-auto pr-1">
                {players.map((p, idx) => (
                  <div key={idx} className="rounded-xl border border-white/10 p-4 grid sm:grid-cols-5 gap-3 items-end">
                    <Field label="Full Name">
                      <input className={inputClass} value={p.name} onChange={(e) => updatePlayer(idx, { name: e.target.value })} placeholder={`Player ${idx + 1}`} />
                    </Field>
                    <Field label="Jersey #">
                      <input type="number" className={inputClass} value={p.jerseyNumber} onChange={(e) => updatePlayer(idx, { jerseyNumber: Number(e.target.value) })} />
                    </Field>
                    <Field label="Position">
                      <input className={inputClass} value={p.position} onChange={(e) => updatePlayer(idx, { position: e.target.value })} placeholder="GK / FWD" />
                    </Field>
                    <Field label="Phone">
                      <input className={inputClass} value={p.phone} onChange={(e) => updatePlayer(idx, { phone: e.target.value })} placeholder="0301…" />
                    </Field>
                    <button onClick={() => removePlayer(idx)} className="text-clay-400 text-xs hover:text-clay-300 pb-2.5">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-mist-700 mt-3">You can add the rest of your squad later from the dashboard — up to {squadLimit} players.</p>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="grid gap-5 max-w-sm">
              <Field label="Email">
                <input type="email" className={inputClass} value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} placeholder="you@team.com" />
              </Field>
              <Field label="Password">
                <input type="password" className={inputClass} value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} />
              </Field>
              <Field label="Confirm Password">
                <input type="password" className={inputClass} value={account.confirmPassword} onChange={(e) => setAccount({ ...account, confirmPassword: e.target.value })} />
              </Field>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex justify-between">
          <SecondaryButton onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
            Back
          </SecondaryButton>
          {step < 3 ? (
            <PrimaryButton
              onClick={() => {
                if (step === 1 && !validateStep1()) return;
                if (step === 2 && !validateStep2()) return;
                setStep((s) => s + 1);
              }}
            >
              Continue
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Creating team…' : 'Create Team'}
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) {
  const tones: Record<string, string> = {
    default: 'bg-white/8 text-mist-300 border-white/10',
    success: 'bg-pitch-500/15 text-pitch-400 border-pitch-500/30',
    warning: 'bg-floodlight-500/15 text-floodlight-500 border-floodlight-500/30',
    danger: 'bg-clay-500/15 text-clay-400 border-clay-500/30',
    info: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function StatCard({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="glass rounded-2xl px-5 py-6 text-center"
    >
      <div className="font-mono stat-number text-3xl md:text-4xl font-bold text-mist-100">
        {value}
        {suffix}
      </div>
      <div className="mt-2 text-xs uppercase tracking-wider text-mist-500">{label}</div>
    </motion.div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="glass rounded-2xl px-6 py-14 text-center">
      <p className="font-display font-semibold text-lg text-mist-100">{title}</p>
      <p className="mt-2 text-sm text-mist-500 max-w-sm mx-auto">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-mist-500 text-sm">
      <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-pitch-500 animate-spin" />
      {label}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-3 rounded-full bg-pitch-500 text-night-900 font-semibold text-sm hover:bg-pitch-400 transition-colors shadow-glow disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  type = 'button',
  disabled,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-3 rounded-full border border-white/15 text-mist-100 font-medium text-sm hover:border-white/35 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-mist-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  'w-full rounded-xl bg-night-700/70 border border-white/10 px-4 py-2.5 text-sm text-mist-100 placeholder:text-mist-700 focus:border-pitch-500/60 outline-none transition-colors';

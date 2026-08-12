'use client';

import { useEffect, useState } from 'react';

export default function Countdown({ expiresAt, onExpire }: { expiresAt: number; onExpire?: () => void }) {
  const [remaining, setRemaining] = useState(expiresAt - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const r = expiresAt - Date.now();
      setRemaining(r);
      if (r <= 0) {
        clearInterval(id);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpire]);

  const total = Math.max(0, Math.floor(remaining / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;

  return (
    <span className="font-mono font-semibold text-floodlight-500">
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

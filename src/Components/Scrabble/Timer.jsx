import React, { useEffect, useMemo, useState } from 'react';

function useTurnTimer(turnEndsAt) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!turnEndsAt) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [turnEndsAt]);
  const remainingMs = useMemo(() => {
    if (!turnEndsAt) return undefined;
    return Math.max(0, turnEndsAt - now);
  }, [turnEndsAt, now]);
  return remainingMs;
}

function formatMs(ms) {
  if (ms == null) return '--:--';
  const totalSec = Math.floor(ms / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function Timer({ turnEndsAt }) {
  const remaining = useTurnTimer(turnEndsAt);
  return (
    <div className='mt-3'>
      <h6>Timer</h6>
      <div className="display-6 infos">{formatMs(remaining)}</div>
    </div>
  );
}


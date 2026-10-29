import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Tiny fetch wrapper. The browser attaches the `sid` cookie automatically.
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// Call `load` now and every `ms` after. If the server ever answers 401
// (session revoked, expired, banned), go to the login page and say why.
export function usePolling(load, ms) {
  const navigate = useNavigate();
  const saved = useRef(load);
  saved.current = load;

  useEffect(() => {
    let alive = true;
    async function tick() {
      const res = await saved.current();
      if (alive && res?.status === 401) {
        navigate('/login', { replace: true, state: { reason: res.data } });
      }
    }
    tick();
    const timer = setInterval(tick, ms);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [ms, navigate]);
}

export const money = (n) =>
  n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

export const clock = (d) =>
  new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });

export function ago(d) {
  const s = Math.max(0, Math.round((Date.now() - new Date(d)) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export function countdown(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const shortId = (id) => `${id.slice(0, 6)}…${id.slice(-4)}`;

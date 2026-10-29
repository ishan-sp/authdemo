// Tiny fetch wrapper. The session cookie is sent automatically by the browser.
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export const ROLES = ['basic', 'pro', 'elite'];

export const ROLE_LABEL = { basic: 'Basic', pro: 'Pro', elite: 'Elite' };

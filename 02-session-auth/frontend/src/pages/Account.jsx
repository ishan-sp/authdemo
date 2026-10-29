import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Clock, Laptop, ShieldCheck } from 'lucide-react';
import Nav from '../components/Nav.jsx';
import { api, usePolling, money, clock, ago, countdown } from '../api.js';

export default function Account() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [bank, setBank] = useState(null);
  const [devices, setDevices] = useState([]);
  const [now, setNow] = useState(Date.now());

  // A real action: loads who we are AND resets the idle timer.
  async function loadMe() {
    const res = await api('/api/auth/me');
    if (res.status === 401) {
      return navigate('/login', { replace: true, state: { reason: res.data } });
    }
    if (res.data.user.role === 'admin') return navigate('/admin', { replace: true });
    setMe(res.data);
  }

  useEffect(() => {
    loadMe();
    api('/api/account').then((res) => res.ok && setBank(res.data));
  }, []);

  // Every 3s, check the session still exists. This is how the page
  // notices, within seconds, that an admin revoked it.
  usePolling(async () => {
    const res = await api('/api/my-sessions');
    if (res.ok) setDevices(res.data.sessions);
    return res;
  }, 3000);

  // A 1-second clock for the idle countdown.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  async function revoke(id) {
    await api(`/api/my-sessions/${id}/revoke`, { method: 'POST' });
    toast.success('That device has been signed out.');
    loadMe();
  }

  async function revokeOthers() {
    const res = await api('/api/my-sessions/revoke-others', { method: 'POST' });
    toast.success(`Signed out of ${res.data.revoked} other session(s).`);
    loadMe();
  }

  if (!me) return <Nav />;

  const { user, session, idleMinutes } = me;
  const remaining = new Date(session.expiresAt) - now;

  return (
    <>
      <Nav user={user} />

      {remaining < 60_000 && (
        <div className="timeout-banner">
          <Clock size={16} />
          For your security, you'll be signed out in <strong>{countdown(remaining)}</strong>.
          <button className="button button-small" onClick={loadMe}>Stay signed in</button>
        </div>
      )}

      <main className="page">
        <header className="page-header">
          <p className="eyebrow">Harbor online banking</p>
          <h1 className="headline">Hello, {user.name.split(' ')[0]}.</h1>
          <p className="lede">Here's where your money stands today.</p>
        </header>

        <section className="accounts">
          {bank?.accounts.map((a) => (
            <article key={a.number} className="card account">
              <span className="muted small">{a.type} · {a.number}</span>
              <span className="balance">{money(a.balance)}</span>
              <span className="muted small">Available balance</span>
            </article>
          ))}
        </section>

        <section className="card">
          <h2 className="card-title">Recent activity</h2>
          <ul className="tx">
            {bank?.transactions.map((t, i) => (
              <li key={i}>
                <span>{t.description}</span>
                <span className="muted small">{new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                <span className={t.amount > 0 ? 'credit' : ''}>
                  {t.amount > 0 ? '+' : '−'}{money(Math.abs(t.amount))}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <h2 className="section-title">Security</h2>
        <section className="concepts">
          <article className="card">
            <div className="card-head">
              <span className="concept-tag">This session</span>
              <span className="pill pill-ok">Active</span>
            </div>
            <h2 className="card-title">Your browser holds one random id.</h2>
            <p className="muted">
              Everything else (who you are, when you expire, whether you've been revoked) is stored
              on the server, in the <code>sessions</code> collection.
            </p>

            <div className="sid">
              <span className="muted small">Session id · cookie <code>sid</code> · HttpOnly · SameSite=Strict</span>
              <code>{session.id}</code>
            </div>

            <dl className="facts">
              <div><dt>Signed in</dt><dd>{clock(session.createdAt)}</dd></div>
              <div><dt>Last activity</dt><dd>{clock(session.lastSeenAt)}</dd></div>
              <div>
                <dt>Idle timeout</dt>
                <dd className={remaining < 60_000 ? 'warn-text' : ''}>
                  {countdown(remaining)} <span className="muted small">of {idleMinutes}:00</span>
                </dd>
              </div>
              <div><dt>Hard limit</dt><dd>{clock(session.absoluteExpiresAt)}</dd></div>
              <div><dt>Device</dt><dd>{session.device}</dd></div>
              <div><dt>IP address</dt><dd>{session.ip}</dd></div>
            </dl>
            <button className="button button-secondary refresh" onClick={loadMe}>
              <ShieldCheck size={16} /> Make a request (resets idle timer)
            </button>
          </article>

          <article className="card">
            <div className="card-head">
              <span className="concept-tag">Where you're signed in</span>
              <span className="muted small">{devices.length} active</span>
            </div>
            <h2 className="card-title">Your devices.</h2>
            <p className="muted">
              Lost your phone? Sign it out from here. It stops working on its very next request.
            </p>

            <ul className="devices">
              {devices.map((d) => (
                <li key={d.id}>
                  <Laptop size={20} strokeWidth={1.75} />
                  <div>
                    <strong>{d.device}</strong>
                    <span className="muted small">
                      <code>{d.id.slice(0, 8)}…</code> · active {ago(d.lastSeenAt)}
                    </span>
                  </div>
                  {d.current ? (
                    <span className="pill pill-ok">This device</span>
                  ) : (
                    <button className="button button-small button-danger" onClick={() => revoke(d.id)}>
                      Sign out
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {devices.length > 1 && (
              <button className="button button-secondary" onClick={revokeOthers}>
                Sign out of all other sessions
              </button>
            )}
          </article>
        </section>
      </main>
    </>
  );
}

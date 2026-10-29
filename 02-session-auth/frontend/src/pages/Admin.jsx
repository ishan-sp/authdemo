import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Ban, LogOut, RotateCcw, Terminal } from 'lucide-react';
import Nav from '../components/Nav.jsx';
import { api, usePolling, ago, clock, countdown, shortId } from '../api.js';

const ACTION_LABEL = {
  login: 'Signed in',
  login_failed: 'Failed sign-in',
  login_blocked: 'Blocked sign-in',
  logout: 'Signed out',
  session_revoked: 'Session revoked',
  sessions_revoked: 'Sessions revoked',
  user_banned: 'User banned',
  user_unbanned: 'User unbanned',
};

export default function Admin() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [data, setData] = useState(null);
  const [log, setLog] = useState([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    api('/api/auth/me').then((res) => {
      if (res.status === 401) return navigate('/login', { replace: true, state: { reason: res.data } });
      if (res.data.user.role !== 'admin') return navigate('/account', { replace: true });
      setMe(res.data.user);
    });
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [navigate]);

  // Live view of the whole database, every 2 seconds.
  usePolling(async () => {
    const res = await api('/api/admin/overview');
    if (res.ok) setData(res.data);
    return res;
  }, 2000);

  async function act(label, path) {
    const res = await api(path, { method: 'POST' });
    if (!res.ok) return toast.error(res.data.error);
    toast.success(label);
    setLog((l) => [{ at: new Date(), label, ...res.data }, ...l]);
  }

  if (!me || !data) return <Nav user={me} />;

  const customersOnline = new Set(
    data.sessions.filter((s) => s.user.role === 'customer').map((s) => s.user.email)
  ).size;
  const banned = data.users.filter((u) => u.status === 'banned').length;

  return (
    <>
      <Nav user={me} />
      <main className="page">
        <header className="page-header">
          <p className="eyebrow">Admin · {me.email}</p>
          <h1 className="headline">Security console.</h1>
          <p className="lede"><span className="live" /> Every session in the bank, live.</p>
        </header>

        <section className="stats-row">
          <div className="card stat-card"><span className="stat">{data.sessions.length}</span><span className="muted">Active sessions</span></div>
          <div className="card stat-card"><span className="stat">{customersOnline}</span><span className="muted">Customers signed in</span></div>
          <div className="card stat-card"><span className="stat">{banned}</span><span className="muted">Banned accounts</span></div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Active sessions</h2>
            <span className="muted small"><code>db.sessions</code> · revokedAt: null, not expired</span>
          </div>
          <div className="table-scroll">
            <table className="grid">
              <thead>
                <tr>
                  <th>User</th><th>Session id</th><th>Device</th><th>Signed in</th>
                  <th>Last active</th><th>Idle timeout</th><th />
                </tr>
              </thead>
              <tbody>
                {data.sessions.map((s) => {
                  const mine = s.id === data.me.sessionId;
                  return (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.user.name}</strong>
                        <span className="cell-sub">{s.user.email}</span>
                      </td>
                      <td><code>{shortId(s.id)}</code></td>
                      <td>{s.device}</td>
                      <td>{clock(s.createdAt)}</td>
                      <td>{ago(s.lastSeenAt)}</td>
                      <td>{countdown(new Date(s.expiresAt) - Date.now())}</td>
                      <td className="actions">
                        {mine ? (
                          <span className="pill pill-neutral">You</span>
                        ) : (
                          <button
                            className="button button-small button-danger"
                            onClick={() => act(`Revoked ${s.user.name}'s session`, `/api/admin/sessions/${s.id}/revoke`)}
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {data.sessions.length === 0 && (
                  <tr><td colSpan={7} className="muted empty">No one is signed in.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Users</h2>
            <span className="muted small"><code>db.users</code></span>
          </div>
          <div className="table-scroll">
            <table className="grid">
              <thead>
                <tr><th>User</th><th>Role</th><th>Status</th><th>Sessions</th><th /></tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u._id} className={u.status === 'banned' ? 'row-banned' : ''}>
                    <td>
                      <strong>{u.name}</strong>
                      <span className="cell-sub">{u.email}</span>
                    </td>
                    <td><span className={`role role-${u.role}`}>{u.role}</span></td>
                    <td>
                      <span className={`pill ${u.status === 'banned' ? 'pill-error' : 'pill-ok'}`}>{u.status}</span>
                    </td>
                    <td>{u.activeSessions}</td>
                    <td className="actions">
                      {u.role !== 'admin' && (
                        <>
                          <button
                            className="button button-small button-secondary"
                            disabled={u.activeSessions === 0}
                            onClick={() => act(`Signed ${u.name} out everywhere`, `/api/admin/users/${u._id}/revoke-all`)}
                          >
                            <LogOut size={14} /> Sign out everywhere
                          </button>
                          {u.status === 'banned' ? (
                            <button
                              className="button button-small button-secondary"
                              onClick={() => act(`Unbanned ${u.name}`, `/api/admin/users/${u._id}/unban`)}
                            >
                              <RotateCcw size={14} /> Unban
                            </button>
                          ) : (
                            <button
                              className="button button-small button-danger"
                              onClick={() => act(`Banned ${u.name}`, `/api/admin/users/${u._id}/ban`)}
                            >
                              <Ban size={14} /> Ban
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="concepts">
          <article className="card">
            <div className="card-head">
              <h2 className="card-title">Commands run</h2>
              <Terminal size={18} className="muted" />
            </div>
            <p className="muted small">
              What each button just did to MongoDB. You can paste these into the Compass shell.
            </p>
            {log.length === 0 && <p className="muted empty">Revoke a session or ban a user to see the command.</p>}
            {log.map((entry, i) => (
              <div key={i} className="command">
                <div className="command-head">
                  <strong>{entry.label}</strong>
                  <span className="muted small">{clock(entry.at)}</span>
                </div>
                {entry.commands.map((c, j) => <pre key={j}>{c}</pre>)}
                <span className="muted small mono">→ {JSON.stringify(entry.result)}</span>
              </div>
            ))}
          </article>

          <article className="card">
            <div className="card-head">
              <h2 className="card-title">Audit log</h2>
              <span className="muted small"><code>db.audit_log</code></span>
            </div>
            <ul className="audit">
              {data.audit.map((a) => (
                <li key={a._id}>
                  <span className={`dot dot-${a.action}`} />
                  <div>
                    <strong>{ACTION_LABEL[a.action] ?? a.action}</strong>
                    <span className="muted small">{a.actor} → {a.target} · {a.detail}</span>
                  </div>
                  <span className="muted small">{ago(a.at)}</span>
                </li>
              ))}
            </ul>
          </article>
        </section>
      </main>
    </>
  );
}

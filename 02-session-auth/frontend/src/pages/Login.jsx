import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Info } from 'lucide-react';
import Nav from '../components/Nav.jsx';
import { api } from '../api.js';

const DEMO_ACCOUNTS = [
  { email: 'ananya@harbor.bank', label: 'Customer' },
  { email: 'vikram@harbor.bank', label: 'Customer' },
  { email: 'meera@harbor.bank', label: 'Customer' },
  { email: 'admin@harbor.bank', label: 'Admin' },
];

export default function Login() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Why we ended up here: revoked, expired, banned or a normal sign-out.
  const reason = state?.reason;
  const showReason = reason && reason.code !== 'NO_SESSION' && !error;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const res = await api('/api/auth/login', { method: 'POST', body: form });
    setBusy(false);
    if (!res.ok) return setError({ status: res.status, message: res.data.error });
    navigate(res.data.user.role === 'admin' ? '/admin' : '/account', { replace: true });
  }

  return (
    <>
      <Nav />
      <main className="login">
        <div className="login-panel">
          <h1 className="headline">Sign in to Harbor.</h1>
          <p className="lede">Secure online banking.</p>

          {showReason && (
            <div className={`notice notice-${reason.code === 'LOGOUT' ? 'neutral' : 'warn'}`}>
              <Info size={16} />
              <span>{reason.error}</span>
            </div>
          )}

          <form onSubmit={submit} className="form">
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="username"
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
                required
              />
            </label>

            {error && (
              <div className="form-error">
                <span className="pill pill-error">{error.status}</span>
                <span>{error.message}</span>
              </div>
            )}

            <button className="button button-primary" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
              {!busy && <ArrowRight size={16} strokeWidth={2.25} />}
            </button>
          </form>

          <section className="demo">
            <h2 className="eyebrow">Demo users · password123</h2>
            <div className="demo-list">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  className="demo-item"
                  onClick={() => {
                    setForm({ email: a.email, password: 'password123' });
                    setError(null);
                  }}
                >
                  <span className={`role role-${a.label.toLowerCase()}`}>{a.label}</span>
                  <span className="demo-email">{a.email}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

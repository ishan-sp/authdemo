import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import Nav from '../components/Nav.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { api, ROLE_LABEL } from '../api.js';

const DEMO_ACCOUNTS = [
  { email: 'basic@pulse.fit', role: 'basic' },
  { email: 'pro@pulse.fit', role: 'pro' },
  { email: 'elite@pulse.fit', role: 'elite' },
];

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const res = await api(`/api/auth/${mode}`, { method: 'POST', body: form });
    setBusy(false);
    setResult(res);

    if (!res.ok) return;
    if (mode === 'register') {
      toast.success('Account created. Sign in to continue.');
      setMode('login');
      setForm({ ...form, password: '' });
      return;
    }
    navigate('/dashboard');
  }

  function fillDemo(email) {
    setMode('login');
    setForm({ name: '', email, password: 'password123' });
    setResult(null);
  }

  const isLogin = mode === 'login';

  return (
    <>
      <Nav />
      <main className="login">
        <div className="login-panel">
          <h1 className="headline">{isLogin ? 'Sign in.' : 'Create account.'}</h1>
          <p className="lede">
            {isLogin
              ? 'Your training, your plan, all in one place.'
              : 'New members start on the Basic plan.'}
          </p>

          <form onSubmit={submit} className="form">
            {!isLogin && (
              <label className="field">
                <span>Full name</span>
                <input value={form.name} onChange={update('name')} autoComplete="name" required />
              </label>
            )}
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={update('email')}
                autoComplete="email"
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={form.password}
                onChange={update('password')}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
              />
            </label>

            {result && !result.ok && (
              <div className="form-error">
                <StatusPill status={result.status} />
                <span>{result.data.error}</span>
              </div>
            )}

            <button className="button button-primary" disabled={busy}>
              {busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
              {!busy && <ArrowRight size={16} strokeWidth={2.25} />}
            </button>
          </form>

          <p className="switch">
            {isLogin ? 'New to Pulse?' : 'Already a member?'}{' '}
            <button
              className="link-button"
              onClick={() => {
                setMode(isLogin ? 'register' : 'login');
                setResult(null);
              }}
            >
              {isLogin ? 'Create an account' : 'Sign in'}
            </button>
          </p>

          <section className="demo">
            <h2 className="eyebrow">Demo members · password123</h2>
            <div className="demo-list">
              {DEMO_ACCOUNTS.map((a) => (
                <button key={a.email} className="demo-item" onClick={() => fillDemo(a.email)}>
                  <span className={`role role-${a.role}`}>{ROLE_LABEL[a.role]}</span>
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

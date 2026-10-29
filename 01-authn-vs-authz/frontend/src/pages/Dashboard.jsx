import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, CalendarRange, Dumbbell, Lock, MessageCircle, ShieldCheck, UserRound } from 'lucide-react';
import Nav from '../components/Nav.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { api, ROLES, ROLE_LABEL } from '../api.js';

// What the dashboard asks the server for. Every card is shown to every
// member — the SERVER decides who gets data and who gets a 403.
const FEATURES = [
  {
    key: 'workouts',
    title: 'Workout log',
    icon: Dumbbell,
    endpoint: '/api/workouts',
    rule: "requirePermission('workouts:read')",
    roles: ['basic', 'pro', 'elite'],
  },
  {
    key: 'plans',
    title: 'Training plans',
    icon: CalendarRange,
    endpoint: '/api/plans',
    rule: "requirePermission('plans:read')",
    roles: ['pro', 'elite'],
  },
  {
    key: 'analytics',
    title: 'Performance analytics',
    icon: Activity,
    endpoint: '/api/analytics',
    rule: "requirePermission('analytics:read')",
    roles: ['pro', 'elite'],
  },
  {
    key: 'coach',
    title: 'Personal coach',
    icon: MessageCircle,
    endpoint: '/api/coach',
    rule: "allowRoles('elite')",
    roles: ['elite'],
  },
];

const formatTime = (seconds) =>
  new Date(seconds * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function Dashboard() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [responses, setResponses] = useState({});

  useEffect(() => {
    (async () => {
      // Step 1 — authentication: who is this?
      const res = await api('/api/auth/me');
      if (res.status === 401) return navigate('/login', { replace: true });
      setMe(res.data);

      // Step 2 — authorization: ask for every feature and let the server decide.
      const results = await Promise.all(FEATURES.map((f) => api(f.endpoint)));
      setResponses(Object.fromEntries(FEATURES.map((f, i) => [f.key, results[i]])));
    })();
  }, [navigate]);

  if (!me) return <Nav />;

  const { user, permissions, session } = me;

  return (
    <>
      <Nav user={user} />
      <main className="page">
        <header className="page-header">
          <p className="eyebrow">Welcome back</p>
          <h1 className="headline">Hi, {user.name.split(' ')[0]}.</h1>
          <p className="lede">
            You're on the <strong>{ROLE_LABEL[user.role]}</strong> plan. Here's what that unlocks.
          </p>
        </header>

        <section className="concepts">
          <article className="card">
            <div className="card-head">
              <span className="concept-tag">Authentication</span>
              <StatusPill status={200} />
            </div>
            <h2 className="card-title">Who are you?</h2>
            <p className="muted">
              Your password was checked with bcrypt. The server then gave your browser a signed
              token in an httpOnly cookie, and verifies it on every request.
            </p>
            <dl className="facts">
              <div><dt>User id</dt><dd>#{user.id}</dd></div>
              <div><dt>Email</dt><dd>{user.email}</dd></div>
              <div><dt>Signed in</dt><dd>{formatTime(session.issuedAt)}</dd></div>
              <div><dt>Expires</dt><dd>{formatTime(session.expiresAt)}</dd></div>
            </dl>
          </article>

          <article className="card">
            <div className="card-head">
              <span className="concept-tag">Authorization</span>
              <span className={`role role-${user.role}`}>{ROLE_LABEL[user.role]}</span>
            </div>
            <h2 className="card-title">What can you do?</h2>
            <p className="muted">
              Your role comes from the <code>users</code> table. Each role grants a set of
              permissions that routes check before answering.
            </p>
            <table className="matrix">
              <thead>
                <tr>
                  <th />
                  {ROLES.map((r) => (
                    <th key={r} className={r === user.role ? 'current' : ''}>{ROLE_LABEL[r]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f) => (
                  <tr key={f.key}>
                    <td>{f.title}</td>
                    {ROLES.map((r) => (
                      <td key={r} className={r === user.role ? 'current' : ''}>
                        {f.roles.includes(r) ? <span className="tick">●</span> : <span className="dash">–</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="perm-list">
              {permissions.map((p) => <code key={p}>{p}</code>)}
            </p>
          </article>
        </section>

        <h2 className="section-title">Your training</h2>
        <section className="features">
          {FEATURES.map((f) => (
            <FeatureCard key={f.key} feature={f} response={responses[f.key]} />
          ))}
        </section>

        <OwnershipCheck user={user} />
      </main>
    </>
  );
}

function FeatureCard({ feature, response }) {
  const Icon = feature.icon;
  const locked = response && !response.ok;

  return (
    <article className={`card feature ${locked ? 'is-locked' : ''}`}>
      <div className="card-head">
        <span className="feature-name">
          <Icon size={18} strokeWidth={2} />
          {feature.title}
        </span>
        <StatusPill status={response?.status} />
      </div>

      <div className="feature-body">
        {!response && <p className="muted">Loading…</p>}
        {locked && (
          <div className="locked">
            <Lock size={22} strokeWidth={1.75} />
            <p>{response.data.error}</p>
            <span className="muted small">
              Available on {feature.roles.map((r) => ROLE_LABEL[r]).join(', ')}
            </span>
          </div>
        )}
        {response?.ok && <FeatureContent name={feature.key} data={response.data} />}
      </div>

      <footer className="route">
        <code>GET {feature.endpoint}</code>
        <code className="muted">{feature.rule}</code>
      </footer>
    </article>
  );
}

function FeatureContent({ name, data }) {
  if (name === 'workouts') {
    return (
      <ul className="rows">
        {data.items.map((w) => (
          <li key={w.day}>
            <span className="muted">{w.day}</span>
            <span>{w.name}</span>
            <span className="muted">{w.minutes} min</span>
          </li>
        ))}
      </ul>
    );
  }
  if (name === 'plans') {
    return (
      <ul className="plans">
        {data.items.map((p) => (
          <li key={p.name}>
            <div className="plan-line">
              <span>{p.name}</span>
              <span className="muted">Week {p.week} of {p.of}</span>
            </div>
            <div className="bar"><span style={{ width: `${(p.week / p.of) * 100}%` }} /></div>
          </li>
        ))}
      </ul>
    );
  }
  if (name === 'analytics') {
    const max = Math.max(...data.weeklyMinutes);
    return (
      <div className="analytics">
        <div className="stats">
          <div><span className="stat">{data.restingHeartRate}</span><span className="muted small">Resting bpm</span></div>
          <div><span className="stat">{data.vo2max}</span><span className="muted small">VO₂ max</span></div>
        </div>
        <div className="chart" aria-label="Active minutes this week">
          {data.weeklyMinutes.map((m, i) => (
            <div key={i} className="chart-col">
              <span style={{ height: `${(m / max) * 100}%` }} title={`${m} min`} />
              <small>{'MTWTFSS'[i]}</small>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (name === 'coach') {
    return (
      <div className="coach">
        <p className="quote">“{data.message}”</p>
        <p className="muted small">{data.coach} · Next session {data.nextSession}</p>
      </div>
    );
  }
  return null;
}

// Strategy 3: ownership. Same role, different result depending on WHOSE data you ask for.
function OwnershipCheck({ user }) {
  const [id, setId] = useState(String(user.id === 1 ? 2 : 1));
  const [res, setRes] = useState(null);

  const load = async (memberId) => setRes(await api(`/api/members/${memberId}`));

  return (
    <section className="card ownership">
      <div className="card-head">
        <span className="concept-tag">Authorization · ownership</span>
        {res && <StatusPill status={res.status} />}
      </div>
      <h2 className="card-title">Whose data is it?</h2>
      <p className="muted">
        Any plan can open a member profile, but only their own. The route checks that the id in
        the URL matches the logged-in user.
      </p>
      <div className="ownership-actions">
        <button className="button button-secondary" onClick={() => load(user.id)}>
          <UserRound size={16} /> My profile (#{user.id})
        </button>
        <span className="muted">or</span>
        <div className="inline-input">
          <span className="muted">/api/members/</span>
          <input value={id} onChange={(e) => setId(e.target.value)} inputMode="numeric" />
          <button className="button button-secondary" onClick={() => load(id)}>
            <ShieldCheck size={16} /> Request
          </button>
        </div>
      </div>
      {res && (
        <pre className={`json ${res.ok ? '' : 'json-error'}`}>{JSON.stringify(res.data, null, 2)}</pre>
      )}
    </section>
  );
}

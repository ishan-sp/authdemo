import { useEffect, useRef, useState } from 'react';
import { Play, TriangleAlert } from 'lucide-react';
import Nav from '../components/Nav.jsx';
import { api } from '../api.js';

const REFRESH_MS = 2000;

const SNIPPETS = [
  { label: 'All users', sql: 'SELECT id, name, email, role FROM users ORDER BY id;' },
  { label: 'Promote to elite', sql: "UPDATE users SET role = 'elite' WHERE email = 'basic@pulse.fit';" },
  { label: 'Demote to basic', sql: "UPDATE users SET role = 'basic' WHERE email = 'basic@pulse.fit';" },
  { label: 'Invalid role', sql: "UPDATE users SET role = 'admin' WHERE id = 1;" },
  { label: 'Count by role', sql: 'SELECT role, count(*) FROM users GROUP BY role ORDER BY role;' },
];

const show = (value) => {
  if (value === null) return 'NULL';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export default function Database() {
  const [tables, setTables] = useState(null);
  const [error, setError] = useState(null);
  const [changed, setChanged] = useState(new Set());
  const previous = useRef(new Set());

  // Poll the database so the view updates on its own.
  useEffect(() => {
    let alive = true;
    async function refresh() {
      const res = await api('/api/db/snapshot');
      if (!alive) return;
      if (!res.ok) return setError(res.data.error ?? 'Could not reach the database.');
      setError(null);

      // Highlight rows that weren't there (or looked different) last time.
      const seen = new Set();
      const fresh = new Set();
      for (const t of res.data.tables) {
        for (const row of t.rows) {
          const key = t.name + JSON.stringify(row);
          seen.add(key);
          if (previous.current.size && !previous.current.has(key)) fresh.add(key);
        }
      }
      previous.current = seen;
      if (fresh.size) setChanged(fresh);
      setTables(res.data.tables);
    }
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <>
      <Nav />
      <main className="page">
        <header className="page-header">
          <p className="eyebrow">postgres · authdemo · localhost:5433</p>
          <h1 className="headline">Database.</h1>
          <p className="lede">
            <span className={`live ${error ? 'live-off' : ''}`} />
            {error ? error : `Live. Refreshes every ${REFRESH_MS / 1000} seconds.`}
          </p>
        </header>

        {tables?.map((t) => (
          <section key={t.name} className="card db-table">
            <div className="card-head">
              <h2 className="card-title mono">{t.name}</h2>
              <span className="muted small">{t.rows.length} rows</span>
            </div>
            <div className="table-scroll">
              <table className="grid">
                <thead>
                  <tr>
                    {t.columns.map((c) => (
                      <th key={c.name}>
                        {c.name}
                        <small>{c.type}</small>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {t.rows.map((row, i) => (
                    <tr key={i} className={changed.has(t.name + JSON.stringify(row)) ? 'flash' : ''}>
                      {t.columns.map((c) => (
                        <td key={c.name} className={c.name === 'password_hash' ? 'hash' : ''}>
                          {show(row[c.name])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        <SqlConsole />
      </main>
    </>
  );
}

function SqlConsole() {
  const [sql, setSql] = useState(SNIPPETS[0].sql);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setResult(await api('/api/db/query', { method: 'POST', body: { sql } }));
    setBusy(false);
  }

  function onKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      run();
    }
  }

  const out = result?.data;

  return (
    <section className="card console">
      <div className="card-head">
        <h2 className="card-title">SQL console</h2>
        <span className="warning">
          <TriangleAlert size={14} /> Runs as the Postgres superuser. Demo only.
        </span>
      </div>

      <div className="snippets">
        {SNIPPETS.map((s) => (
          <button key={s.label} className="chip" onClick={() => setSql(s.sql)}>
            {s.label}
          </button>
        ))}
      </div>

      <textarea
        className="editor"
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        rows={5}
      />

      <div className="console-bar">
        <span className="muted small">Ctrl + Enter to run</span>
        <button className="button button-primary" onClick={run} disabled={busy}>
          <Play size={14} strokeWidth={2.5} /> Run
        </button>
      </div>

      {result && !result.ok && <p className="sql-error">{out.error}</p>}
      {result?.ok && (
        <>
          <p className="muted small sql-meta">
            {out.command} · {out.rowCount ?? 0} {out.rowCount === 1 ? 'row' : 'rows'} · {out.ms} ms
          </p>
          {out.fields.length > 0 && (
            <div className="table-scroll">
              <table className="grid">
                <thead>
                  <tr>{out.fields.map((f) => <th key={f}>{f}</th>)}</tr>
                </thead>
                <tbody>
                  {out.rows.map((row, i) => (
                    <tr key={i}>{out.fields.map((f) => <td key={f}>{show(row[f])}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

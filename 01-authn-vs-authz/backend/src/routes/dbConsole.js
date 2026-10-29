// ─────────────────────────────────────────────────────────────
//  DATABASE CONSOLE — for the classroom demo only.
//
//  Runs ANY SQL you send it as the Postgres superuser.
//  Never ship something like this in a real application.
//  The server only listens on 127.0.0.1, so other machines can't reach it.
// ─────────────────────────────────────────────────────────────
import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// Every table in the public schema, with its columns and rows.
router.get('/snapshot', async (req, res) => {
  const { rows: tables } = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name`);

  const result = [];
  for (const { table_name } of tables) {
    const { rows: columns } = await pool.query(
      `SELECT column_name AS name, data_type AS type
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [table_name]
    );
    const quoted = '"' + table_name.replaceAll('"', '""') + '"';
    const { rows } = await pool.query(`SELECT * FROM ${quoted} ORDER BY 1 LIMIT 200`);
    result.push({ name: table_name, columns, rows });
  }
  res.json({ tables: result });
});

router.post('/query', async (req, res) => {
  const { sql } = req.body;
  if (!sql?.trim()) return res.status(400).json({ error: 'Write a query first.' });

  const started = performance.now();
  try {
    const out = await pool.query(sql);
    // Several statements in one go return an array; show the last one.
    const last = Array.isArray(out) ? out.at(-1) : out;
    res.json({
      command: last.command,
      rowCount: last.rowCount,
      fields: last.fields?.map((f) => f.name) ?? [],
      rows: last.rows ?? [],
      ms: Math.round(performance.now() - started),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

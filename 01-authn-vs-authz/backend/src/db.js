import pg from 'pg';

// One connection pool shared by the whole app.
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// If Postgres restarts, idle connections drop. Log it instead of crashing.
pool.on('error', (err) => console.error('Postgres connection lost:', err.message));

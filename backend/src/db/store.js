/**
 * store.js — PostgreSQL persistence layer
 *
 * Uses raw pg (no ORM) with explicit SQL migration files in /migrations/.
 * When DATABASE_URL is not set, all operations are no-ops and rooms are
 * stored in memory only (lost on server restart).
 *
 * Security note: The 'state' column contains the full room JSON including
 * both player hands and session tokens. It must NEVER be served to clients.
 * Always use engine.playerView() to produce sanitised per-player views.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

let pool = null;

// ---------------------------------------------------------------------------
// initStore — connect to PostgreSQL and run migrations.
// ---------------------------------------------------------------------------
export async function initStore() {
  if (!process.env.DATABASE_URL) {
    console.warn(
      '[store] DATABASE_URL not set — using in-memory mode. ' +
      'Active rooms will be lost if the server restarts.'
    );
    return;
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  // Test connection.
  const client = await pool.connect();
  try {
    await runMigrations(client);
    console.log('[store] PostgreSQL connected and migrations applied.');
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// runMigrations — apply all SQL files from /migrations/ in order.
// ---------------------------------------------------------------------------
async function runMigrations(client) {
  // Ensure the migrations-tracking table exists.
  await client.query(`
    CREATE TABLE IF NOT EXISTS rummy_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationsDir = join(__dirname, '../../migrations');
  const migration001 = join(migrationsDir, '001_initial.sql');

  const { rows } = await client.query(
    "SELECT name FROM rummy_migrations WHERE name = '001_initial'"
  );

  if (rows.length === 0) {
    const sql = await readFile(migration001, 'utf8');
    await client.query(sql);
    await client.query(
      "INSERT INTO rummy_migrations(name) VALUES('001_initial')"
    );
    console.log('[store] Applied migration 001_initial.');
  }
}

// ---------------------------------------------------------------------------
// saveRoom — upsert a room's full state.
// ---------------------------------------------------------------------------
export async function saveRoom(room) {
  if (!pool) return;
  await pool.query(
    `INSERT INTO rummy_rooms(code, status, state, updated_at)
     VALUES($1, $2, $3, NOW())
     ON CONFLICT(code) DO UPDATE
     SET status = EXCLUDED.status,
         state  = EXCLUDED.state,
         updated_at = NOW()`,
    [room.code, room.status, JSON.stringify(room)]
  );
}

// ---------------------------------------------------------------------------
// loadSavedRooms — restore active (waiting/playing) rooms on startup.
// ---------------------------------------------------------------------------
export async function loadSavedRooms() {
  if (!pool) return [];
  const { rows } = await pool.query(
    "SELECT state FROM rummy_rooms WHERE status IN ('waiting', 'playing')"
  );
  return rows.map(r => r.state);
}

// ---------------------------------------------------------------------------
// deleteRoom — remove a room from the database.
// ---------------------------------------------------------------------------
export async function deleteRoom(code) {
  if (!pool) return;
  await pool.query('DELETE FROM rummy_rooms WHERE code = $1', [code]);
}

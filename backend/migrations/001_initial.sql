-- Migration 001 — Initial schema for Private Rummy
-- Run this once against your Neon (or any PostgreSQL) database.
-- The backend also applies this automatically on startup via store.js.

CREATE TABLE IF NOT EXISTS rummy_rooms (
  code        VARCHAR(8)   PRIMARY KEY,
  status      VARCHAR(20)  NOT NULL DEFAULT 'waiting',
  state       JSONB        NOT NULL,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index for efficient cleanup queries.
CREATE INDEX IF NOT EXISTS idx_rummy_rooms_status_updated
  ON rummy_rooms (status, updated_at);

-- Comments for maintainers.
COMMENT ON TABLE rummy_rooms IS
  'Persisted room state for Private Rummy. The state column contains the full
   authoritative room object as JSONB, including both player hands. This column
   is NEVER served directly to clients; the server always produces sanitised
   per-player views via playerView().';

COMMENT ON COLUMN rummy_rooms.code IS
  '6-character alphanumeric room code (uppercase, unambiguous alphabet).';

COMMENT ON COLUMN rummy_rooms.status IS
  'Room lifecycle: waiting | playing | finished | abandoned.';

COMMENT ON COLUMN rummy_rooms.state IS
  'Full room JSON blob. Contains sensitive data (both player hands and tokens).
   Grant SELECT on this table only to the backend service account.';

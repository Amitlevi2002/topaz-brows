// Persistence. The whole studio fits in a few hundred KB (one person, a few hundred bookings a year),
// so state is one JSON document in SQLite, read once at start and written in full after every change.
// SQLite gives atomic writes and a single file to back up; a table per entity can come later if it ever grows.
import { DatabaseSync } from 'node:sqlite';
import type { State } from '../../core/types';
import { emptyState } from '../../core/seed';

export function openStore(path: string) {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  const row = db.prepare('SELECT json FROM state WHERE id = 1').get() as { json: string } | undefined;
  const save = db.prepare(`
    INSERT INTO state (id, json, updated_at) VALUES (1, ?, ?)
    ON CONFLICT (id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at
  `);

  let state: State = row ? JSON.parse(row.json) : emptyState();
  if (!row) save.run(JSON.stringify(state), new Date().toISOString());

  return {
    // Holding `db` here matters: node:sqlite finalizes prepared statements once the DatabaseSync object is
    // garbage-collected, and a statement alone does not keep it alive.
    db,
    get: () => state,
    /** Saves `next` and only then makes it the live state, so a failed write leaves the old state in place. */
    commit(next: State) {
      save.run(JSON.stringify(next), new Date().toISOString());
      state = next;
    },
    close: () => db.close(),
  };
}

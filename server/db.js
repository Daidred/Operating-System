import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, 'opstrace.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'purchasing_staff',
  department TEXT,
  reset_token TEXT,
  reset_token_expires INTEGER,
  created_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS records (
  entity TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL,
  created_by TEXT,
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL,
  PRIMARY KEY (entity, id)
);
CREATE INDEX IF NOT EXISTS idx_records_entity_created ON records(entity, created_date);
`);

// Entity names come from the schema files exported from Base44, so the API
// only accepts entities the app actually defines.
const entitiesDir = path.join(__dirname, '..', 'base44', 'entities');
export const ENTITY_NAMES = new Set(
  fs.readdirSync(entitiesDir).filter(f => f.endsWith('.jsonc')).map(f => f.replace(/\.jsonc$/, ''))
);

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name || row.email,
    role: row.role,
    department: row.department || null,
    created_date: row.created_date,
  };
}

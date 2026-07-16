import crypto from 'node:crypto';
import { Router } from 'express';
import { db, ENTITY_NAMES, publicUser } from './db.js';

export const entitiesRouter = Router();

function checkEntity(req, res, next) {
  if (!ENTITY_NAMES.has(req.params.entity)) {
    return res.status(404).json({ message: `Unknown entity: ${req.params.entity}` });
  }
  next();
}

function rowToRecord(row) {
  return {
    id: row.id,
    ...JSON.parse(row.data),
    created_by: row.created_by,
    created_date: row.created_date,
    updated_date: row.updated_date,
  };
}

function applySort(records, sort) {
  if (!sort) return records;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  return records.sort((a, b) => {
    const av = a[field], bv = b[field];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return desc ? -cmp : cmp;
  });
}

// GET /api/entities/:entity?sort=-created_date&limit=200&filter={"project_id":"x"}
entitiesRouter.get('/:entity', checkEntity, (req, res) => {
  const { entity } = req.params;
  const limit = Math.min(parseInt(req.query.limit, 10) || 1000, 5000);
  let filter = {};
  if (req.query.filter) {
    try { filter = JSON.parse(req.query.filter); } catch { return res.status(400).json({ message: 'Invalid filter JSON' }); }
  }

  if (entity === 'User') {
    let users = db.prepare('SELECT * FROM users').all().map(publicUser);
    users = users.filter(u => Object.entries(filter).every(([k, v]) => u[k] === v));
    return res.json(applySort(users, req.query.sort).slice(0, limit));
  }

  const rows = db.prepare('SELECT * FROM records WHERE entity = ?').all(entity);
  let records = rows.map(rowToRecord);
  records = records.filter(r => Object.entries(filter).every(([k, v]) => {
    // Base44 filters match loosely on booleans stored as 0/1 and missing-as-false
    if (typeof v === 'boolean') return Boolean(r[k]) === v;
    return r[k] === v;
  }));
  res.json(applySort(records, req.query.sort).slice(0, limit));
});

entitiesRouter.post('/:entity', checkEntity, (req, res) => {
  const { entity } = req.params;
  if (entity === 'User') return res.status(400).json({ message: 'Users are created via registration' });
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const data = { ...req.body };
  delete data.id; delete data.created_by; delete data.created_date; delete data.updated_date;
  db.prepare('INSERT INTO records (entity, id, data, created_by, created_date, updated_date) VALUES (?, ?, ?, ?, ?, ?)')
    .run(entity, id, JSON.stringify(data), req.user.email, now, now);
  res.json({ id, ...data, created_by: req.user.email, created_date: now, updated_date: now });
});

entitiesRouter.patch('/:entity/:id', checkEntity, (req, res) => {
  const { entity, id } = req.params;
  if (entity === 'User') {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { full_name, role, department } = req.body || {};
    db.prepare('UPDATE users SET full_name = COALESCE(?, full_name), role = COALESCE(?, role), department = COALESCE(?, department) WHERE id = ?')
      .run(full_name ?? null, role ?? null, department ?? null, id);
    return res.json(publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)));
  }
  const row = db.prepare('SELECT * FROM records WHERE entity = ? AND id = ?').get(entity, id);
  if (!row) return res.status(404).json({ message: `${entity} not found` });
  const patch = { ...req.body };
  delete patch.id; delete patch.created_by; delete patch.created_date; delete patch.updated_date;
  const merged = { ...JSON.parse(row.data), ...patch };
  const now = new Date().toISOString();
  db.prepare('UPDATE records SET data = ?, updated_date = ? WHERE entity = ? AND id = ?')
    .run(JSON.stringify(merged), now, entity, id);
  res.json({ id, ...merged, created_by: row.created_by, created_date: row.created_date, updated_date: now });
});

entitiesRouter.delete('/:entity/:id', checkEntity, (req, res) => {
  const { entity, id } = req.params;
  if (entity === 'User') return res.status(400).json({ message: 'Users cannot be deleted via the entity API' });
  const result = db.prepare('DELETE FROM records WHERE entity = ? AND id = ?').run(entity, id);
  if (result.changes === 0) return res.status(404).json({ message: `${entity} not found` });
  res.json({ ok: true });
});

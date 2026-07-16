import crypto from 'node:crypto';
import { Router } from 'express';
import { db, publicUser } from './db.js';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const COOKIE_NAME = 'opstrace_session';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, expires) VALUES (?, ?, ?)')
    .run(token, userId, Date.now() + SESSION_TTL_MS);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS,
    secure: process.env.COOKIE_SECURE === 'true',
  });
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
    if (session && session.expires > Date.now()) {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id);
      if (user) {
        req.user = user;
        return next();
      }
    }
  }
  res.status(401).json({ message: 'Authentication required' });
}

export const authRouter = Router();

authRouter.post('/register', (req, res) => {
  const { email, password, full_name } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
  if (String(password).length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ message: 'An account with this email already exists' });

  const isFirstUser = db.prepare('SELECT COUNT(*) AS n FROM users').get().n === 0;
  const user = {
    id: crypto.randomUUID(),
    email: String(email).trim(),
    password_hash: hashPassword(password),
    full_name: full_name || String(email).split('@')[0],
    role: isFirstUser ? 'admin' : 'purchasing_staff',
    created_date: new Date().toISOString(),
  };
  db.prepare(`INSERT INTO users (id, email, password_hash, full_name, role, created_date)
              VALUES (@id, @email, @password_hash, @full_name, @role, @created_date)`).run(user);
  createSession(res, user.id);
  res.json({ user: publicUser(user) });
});

authRouter.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = email && db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !verifyPassword(password || '', user.password_hash)) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  createSession(res, user.id);
  res.json({ user: publicUser(user) });
});

authRouter.post('/logout', (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json(publicUser(req.user));
});

authRouter.post('/reset-request', (req, res) => {
  const { email } = req.body || {};
  const user = email && db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (user) {
    const token = crypto.randomBytes(24).toString('hex');
    db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?')
      .run(token, Date.now() + 60 * 60 * 1000, user.id);
    const base = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173';
    const link = `${base}/reset-password?token=${token}`;
    // Without an SMTP server the reset link is printed to the server log so an
    // admin can pass it to the user.
    console.log(`[auth] Password reset link for ${user.email}: ${link}`);
  }
  res.json({ ok: true, message: 'If that account exists, a reset link has been generated. Check the server log (or your email if configured).' });
});

authRouter.post('/reset', (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ message: 'Token and new password are required' });
  if (String(password).length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
  const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
  if (!user || !user.reset_token_expires || user.reset_token_expires < Date.now()) {
    return res.status(400).json({ message: 'Invalid or expired reset token' });
  }
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?')
    .run(hashPassword(password), user.id);
  res.json({ ok: true });
});

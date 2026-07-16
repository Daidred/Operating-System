import express from 'express';
import cookieParser from 'cookie-parser';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UPLOADS_DIR } from './db.js';
import { authRouter, requireAuth } from './auth.js';
import { entitiesRouter } from './entities.js';
import { integrationsRouter } from './integrations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/entities', requireAuth, entitiesRouter);
app.use('/api/integrations', requireAuth, integrationsRouter);
app.use('/uploads', requireAuth, express.static(UPLOADS_DIR));

app.use('/api', (_req, res) => res.status(404).json({ message: 'Not found' }));

// In production the server also serves the built frontend from dist/.
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`OpsTrace server running on http://localhost:${PORT}`);
  if (!fs.existsSync(distDir)) {
    console.log('No dist/ build found — run `npm run build` to serve the app from this server, or use `npm run dev` for development.');
  }
});

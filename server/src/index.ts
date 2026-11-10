import express from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { handle, isWrite } from '../../core/handler';
import { createAuth, rateLimiter } from './auth';
import { openStore } from './store';

const env = (name: string, fallback?: string) => {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing environment variable ${name} (see .env.example)`);
  return v;
};

const auth = createAuth(env('SESSION_SECRET'), env('ADMIN_PASSWORD'));
const store = openStore(env('DB_PATH', 'topaz.db'));
const loginAllowed = rateLimiter(5, 15 * 60 * 1000);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '3mb' })); // gallery uploads arrive as data URLs

app.use('/api', (req, res) => {
  const path = req.baseUrl + req.path;
  if (path === '/api/admin/login' && !loginAllowed(req.ip ?? '')) {
    return res.status(429).json({ error: 'יותר מדי ניסיונות. נסי שוב בעוד רבע שעה' });
  }

  // The handler mutates the state it's given, so writes run on a copy that is committed only on success.
  const write = isWrite(req.method);
  const state = write ? structuredClone(store.get()) : store.get();
  const result = handle(
    state,
    { method: req.method, path, body: req.body, session: auth.verify(req.get('authorization')) },
    {
      now: new Date(),
      checkAdminPassword: auth.checkAdminPassword,
      issueToken: auth.issueToken,
    },
  );
  if (write && result.status < 400) store.commit(state);
  res.status(result.status).json(result.body ?? {});
});

// In production the same process serves the built client: / for clients, /admin for Topaz.
const dist = join(import.meta.dirname, '../../web/dist');
if (existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h', index: false }));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(join(dist, 'index.html')));
}

const port = Number(env('PORT', '3000'));
app.listen(port, () => console.log(`Topaz Eyebrows listening on :${port}`));

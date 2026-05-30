import { initSentry, Sentry } from '../server/sentry';
initSentry();

import express, { type Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { registerRoutes } from '../server/routes';

const app = express();
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '256kb' }));
app.use(cookieParser());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPublic = path.resolve(__dirname, '..', 'dist', 'public');

let initError: any = null;

const ready = (async () => {
  try {
    const { initializeSubscriptionPlans } = await import('../server/services/subscription-service');
    await initializeSubscriptionPlans();
    await registerRoutes(app);

    // Test: log all requests to understand Vercel path behavior
    app.use((req, res, next) => {
      if (req.path.includes('test') || req.path.includes('market')) {
        console.log(`[REQ] path=${req.path}, url=${req.url}, originalUrl=${req.originalUrl}`);
      }
      next();
    });

    // Test: mount a simple route after registerRoutes
    app.get('/api/test-direct', (_req, res) => {
      res.json({ ok: true, msg: 'Direct route after registerRoutes' });
    });

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || 'Internal Server Error';
      if (status >= 500) Sentry.captureException(err);
      res.status(status).json({ message });
    });

    // Serve static files and SPA fallback (only for non-/api routes)
    if (fs.existsSync(distPublic)) {
      app.use(express.static(distPublic));
      app.use((_req, res) => {
        if (_req.path.startsWith('/api/')) {
          return res.status(404).json({ error: 'Not Found' });
        }
        res.sendFile(path.join(distPublic, 'index.html'));
      });
    }
  } catch (err) {
    initError = err;
    console.error('[FATAL]', err);
  }
})();

export default async (req: Request, res: Response) => {
  await ready;
  if (initError) {
    res.status(500).json({ error: 'Server initialization failed', details: String(initError) });
    return;
  }
  return app(req, res);
};

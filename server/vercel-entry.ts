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

const ready = (async () => {
  try {
    const { initializeSubscriptionPlans } = await import('../server/services/subscription-service');
    await initializeSubscriptionPlans();
    console.log('[READY] registerRoutes starting');
    await registerRoutes(app);
    console.log('[READY] registerRoutes complete');
  } catch (err) {
    console.error('[READY] Error during initialization:', err);
    throw err;
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    if (status >= 500) Sentry.captureException(err);
    res.status(status).json({ message });
  });

  // Serve static assets and SPA fallback (only for non-/api routes)
  if (fs.existsSync(distPublic)) {
    app.use(express.static(distPublic));
    app.use((req, res) => {
      console.log(`[SPA] path=${req.path}, originalUrl=${req.originalUrl}, url=${req.url}`);
      // Avoid serving SPA for /api routes — 404 instead
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Not Found' });
      }
      res.sendFile(path.join(distPublic, 'index.html'));
    });
  }
})();

export default async (req: Request, res: Response) => {
  await ready;
  return app(req, res);
};

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

// Resolve the Vite build output relative to this bundle's location.
// In Vercel Lambda: __dirname = /var/task/api/, so dist/public is one level up.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPublic = path.resolve(__dirname, '..', 'dist', 'public');

const ready = (async () => {
  const { initializeSubscriptionPlans } = await import('../server/services/subscription-service');
  await initializeSubscriptionPlans();
  await registerRoutes(app);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    if (status >= 500) Sentry.captureException(err);
    res.status(status).json({ message });
  });

  // Serve Vite-built frontend assets and SPA fallback
  if (fs.existsSync(distPublic)) {
    app.use(express.static(distPublic));
    app.use('*', (_req, res) => {
      res.sendFile(path.join(distPublic, 'index.html'));
    });
  }
})();

export default async (req: Request, res: Response) => {
  console.log('[vercel] handler:', req.method, req.url, req.path);
  await ready;
  return app(req, res);
};

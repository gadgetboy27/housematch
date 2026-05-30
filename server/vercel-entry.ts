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
  const { initializeSubscriptionPlans } = await import('../server/services/subscription-service');
  await initializeSubscriptionPlans();
  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    if (status >= 500) Sentry.captureException(err);
    res.status(status).json({ message });
  });

  if (fs.existsSync(distPublic)) {
    app.use(express.static(distPublic));
    app.use('*', (_req, res) => {
      res.sendFile(path.join(distPublic, 'index.html'));
    });
  }
})();

export default async (req: Request, res: Response) => {
  // Raw URL diagnostic — bypasses Express routing entirely
  if (req.url?.includes('/api/raw-debug')) {
    (res as any).end(JSON.stringify({ url: req.url, method: req.method }));
    return;
  }
  await ready;
  return app(req, res);
};

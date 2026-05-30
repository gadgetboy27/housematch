import { initSentry, Sentry } from '../server/sentry';
initSentry();

import express, { type Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { registerRoutes } from '../server/routes';

const app = express();
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '256kb' }));
app.use(cookieParser());

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
})();

export default async (req: Request, res: Response) => {
  await ready;
  return app(req, res);
};

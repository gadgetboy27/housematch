// CRITICAL: Sentry must be imported and initialized FIRST
import { initSentry, Sentry } from "./sentry";
initSentry();

import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// H-001: Stripe webhook needs the raw body for signature verification.
// This MUST be registered before express.json() so the raw buffer is preserved.
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// H-019: Explicit body size limits to prevent DoS
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '256kb' }));
// CRITICAL: Cookie parser must be registered before CSRF middleware
app.use(cookieParser());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // H-031: Fail loudly at boot if required env vars are missing in production
  if (process.env.NODE_ENV === 'production') {
    const REQUIRED_ENV = [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'SESSION_SECRET',
      'DATABASE_URL',
    ];
    for (const v of REQUIRED_ENV) {
      if (!process.env[v]) {
        throw new Error(`Required environment variable ${v} is not set in production`);
      }
    }
  }

  // Initialize subscription plans
  const { initializeSubscriptionPlans } = await import("./services/subscription-service");
  await initializeSubscriptionPlans();

  const server = await registerRoutes(app);

  // Custom error handler with Sentry capture
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Capture error in Sentry (only 5xx errors per our filter config)
    if (status >= 500) {
      Sentry.withScope(scope => {
        // Add safe request context (exclude sensitive headers)
        scope.setContext("request", {
          method: req.method,
          url: req.url,
          query: req.query,
          // Only include safe headers (no cookies, authorization, etc.)
          headers: {
            'user-agent': req.headers['user-agent'],
            'content-type': req.headers['content-type'],
            'accept': req.headers['accept'],
          }
        });
        
        Sentry.captureException(err);
      });
    }

    // Log error for development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error:', err);
    }

    // Send response to client
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
})();

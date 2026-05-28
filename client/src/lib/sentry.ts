import * as Sentry from "@sentry/react";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    console.info("Sentry not configured - error tracking disabled");
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || "development",
    
    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    
    // Performance Monitoring
    tracesSampleRate: import.meta.env.MODE === "production" ? 0.1 : 1.0,
    
    // Session Replay (50 replays/month on free tier)
    replaysSessionSampleRate: import.meta.env.MODE === "production" ? 0.1 : 0.0,
    replaysOnErrorSampleRate: 1.0, // Always capture replay when error occurs
    
    // Filter out errors to save quota
    beforeSend(event, hint) {
      const error = hint.originalException;
      
      // Don't send validation errors
      if (error instanceof Error) {
        if (error.message.includes("Validation failed")) return null;
        if (error.message.includes("Invalid CSRF token")) return null; // Expected auth errors
      }
      
      // Don't send 4xx client errors (use Sentry only for bugs, not user errors)
      if (event.tags?.status && parseInt(event.tags.status as string) < 500) {
        return null;
      }
      
      return event;
    },
    
    // Ignore non-critical errors
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
      "cancelled",
      "Network request failed",
      "Failed to fetch",
      "Load failed",
    ],
  });

  console.info("✅ Sentry initialized for frontend error tracking");
}

// Helper to set user context
export function setUserContext(user: { id: string; email?: string; name?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
}

// Helper to capture errors with context
export function captureError(error: Error, context?: {
  propertyId?: string;
  action?: string;
  additionalData?: Record<string, any>;
}) {
  if (context) {
    Sentry.setContext("action", {
      propertyId: context.propertyId,
      action: context.action,
      ...context.additionalData,
    });
  }
  
  Sentry.captureException(error);
}

export { Sentry };

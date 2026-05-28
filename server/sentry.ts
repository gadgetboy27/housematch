import * as Sentry from "@sentry/node";

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    console.log("⚠️  Sentry DSN not configured - error tracking disabled");
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    
    // Sample rate for performance monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    
    // Filter out errors to save quota
    beforeSend(event, hint) {
      const error = hint.originalException;
      
      // Don't send validation errors (expected errors)
      if (error instanceof Error) {
        if (error.message.includes("Validation error")) return null;
        if (error.message.includes("Invalid input")) return null;
      }
      
      // Don't send 4xx errors (client errors)
      if (event.tags?.status && parseInt(event.tags.status as string) < 500) {
        return null;
      }
      
      return event;
    },
    
    // Ignore common non-critical errors
    ignoreErrors: [
      "NetworkError",
      "Network request failed",
      "Failed to fetch",
      "cancelled", // User cancelled requests
      "AbortError",
    ],
  });

  console.log("✅ Sentry initialized for backend error tracking");
}

// Helper to capture errors with context
export function captureError(error: Error, context?: {
  userId?: string;
  propertyId?: string;
  transactionType?: string;
  additionalData?: Record<string, any>;
}) {
  // Use withScope to prevent context bleed between requests
  Sentry.withScope(scope => {
    if (context) {
      scope.setContext("transaction", {
        userId: context.userId,
        propertyId: context.propertyId,
        type: context.transactionType,
        ...context.additionalData,
      });
    }
    
    Sentry.captureException(error);
  });
}

export { Sentry };

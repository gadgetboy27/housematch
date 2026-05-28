import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertOfferSchema, frontendOfferSchema, insertDraftDocumentSchema } from "@shared/schema";
import { insertPropertySchema, insertUserSwipeSchema, insertPropertyShareSchema, insertPurchaseOrderSchema, insertServiceProviderSchema, pricingPlans } from "@shared/schema";
import { properties, userSwipes, offers, purchaseOrders, draftDocuments, lawyerReviews, propertyPaymentSessions, users, transactions, stripeEvents, partnerUsers, servicePartners, lifestyleScouts, scoutMatches } from "@shared/schema";
import { insertLifestyleScoutSchema } from "@shared/schema";
import { reportTypes } from "@shared/reportConfig";
import { db } from "./db";
import { sql, eq, and, gte, lte, inArray } from "drizzle-orm";
import { incrementPersonaSwipeCount } from "./services/persona-detection";
import { analyzeUserPreferences, generatePropertyRecommendations, generateMarketInsights } from "./services/openai";
import { smartAICall, shouldUseAI } from "./services/ai-cache-wrapper";
import { analyzeUserPreferencesSimple, generateSimpleRecommendations, getPopularProperties } from "./services/simple-recommendations";
import { setupAuth, requireAuth, requirePropertyOwnership, requireAdmin } from "./auth";
import { setupPartnerAuth, requirePartnerAuth } from "./partner-auth";
import { trackLead } from "./facebook-conversion-api";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { LINZValidationService } from "./services/linz-validation";
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { sendPasswordResetEmailViaGmail } from './gmail-email';
import { sendManualReportOrderNotification } from './services/manual-report-email.js';
import { EmailService } from './services/email';
import { open2viewService } from './open2view-service';
import { tradeMeService } from './trademe-service';
import { tradeMeSandboxService } from './trademe-sandbox-service';
import linzRoutes from './routes/linz.js';
import propertySnapshotRoutes from './routes/property-snapshot.js';
import reportDeliveryRoutes from './routes/report-delivery.js';
import supportRoutes from './routes/support.js';
import Stripe from 'stripe';
import { Sentry, captureError } from "./sentry";
import { processSentryWebhook, getAllErrors, getErrorWithAnalysis } from './errorMonitoring';

// Initialize Stripe with live production key only
const stripeKey = process.env.STRIPE_SECRET_KEY;

// Validate Stripe key configuration
if (stripeKey) {
  if (stripeKey.startsWith('sk_test_')) {
    console.warn('⚠️  WARNING: Using Stripe TEST key! Switch to live key (sk_live_...) for production.');
  } else if (stripeKey.startsWith('sk_live_')) {
    console.log('✅ Stripe configured with LIVE production key');
  } else {
    console.warn('⚠️  WARNING: Stripe key format unrecognized. Expected sk_live_... or sk_test_...');
  }
} else {
  console.warn('⚠️  Stripe not configured: STRIPE_SECRET_KEY environment variable is missing');
}

const stripe = stripeKey
  ? new Stripe(stripeKey, {
      apiVersion: '2024-12-18.acacia' as any,
    })
  : null;

// H-029: Redact email addresses so they do not appear in plaintext in logs
function redactEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 2)}***@${domain}`;
}

// Derive public base URL from APP_URL — never fall back to localhost
// for the generated Stripe redirect URLs so production payments complete correctly.
function getPublicBaseUrl(req?: { headers?: { host?: string } }): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  if (process.env.NODE_ENV === 'production') {
    // In production APP_URL must be set — surface a clear error rather than silently
    // using localhost (which would leave users on the Stripe-hosted page with no way to return)
    throw new Error('APP_URL must be set in production');
  }
  // Development only
  const host = req?.headers?.host ?? 'localhost:5000';
  return `http://${host}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Serve generated PDFs statically (create directory if it doesn't exist)
  const path = await import('path');
  const fs = await import('fs/promises');
  const pdfsDir = path.join(process.cwd(), 'generated_pdfs');
  await fs.mkdir(pdfsDir, { recursive: true });
  // H-004: Gate the generated_pdfs static mount behind requireAuth so offer PDFs are not
  // world-readable. Full ownership checks are enforced per-file by the individual PDF generation
  // routes; this provides a blanket auth wall as an interim measure.
  app.use('/generated_pdfs', requireAuth, express.static(pdfsDir));
  
  // Generate CSP nonce for each request
  app.use((req: any, res: any, next: any) => {
    res.locals.nonce = randomBytes(16).toString('base64');
    next();
  });
  
  // Security middleware with production-grade CSP
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'", 
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com", // Allow Font Awesome CDN
          // Allow nonce-based inline styles in production, unsafe-inline only in dev
          ...(process.env.NODE_ENV === 'production' 
            ? [(req: any, res: any) => `'nonce-${res.locals.nonce}'`] 
            : ["'unsafe-inline'"])
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
        // H-020: Restrict imgSrc to known domains rather than the blanket https: wildcard
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://storage.googleapis.com",       // GCS property images
          "https://*.storage.googleapis.com",      // Regional GCS buckets
          "https://www.google-analytics.com",      // GA pixel
          "https://lh3.googleusercontent.com",     // Google profile photos (if ever used)
          "https://trademe.co.nz",                 // TradeMe property images
          "https://*.trademe.co.nz",
          "https://*.open2view.com",               // Open2View property images
        ],
        scriptSrc: [
          "'self'",
          "https://www.googletagmanager.com", // Google Analytics
          "https://www.google-analytics.com", // Google Analytics
          // Allow nonce-based inline scripts in production, unsafe-inline only in dev  
          ...(process.env.NODE_ENV === 'production'
            ? [(req: any, res: any) => `'nonce-${res.locals.nonce}'`]
            : ["'unsafe-inline'"])
        ],
        connectSrc: [
          "'self'", 
          "wss:", 
          "ws:",
          "https://www.google-analytics.com", // Google Analytics data collection
          "https://analytics.google.com", // Google Analytics
          "https://*.analytics.google.com", // Google Analytics regional endpoints
          "https://storage.googleapis.com", // Google Cloud Storage for object uploads
          "https://*.storage.googleapis.com", // Regional GCS endpoints
          "https://*.sentry.io", // Sentry error tracking
          "https://*.ingest.sentry.io", // Sentry event ingestion
        ],
        // H-039: Prevent this site from being embedded in any frame (clickjacking defence)
        frameAncestors: ["'none'"],
      },
    },
    // H-039: Cross-Origin-Opener-Policy to isolate browsing context
    crossOriginOpenerPolicy: { policy: "same-origin" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // Disable x-powered-by header
  app.disable('x-powered-by');

  // H-035: Request correlation ID — attach a unique ID to every request for log tracing
  app.use((req: any, res: any, next: any) => {
    const correlationId = req.headers['x-correlation-id'] as string || randomBytes(8).toString('hex');
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);
    next();
  });

  // Global rate limiting
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: { message: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(globalLimiter);

  // Stricter rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth requests per windowMs
    message: { message: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Email rate limiting to prevent spam/DDoS
  const emailLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 email requests per hour
    message: { message: 'Too many email requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // File upload rate limiting
  const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes  
    max: 20, // Limit each IP to 20 uploads per 15 minutes
    message: { message: 'Too many upload requests, please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // CSRF Protection Middleware
  // H-025: CSRF tokens are now bound to the session, not just a cookie double-submit.
  // This prevents an attacker who can set cookies on the domain (sub-domain takeover etc.)
  // from forging the double-submit pair.
  const generateCSRFToken = () => randomBytes(32).toString('hex');
  
  // List of routes that should be exempt from CSRF protection
  // Note: These paths are relative to the /api mount point
  const csrfExemptRoutes = [
    '/csrf',              // CSRF token endpoint itself
    '/webhooks/stripe',   // Stripe webhook (receives POST from Stripe servers)
  ];
  
  const csrfProtection = (req: any, res: any, next: any) => {
    // Skip CSRF for GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    
    // Check if route is exempt from CSRF protection
    // When middleware is mounted on /api, req.path doesn't include /api prefix
    const isExempt = csrfExemptRoutes.some(exemptRoute => 
      req.path.startsWith(exemptRoute)
    );
    
    if (isExempt) {
      return next();
    }

    const tokenFromHeader = req.headers['x-csrf-token'] as string | undefined;

    if (!tokenFromHeader) {
      return res.status(403).json({ message: 'Invalid CSRF token' });
    }

    // H-025: Prefer session-bound validation when a session with a stored token exists.
    // This prevents sub-domain cookie forgery. For anonymous users whose session may not
    // be initialised yet (e.g. before first login), fall back to cookie double-submit so
    // that login/register still work without breaking UX.
    const sessionToken = req.session?.csrfToken as string | undefined;
    const cookieToken = req.cookies?.['csrf-token'] as string | undefined;

    if (sessionToken) {
      // Session is available → use the stronger session-bound check
      const headerBuf = Buffer.from(tokenFromHeader.padEnd(64));
      const sessionBuf = Buffer.from(sessionToken.padEnd(64));
      if (!timingSafeEqual(headerBuf, sessionBuf)) {
        return res.status(403).json({ message: 'Invalid CSRF token' });
      }
    } else if (cookieToken) {
      // No session yet (anonymous user) → fall back to cookie double-submit
      if (tokenFromHeader !== cookieToken) {
        return res.status(403).json({ message: 'Invalid CSRF token' });
      }
    } else {
      // Neither session nor cookie token available
      return res.status(403).json({ message: 'Invalid CSRF token' });
    }

    next();
  };

  // H-038: Security contact disclosure per RFC 9116
  app.get('/.well-known/security.txt', (_req, res) => {
    res.type('text/plain').send(
      `Contact: mailto:security@housematch.co.nz\n` +
      `Preferred-Languages: en\n` +
      `Policy: https://housematch.co.nz/info#security\n` +
      `Expires: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()}\n`
    );
  });

  // SEO: Sitemap.xml endpoint
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const baseUrl = process.env.APP_URL || 'https://housematch.nz';

      // Fetch all properties for sitemap
      const allProperties = await db.select({
        id: properties.id,
        updatedAt: properties.updatedAt,
      }).from(properties).limit(1000);

      const staticPages = [
        { url: '/', changefreq: 'daily', priority: '1.0' },
        { url: '/reports', changefreq: 'weekly', priority: '0.8' },
        { url: '/premium', changefreq: 'monthly', priority: '0.7' },
        { url: '/liked', changefreq: 'daily', priority: '0.6' },
      ];

      let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
      sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

      // Add static pages
      staticPages.forEach(page => {
        sitemap += '  <url>\n';
        sitemap += `    <loc>${baseUrl}${page.url}</loc>\n`;
        sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`;
        sitemap += `    <priority>${page.priority}</priority>\n`;
        sitemap += '  </url>\n';
      });

      // Add property pages
      allProperties.forEach(property => {
        sitemap += '  <url>\n';
        sitemap += `    <loc>${baseUrl}/property/${property.id}</loc>\n`;
        sitemap += `    <lastmod>${property.updatedAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]}</lastmod>\n`;
        sitemap += '    <changefreq>weekly</changefreq>\n';
        sitemap += '    <priority>0.8</priority>\n';
        sitemap += '  </url>\n';
      });

      sitemap += '</urlset>';

      res.header('Content-Type', 'application/xml');
      res.send(sitemap);
    } catch (error) {
      console.error('Sitemap generation error:', error);
      res.status(500).send('Error generating sitemap');
    }
  });

  // SEO: Robots.txt endpoint
  app.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.APP_URL || 'https://housematch.nz';

    const robots = `# HouseMatch.nz Robots.txt
User-agent: *
Allow: /
Allow: /reports
Allow: /premium
Allow: /property/

# Disallow admin and private pages
Disallow: /admin/
Disallow: /profile/
Disallow: /my-offers/
Disallow: /api/

# Crawl-delay to be respectful
Crawl-delay: 1

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml
`;

    res.header('Content-Type', 'text/plain');
    res.send(robots);
  });

  // CSRF token endpoint
  // H-025: Token is stored in the session AND returned in the response body.
  // The client sends it as a request header (X-CSRF-Token).
  // Server validates header against the session value — not a double-submit cookie.
  app.get('/api/csrf', (req: any, res) => {
    const token = generateCSRFToken();
    // H-025: Prefer session-bound storage; fall back to cookie double-submit for anonymous users
    if (req.session) {
      req.session.csrfToken = token;
    } else {
      // Set a cookie for the cookie double-submit fallback when no session is available
      res.cookie('csrf-token', token, {
        httpOnly: false, // Must be readable by JS for header submission
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000, // 1 hour
      });
    }
    res.json({ csrfToken: token });
  });

  // Test endpoints to verify Sentry error capture (development only)
  if (process.env.NODE_ENV === 'development') {
    // Test manual error capture
    app.get('/api/test-sentry-error', (req, res) => {
      captureError(new Error('Test Sentry Error - Manual Capture'), {
        userId: 'test-user-123',
        transactionType: 'sentry-test',
        additionalData: {
          testType: 'backend-manual',
          timestamp: new Date().toISOString()
        }
      });
      res.json({ message: 'Test error sent to Sentry! Check your Sentry dashboard.' });
    });

    // Test automatic error capture via error middleware
    app.get('/api/test-sentry-throw', (req, res, next) => {
      // Throw actual error to trigger error middleware
      throw new Error('Test 500 Error - Automatic Capture via Middleware');
    });
  }

  // ===== SENTRY WEBHOOK - Automated Error Analysis =====
  
  // Helper function to verify Sentry webhook signature
  function verifySentrySignature(req: any): boolean {
    const signature = req.headers['sentry-hook-signature'];
    const clientSecret = process.env.SENTRY_CLIENT_SECRET;
    
    // Skip verification in development if secret is not configured
    if (!clientSecret) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  SENTRY_CLIENT_SECRET not configured - skipping signature verification (development only)');
        return true;
      }
      console.error('❌ SENTRY_CLIENT_SECRET not configured - rejecting webhook');
      return false;
    }
    
    if (!signature) {
      console.error('❌ Missing sentry-hook-signature header');
      return false;
    }
    
    if (!req.rawBody) {
      console.error('❌ Raw body not available for signature verification');
      return false;
    }
    
    try {
      const crypto = require('crypto');
      
      // Use raw body for HMAC computation (before JSON parsing)
      const hmac = crypto.createHmac('sha256', clientSecret);
      hmac.update(req.rawBody, 'utf8');
      const computedDigest = Buffer.from(hmac.digest('hex'), 'hex');
      const sentSignature = Buffer.from(signature, 'hex');
      
      // Use timing-safe comparison to prevent timing attacks
      const isValid = computedDigest.length === sentSignature.length && 
                      timingSafeEqual(computedDigest, sentSignature);
      
      if (!isValid) {
        console.error('❌ Invalid Sentry webhook signature');
      }
      return isValid;
    } catch (error) {
      console.error('❌ Error verifying signature:', error);
      return false;
    }
  }
  
  // Sentry webhook with raw body capture for signature verification
  app.post('/api/sentry-webhook', 
    express.json({
      verify: (req: any, res, buf, encoding) => {
        // Capture raw body during JSON parsing for signature verification
        req.rawBody = buf.toString('utf8');
      }
    }),
    async (req, res) => {
    try {
      // Verify Sentry webhook signature for security
      if (!verifySentrySignature(req)) {
        return res.status(401).json({ error: 'Invalid or missing signature' });
      }
      
      console.log('📡 Received authenticated Sentry webhook');
      
      // Process webhook and analyze with AI
      const error = await processSentryWebhook(req.body);
      
      res.json({ success: true, errorId: error?.id });
    } catch (error) {
      console.error('Error processing Sentry webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // ===== ERROR MONITORING DASHBOARD API =====
  
  // Get all errors for admin dashboard
  app.get('/api/admin/errors', requireAuth, requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const errors = await getAllErrors(limit);
      res.json(errors);
    } catch (error) {
      console.error('Error fetching errors:', error);
      res.status(500).json({ error: 'Failed to fetch errors' });
    }
  });

  // Get error details with AI analysis
  app.get('/api/admin/errors/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const errorData = await getErrorWithAnalysis(req.params.id);
      
      if (!errorData) {
        return res.status(404).json({ error: 'Error not found' });
      }
      
      res.json(errorData);
    } catch (error) {
      console.error('Error fetching error details:', error);
      res.status(500).json({ error: 'Failed to fetch error details' });
    }
  });

  // ===== ADMIN: EARLY BIRD PROMOTION MANAGEMENT =====
  
  // Get current promotion with usage stats
  app.get('/api/admin/early-bird', requireAuth, requireAdmin, async (req, res) => {
    try {
      const promotion = await storage.getActiveEarlyBirdPromotion();
      
      if (!promotion) {
        return res.json({ promotion: null, usage: [] });
      }
      
      const usageCount = await storage.getEarlyBirdUsageCount(promotion.id);
      
      res.json({
        promotion,
        usageCount,
        remaining: promotion.totalLimit - promotion.totalUsed,
        percentageUsed: ((promotion.totalUsed / promotion.totalLimit) * 100).toFixed(1)
      });
    } catch (error) {
      console.error('Error fetching early bird promotion:', error);
      res.status(500).json({ error: 'Failed to fetch promotion details' });
    }
  });

  // 🔒 Mount CSRF protection globally for all API routes
  // This protects all POST/PATCH/PUT/DELETE requests except exempt routes
  // H-016: auth routes must be registered AFTER this so login/register/logout are also protected
  app.use('/api', csrfProtection);

  // Setup authentication (after CSRF so auth endpoints are CSRF-protected)
  setupAuth(app);
  setupPartnerAuth(app);

  // Register protected sub-routers (AFTER CSRF middleware)
  app.use('/api/linz', linzRoutes);
  app.use('/api/property-snapshot', propertySnapshotRoutes);
  app.use('/api/report-delivery', reportDeliveryRoutes);
  app.use('/api/support', supportRoutes);

  // Health check endpoint for production monitoring
  app.get("/api/health", async (req, res) => {
    try {
      // Check database connectivity
      await db.execute(sql`SELECT 1`);
      
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
          database: "operational",
          api: "operational"
        }
      });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Service degraded"
      });
    }
  });

  // Pricing Plans routes
  app.get("/api/pricing-plans", async (req, res) => {
    try {
      const plans = await storage.getActivePricingPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pricing plans" });
    }
  });

  // SECURITY: Removed insecure public seed route - use admin interface or database migration
  
  // SECURITY: Removed dangerous admin export endpoint

  // Admin endpoint to import data into production
  // DISABLED: Dangerous admin import endpoint - security risk
  app.post("/api/admin/import-data-DISABLED", async (req, res) => {
    try {
      const { importKey, data, overwrite = false } = req.body;
      if (importKey !== "import-dev-data-2024") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      if (!data || !data.data) {
        return res.status(400).json({ error: "No data provided" });
      }

      // Check if data already exists
      const existingProperties = await storage.getAllProperties();
      if (existingProperties.length > 0 && !overwrite) {
        return res.status(400).json({ 
          error: "Database already has data. Use overwrite=true to replace.", 
          existingCount: existingProperties.length 
        });
      }

      // Clear existing data if overwrite is enabled
      if (overwrite) {
        // Use raw SQL with CASCADE to handle foreign key constraints automatically
        try {
          await db.execute(sql`TRUNCATE TABLE lawyer_reviews, draft_documents, purchase_orders, offers, user_swipes, properties RESTART IDENTITY CASCADE`);
          console.log('✅ Successfully cleared existing data with CASCADE');
        } catch (error) {
          console.log('⚠️ CASCADE failed, trying individual table deletions...');
          // Fallback to individual deletions if CASCADE fails
          const tablesToClear = [lawyerReviews, draftDocuments, purchaseOrders, offers, userSwipes, properties];
          for (const table of tablesToClear) {
            try {
              await db.delete(table);
            } catch (err) {
              console.warn(`Skipping table deletion:`, err);
            }
          }
        }
      }

      const importedData = data.data;
      const results = {
        properties: 0,
        users: 0,
        swipes: 0,
        offers: 0,
        purchaseOrders: 0
      };

      // Import users (but skip if they already exist)
      if (importedData.users?.length > 0) {
        for (const user of importedData.users) {
          try {
            const existing = await storage.getUserByEmail(user.email);
            if (!existing) {
              await storage.createUser(user);
              results.users++;
            }
          } catch (error) {
            console.warn(`Skipping user ${user.email}:`, error);
          }
        }
      }

      // Import properties
      if (importedData.properties?.length > 0) {
        for (const property of importedData.properties) {
          try {
            // Convert timestamp strings back to Date objects and exclude undefined fields
            const cleanProperty = Object.fromEntries(
              Object.entries(property).filter(([_, value]) => value !== undefined)
            );
            
            // Convert timestamp strings to Date objects
            if (cleanProperty.createdAt) cleanProperty.createdAt = new Date(cleanProperty.createdAt as any);
            if (cleanProperty.updatedAt) cleanProperty.updatedAt = new Date(cleanProperty.updatedAt as any);
            if (cleanProperty.listedAt) cleanProperty.listedAt = new Date(cleanProperty.listedAt as any);
            await storage.createProperty(cleanProperty as any);
            results.properties++;
          } catch (error) {
            console.warn(`Skipping property ${property.id}:`, error);
          }
        }
      }

      // Import swipes
      if (importedData.swipes?.length > 0) {
        for (const swipe of importedData.swipes) {
          try {
            await db.insert(userSwipes).values(swipe).onConflictDoNothing();
            results.swipes++;
          } catch (error) {
            console.warn(`Skipping swipe ${swipe.id}:`, error);
          }
        }
      }

      // Import offers
      if (importedData.offers?.length > 0) {
        for (const offer of importedData.offers) {
          try {
            // Convert timestamp strings back to Date objects and exclude undefined fields
            const cleanOffer = Object.fromEntries(
              Object.entries(offer).filter(([_, value]) => value !== undefined)
            );
            
            // Convert timestamp strings to Date objects
            if (cleanOffer.createdAt) cleanOffer.createdAt = new Date(cleanOffer.createdAt as any);
            if (cleanOffer.updatedAt) cleanOffer.updatedAt = new Date(cleanOffer.updatedAt as any);
            if (cleanOffer.submittedAt) cleanOffer.submittedAt = new Date(cleanOffer.submittedAt as any);
            await db.insert(offers).values(cleanOffer as any).onConflictDoNothing();
            results.offers++;
          } catch (error) {
            console.warn(`Skipping offer ${offer.id}:`, error);
          }
        }
      }

      // Import purchase orders
      if (importedData.purchaseOrders?.length > 0) {
        for (const order of importedData.purchaseOrders) {
          try {
            await db.insert(purchaseOrders).values(order).onConflictDoNothing();
            results.purchaseOrders++;
          } catch (error) {
            console.warn(`Skipping purchase order ${order.id}:`, error);
          }
        }
      }

      res.json({ 
        success: true, 
        message: "Data imported successfully", 
        imported: results,
        source: {
          timestamp: data.timestamp,
          environment: data.environment
        }
      });

    } catch (error) {
      console.error("Error importing data:", error);
      res.status(500).json({ error: "Failed to import data" });
    }
  });

  // Admin endpoint to initialize production database with demo data (one-time use)
  app.post("/api/admin/init-demo-data", async (req, res) => {
    try {
      // Only allow if specifically requested with a special key
      const { initKey } = req.body;
      if (initKey !== "init-demo-properties-2024") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      // Check if already has data
      const existingProperties = await storage.getAllProperties();
      if (existingProperties.length > 0) {
        return res.status(400).json({ 
          error: "Database already has properties", 
          count: existingProperties.length 
        });
      }
      
      // Force seed database even in production (one-time only)
      await (storage as any).seedDatabase(true);
      
      const properties = await storage.getAllProperties();
      res.json({ 
        success: true, 
        message: "Demo data initialized", 
        propertiesCreated: properties.length 
      });
    } catch (error) {
      console.error("Error initializing demo data:", error);
      res.status(500).json({ error: "Failed to initialize demo data" });
    }
  });

  // 🚀 SMART PROPERTY DISCOVERY with SCALING STRATEGY
  // PHASE 1 (0-100 properties): Basic sorting (newest, popular, trending, top-rated)
  // PHASE 2 (100-1000): Add "For You" personalized feed based on user likes
  // PHASE 3 (1000+): AI-powered recommendations, location-based sorting
  app.get("/api/properties", async (req, res) => {
    try {
      const { type, suburb, userId, sort = "newest" } = req.query;
      let properties;
      
      // PHASE 1: Smart Sorting Options
      // - newest: Just listed (default)
      // - popular: Most liked (swipes right)
      // - trending: Most viewed
      // - top-rated: Highest average rating
      
      if (type) {
        properties = await storage.getPropertiesByType(type as string);
      } else if (suburb) {
        properties = await storage.searchProperties({ suburb: suburb as string });
      } else {
        // Get all active properties first
        properties = await storage.getAllProperties();
      }
      
      // Apply sorting PHASE 1: Simple client-side sorting (server-side in PHASE 2 for performance)
      switch (sort) {
        case 'popular':
          // Most liked properties first
          properties = properties.sort((a, b) => (b.likes || 0) - (a.likes || 0));
          break;
        case 'trending':
          // Most viewed properties first
          properties = properties.sort((a, b) => (b.views || 0) - (a.views || 0));
          break;
        case 'top-rated':
          // Highest rated properties first
          // PHASE 2: Add minimum rating count threshold (e.g., at least 5 ratings)
          // PHASE 3: Implement Bayesian average for fair ranking
          properties = properties.sort((a, b) => {
            const aRating = parseFloat(a.averageRating || '0');
            const bRating = parseFloat(b.averageRating || '0');
            return bRating - aRating;
          });
          break;
        case 'newest':
        default:
          // Newest first (already sorted by createdAt DESC in most queries)
          properties = properties.sort((a, b) => {
            return new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime();
          });
          break;
      }
      
      // PHASE 2 (100-1000): Add personalized "For You" feed
      // if (sort === 'for-you' && userId) {
      //   properties = await getPersonalizedFeed(userId, properties);
      // }
      
      res.json(properties);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      // Increment view count
      await storage.updatePropertyMetrics(property.id, (property.views || 0) + 1);
      
      res.json(property);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  app.post("/api/properties", csrfProtection, requireAuth, async (req, res) => {
    try {
      const validatedData = insertPropertySchema.parse(req.body);
      // Add userId to property data from authenticated user
      const propertyData = { ...validatedData, userId: req.user?.id! };
      
      // Check for duplicate properties (fraud detection)
      const existingProperty = await storage.findPropertyByAddressAndLot(
        propertyData.address, 
        propertyData.lotNumber
      );
      
      if (existingProperty) {
        return res.status(409).json({ 
          message: "Property already exists", 
          error: "A property with this address and lot number already exists in our system. This may indicate duplicate listing or fraud.",
          existingProperty: {
            id: existingProperty.id,
            title: existingProperty.title,
            createdAt: existingProperty.createdAt
          }
        });
      }

      const property = await storage.createProperty(propertyData);
      res.status(201).json(property);
    } catch (error: any) {
      // Handle database constraint violations
      if (error.message?.includes('unique constraint') || error.message?.includes('UNIQUE constraint')) {
        return res.status(409).json({ 
          message: "Duplicate property detected", 
          error: "This property appears to already exist in our system (same address/lot number or certificate of title). Please verify your information."
        });
      }
      
      res.status(400).json({ message: "Invalid property data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // AI-powered property description and title generator
  app.post("/api/ai/generate-description", csrfProtection, requireAuth, async (req, res) => {
    try {
      const { aiDescriptionGenerator } = await import('./services/ai-description-generator');
      
      const propertyData = req.body;
      const result = await aiDescriptionGenerator.generatePropertyContent(propertyData);
      
      res.json(result);
    } catch (error: any) {
      console.error('❌ AI description generation error:', error);
      res.status(500).json({ 
        message: "Failed to generate AI content", 
        error: error.message || 'Unknown error'
      });
    }
  });

  app.post("/api/properties/:id/metrics", csrfProtection, requireAuth, requirePropertyOwnership, async (req, res) => {
    try {
      const { views, likes, saves } = req.body;
      await storage.updatePropertyMetrics(req.params.id, views, likes, saves);
      res.json({ message: "Metrics updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update metrics" });
    }
  });

  // Get user's properties
  app.get("/api/users/:userId/properties", requireAuth, async (req, res) => {
    try {
      // Ensure user can only access their own properties
      if (req.params.userId !== req.user?.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const properties = await storage.getUserProperties(req.params.userId);
      res.json(properties);
    } catch (error) {
      console.error("Failed to fetch user properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  // Update property
  app.put("/api/properties/:id", csrfProtection, requireAuth, requirePropertyOwnership, async (req, res) => {
    try {
      const validatedData = insertPropertySchema.parse(req.body);
      
      // Check image limits based on subscription tier
      if (validatedData.additionalImages && Array.isArray(validatedData.additionalImages)) {
        const { getMaxImagesForTier } = await import('@shared/subscriptionConfig');
        const user = req.user!;
        const userTier = user.subscriptionTier || 'free';
        const maxImages = getMaxImagesForTier(userTier);
        
        // Count total images (main + additional)
        const totalImages = 1 + validatedData.additionalImages.length; // 1 for main imageUrl
        
        if (totalImages > maxImages) {
          return res.status(400).json({
            message: `Image limit exceeded`,
            error: `Your ${userTier} plan allows up to ${maxImages} images per property. You're trying to upload ${totalImages} images. Please upgrade to add more images.`,
            currentPlan: userTier,
            maxImages,
            totalImages
          });
        }
      }
      
      const updatedProperty = await storage.updateProperty(req.params.id, validatedData);
      
      res.json({
        message: "Property updated successfully",
        property: updatedProperty
      });
    } catch (error) {
      console.error("Failed to update property:", error);
      res.status(400).json({ 
        message: "Failed to update property", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Delete property (soft delete)
  app.delete("/api/properties/:id", csrfProtection, requireAuth, requirePropertyOwnership, async (req, res) => {
    try {
      await storage.softDeleteProperty(req.params.id);
      res.json({ message: "Property removed from listings" });
    } catch (error) {
      console.error("Failed to delete property:", error);
      res.status(500).json({ message: "Failed to remove property" });
    }
  });

  // ============================================================================
  // EARLY BIRD PROMOTION - Launch Special Routes
  // ============================================================================

  // Get current early bird promotion status
  app.get("/api/early-bird/status", async (req, res) => {
    try {
      const promotion = await storage.getActiveEarlyBirdPromotion();
      const eligibility = await storage.checkEarlyBirdEligibility();
      
      res.json({
        active: !!promotion && eligibility.eligible,
        promotion: promotion || null,
        remaining: eligibility.remaining,
        total: eligibility.total,
        used: promotion ? promotion.totalUsed : 0
      });
    } catch (error) {
      console.error("Failed to get early bird status:", error);
      res.status(500).json({ message: "Failed to get promotion status" });
    }
  });

  // Check if user is eligible for early bird promotion
  app.get("/api/early-bird/eligibility", async (req, res) => {
    try {
      const eligibility = await storage.checkEarlyBirdEligibility();
      res.json(eligibility);
    } catch (error) {
      console.error("Failed to check eligibility:", error);
      res.status(500).json({ message: "Failed to check eligibility" });
    }
  });

  // Claim early bird spot (called during property creation)
  app.post("/api/early-bird/claim", csrfProtection, requireAuth, async (req, res) => {
    try {
      const { propertyId, promotionId } = req.body;
      
      if (!propertyId || !promotionId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const usage = await storage.claimEarlyBirdSpot(promotionId, propertyId, req.user!.id);
      
      res.json({
        success: true,
        message: `Congratulations! You're #${usage.usageNumber} of 100 FREE listings!`,
        usage
      });
    } catch (error) {
      console.error("Failed to claim early bird spot:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to claim promotion" 
      });
    }
  });

  // User swipe routes
  app.post("/api/swipes", csrfProtection, requireAuth, async (req, res) => {
    try {
      // ✅ SAFEGUARD: Check if property exists before creating swipe
      const propertyExists = await storage.getProperty(req.body.propertyId);
      if (!propertyExists) {
        console.warn(`⚠️ Swipe rejected: Property ${req.body.propertyId} not found in database`);
        return res.status(404).json({ 
          message: "Property not found. It may have been removed or is no longer available.",
          propertyId: req.body.propertyId 
        });
      }
      
      // Use authenticated user's ID from session, not from request body
      const swipeData = {
        userId: req.user!.id,  // Use session user, not request body
        propertyId: req.body.propertyId,
        action: req.body.action,
      };
      
      const validatedData = insertUserSwipeSchema.parse(swipeData);
      const swipe = await storage.createUserSwipe(validatedData);
      
      // ✨ Increment persona swipe counter (triggers re-detection at 10 swipes)
      try {
        await incrementPersonaSwipeCount(req.user!.id);
      } catch (error) {
        console.warn('⚠️ Failed to increment persona count:', error);
        // Non-critical, continue
      }
      
      // Update property metrics based on swipe action
      const property = await storage.getProperty(swipe.propertyId!);
      if (property) {
        if (swipe.action === 'like') {
          await storage.updatePropertyMetrics(property.id, undefined, (property.likes || 0) + 1);
        }
      }
      
      res.status(201).json(swipe);
    } catch (error) {
      console.error("❌ Swipe error:", error);
      res.status(400).json({ message: "Invalid swipe data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get all swipes (for testing/debugging)
  app.get("/api/swipes", async (req, res) => {
    try {
      const swipes = await db.select().from(userSwipes);
      res.json(swipes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch swipes" });
    }
  });

  app.get("/api/swipes/:userId", requireAuth, async (req, res) => {
    try {
      // Ensure user can only access their own swipes
      if (req.params.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied - can only access your own swipes" });
      }
      
      const swipes = await storage.getUserSwipes(req.params.userId);
      res.json(swipes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch swipes" });
    }
  });

  app.get("/api/swipes/:userId/count", requireAuth, async (req, res) => {
    try {
      // Ensure user can only access their own swipe count
      if (req.params.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied - can only access your own swipe count" });
      }
      
      const count = await storage.getUserSwipeCount(req.params.userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch swipe count" });
    }
  });

  // Property Sharing Routes
  app.post("/api/shares", csrfProtection, requireAuth, async (req, res) => {
    try {
      const shareData = {
        propertyId: req.body.propertyId,
        sharedBy: req.user!.id,
        sharedWith: req.body.sharedWith || null,
        shareMethod: req.body.shareMethod,
        message: req.body.message || null,
        viewed: false,
      };

      const validatedData = insertPropertyShareSchema.parse(shareData);
      const share = await storage.createPropertyShare(validatedData);

      res.status(201).json(share);
    } catch (error) {
      console.error("Share creation error:", error);
      res.status(400).json({ 
        message: "Failed to create share", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Get user's received shares
  app.get("/api/shares/:userId", requireAuth, async (req, res) => {
    try {
      // Verify user can only see their own shares
      if (req.params.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const shares = await storage.getUserShares(req.params.userId);
      res.json(shares);
    } catch (error) {
      console.error("Failed to fetch shares:", error);
      res.status(500).json({ message: "Failed to fetch shares" });
    }
  });

  // Get shares for a property
  app.get("/api/properties/:propertyId/shares", async (req, res) => {
    try {
      const shares = await storage.getPropertyShares(req.params.propertyId);
      res.json(shares);
    } catch (error) {
      console.error("Failed to fetch property shares:", error);
      res.status(500).json({ message: "Failed to fetch property shares" });
    }
  });

  // Mark share as viewed
  app.patch("/api/shares/:shareId/viewed", requireAuth, async (req, res) => {
    try {
      await storage.markShareAsViewed(req.params.shareId);
      res.json({ message: "Share marked as viewed" });
    } catch (error) {
      console.error("Failed to mark share as viewed:", error);
      res.status(500).json({ message: "Failed to update share" });
    }
  });

  // Get user's liked properties (for property reports dropdown)
  app.get("/api/users/:userId/liked-properties", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Ensure user can only access their own liked properties
      if (userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied - can only access your own liked properties" });
      }
      
      console.log("📋 1. Fetching liked properties for user:", userId);
      
      // Get all swipes where action is 'like'
      const likedSwipes = await db
        .select()
        .from(userSwipes)
        .where(
          and(
            eq(userSwipes.userId, userId),
            eq(userSwipes.action, 'like')
          )
        );
      
      console.log("📋 2. Found swipes:", likedSwipes.length);
      
      if (likedSwipes.length === 0) {
        console.log("📋 3. No swipes found, returning empty array");
        return res.json([]);
      }
      
      // Get the properties for these swipes
      const propertyIds = likedSwipes.map(swipe => swipe.propertyId).filter(Boolean) as string[];
      console.log("📋 3. Property IDs:", propertyIds.length, "IDs");
      
      if (propertyIds.length === 0) {
        console.log("📋 4. No valid property IDs, returning empty array");
        return res.json([]);
      }
      
      // Use inArray for cleaner query
      const likedProperties = await db
        .select()
        .from(properties)
        .where(inArray(properties.id, propertyIds));
      
      console.log("📋 5. Found properties:", likedProperties.length);
      res.json(likedProperties);
    } catch (error) {
      console.error("❌ Failed to fetch liked properties:", error);
      res.status(500).json({ message: "Failed to fetch liked properties" });
    }
  });

  // AI recommendation routes
  app.post("/api/ai/analyze-preferences", csrfProtection, requireAuth, async (req, res) => {
    try {
      // Use authenticated user ID from session, not from request body
      const userId = req.user!.id;

      const swipes = await storage.getUserSwipes(userId);
      
      if (swipes.length < 3) {
        return res.json({
          summary: "Keep swiping to discover your preferences! We'll analyze your choices as you go.",
          preferredPropertyTypes: [],
          priceRange: { min: 0, max: 10000000 },
          preferredLocations: [],
          analysisCount: swipes.length
        });
      }

      // Use local analytics instead of OpenAI
      const { AnalyticsService } = await import("./services/analytics");
      const analyticsService = new AnalyticsService(storage);
      const preferences = await analyticsService.analyzeUserPreferences(userId);
      
      // Format insights for the UI
      const insights = {
        summary: `Based on ${preferences.totalSwipes} swipes, you prefer ${preferences.preferredPropertyTypes.join(', ') || 'various'} properties with ${preferences.preferredBedrooms.join(' or ') || 'any'} bedrooms.`,
        preferredPropertyTypes: preferences.preferredPropertyTypes,
        priceRange: preferences.preferredPriceRange,
        preferredLocations: preferences.preferredSuburbs,
        analysisCount: preferences.totalSwipes,
        likeRatio: Math.round(preferences.likeRatio * 100),
        recommendations: [
          `You tend to like ${preferences.preferredPropertyTypes[0] || 'residential'} properties`,
          preferences.preferredSuburbs.length > 0 ? `Areas like ${preferences.preferredSuburbs.slice(0, 2).join(', ')} appeal to you` : 'You\'re exploring various locations',
          preferences.likeRatio > 0.6 ? 'You have refined taste in properties' : 'You\'re exploring many options to find your perfect match'
        ]
      };
      
      // Save insights to user preferences
      try {
        await storage.createOrUpdateUserPreferences({
          userId,
          preferredPropertyTypes: preferences.preferredPropertyTypes,
          priceRangeMin: preferences.preferredPriceRange.min.toString(),
          priceRangeMax: preferences.preferredPriceRange.max.toString(),
          preferredSuburbs: preferences.preferredSuburbs,
          aiInsights: insights as any,
        });
      } catch (error) {
        console.warn("Failed to save user preferences:", error);
      }

      res.json(insights);
    } catch (error) {
      console.error("Analytics analysis error:", error);
      
      // Fallback response
      res.json({
        summary: "Your preferences are being analyzed. Keep swiping for more insights!",
        preferredPropertyTypes: [],
        priceRange: { min: 0, max: 10000000 },
        preferredLocations: [],
        analysisCount: 0,
        recommendations: ["Continue exploring properties", "Try different areas", "Consider various property types"]
      });
    }
  });

  // 🚀 ADVANCED AI PROPERTY SEARCH - Claude + Proprietary Algorithms
  app.post("/api/ai/search-properties", requireAuth, csrfProtection, async (req, res) => {
    try {
      const { query } = req.body;
      const userId = req.user!.id; // Now guaranteed by requireAuth
      
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      console.log(`🔍 AI Search Query: "${query}"${userId ? ` (user: ${userId})` : ''}`);

      // Import AI search service dynamically
      const { performAIPropertySearch } = await import('./services/ai-property-search');
      
      // Execute advanced AI search with proprietary algorithms
      const results = await performAIPropertySearch(query, userId);

      console.log(`✅ AI Search complete: ${results.length} properties with match scores`);

      res.json({
        query,
        properties: results,
        count: results.length,
      });
    } catch (error) {
      console.error("AI search error:", error);
      res.status(500).json({ 
        message: "Search failed", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.post("/api/ai/recommendations", requireAuth, csrfProtection, async (req, res) => {
    try {
      const userId = req.user!.id; // Get from authenticated session

      // Get user's swipe history
      const userSwipes = await db.query.userSwipes.findMany({
        where: (swipes, { eq }) => eq(swipes.userId, userId),
      });
      
      const swipeCount = userSwipes.length;
      const availableProperties = await storage.getAllProperties();
      
      let recommendations;
      let method = '';

      // Decision tree for recommendations
      if (swipeCount < 5) {
        // New users: show popular properties
        method = 'popular';
        recommendations = getPopularProperties(availableProperties as any, 5);
      } else if (swipeCount < 20) {
        // Learning phase: use simple algorithm
        method = 'simple';
        const likedProperties = await db.query.properties.findMany({
          where: (properties, { inArray }) => inArray(
            properties.id,
            userSwipes.filter(s => s.action === 'like').map(s => s.propertyId!)
          ),
        });
        const dislikedProperties = await db.query.properties.findMany({
          where: (properties, { inArray }) => inArray(
            properties.id,
            userSwipes.filter(s => s.action === 'dislike').map(s => s.propertyId!)
          ),
        });
        
        const simplePreferences = analyzeUserPreferencesSimple(likedProperties as any, dislikedProperties as any);
        const seenPropertyIds = userSwipes.map(s => s.propertyId!);
        recommendations = generateSimpleRecommendations(simplePreferences, availableProperties as any, seenPropertyIds);
      } else {
        // Established user: hybrid AI + caching
        const aiCheck = await shouldUseAI('recommendations', swipeCount);
        
        if (aiCheck.shouldUse) {
          // Use AI (cached every 10 swipes)
          method = 'ai-cached';
          const cacheKey = `recs:${userId}:${Math.floor(swipeCount / 10)}`;
          
          const userPreferences = await storage.getUserPreferences(userId);
          if (!userPreferences?.aiInsights) {
            // Fallback to simple if no AI insights yet
            method = 'simple-fallback';
            const likedProps = await db.query.properties.findMany({
              where: (properties, { inArray }) => inArray(
                properties.id,
                userSwipes.filter(s => s.action === 'like').map(s => s.propertyId!)
              ),
            });
            const simplePrefs = analyzeUserPreferencesSimple(likedProps as any, []);
            const seenIds = userSwipes.map(s => s.propertyId!);
            recommendations = generateSimpleRecommendations(simplePrefs, availableProperties as any, seenIds);
          } else {
            recommendations = await smartAICall(
              'recommendations',
              cacheKey,
              () => generatePropertyRecommendations(userPreferences.aiInsights!, availableProperties),
              { userId, model: 'gpt-3.5-turbo' }
            );
          }
        } else {
          // Between AI calls: use simple algorithm
          method = 'simple-between-ai';
          const likedProps = await db.query.properties.findMany({
            where: (properties, { inArray }) => inArray(
              properties.id,
              userSwipes.filter(s => s.action === 'like').map(s => s.propertyId!)
            ),
          });
          const simplePrefs = analyzeUserPreferencesSimple(likedProps as any, []);
          const seenIds = userSwipes.map(s => s.propertyId!);
          recommendations = generateSimpleRecommendations(simplePrefs, availableProperties as any, seenIds);
        }
      }

      // Get property details for recommendations
      const detailedRecommendations = [];
      for (const rec of recommendations) {
        const property = await storage.getProperty(rec.propertyId);
        if (property) {
          detailedRecommendations.push({
            ...property,
            matchPercentage: rec.matchPercentage,
            reasoning: rec.reasoning,
          });
        }
      }

      console.log(`📊 Recommendations (${method}): ${detailedRecommendations.length} properties for user ${userId} (${swipeCount} swipes)`);
      res.json({ recommendations: detailedRecommendations, method, swipeCount });
    } catch (error) {
      console.error("Recommendations error:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  app.get("/api/ai/market-insights", async (req, res) => {
    try {
      const { location = "Auckland", propertyType = "residential" } = req.query;
      const cacheKey = `insights:${location}:${propertyType}`;
      
      // Market insights are cached for 24 hours (they don't change frequently)
      const insights = await smartAICall(
        'insights',
        cacheKey,
        () => generateMarketInsights(location as string, propertyType as string),
        { model: 'gpt-3.5-turbo' }
      );
      
      console.log(`📊 Market insights for ${location} (${propertyType})`);
      res.json({ insights });
    } catch (error) {
      console.error("Market insights error:", error);
      res.status(500).json({ message: "Failed to generate market insights" });
    }
  });

  // AI Cost Monitoring - Admin Dashboard
  app.get("/api/admin/ai-costs", requireAuth, async (req, res) => {
    try {
      // Only admins can access
      const user = req.user as any;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { getAICostStats } = await import("./services/ai-cache-wrapper");
      
      const today = await getAICostStats('today');
      const week = await getAICostStats('week');
      const month = await getAICostStats('month');

      res.json({
        today,
        week,
        month,
        message: 'AI cost optimization active with GPT-3.5-turbo + caching',
      });
    } catch (error) {
      console.error("AI costs error:", error);
      res.status(500).json({ message: "Failed to get AI cost statistics" });
    }
  });

  // ============================================================================
  // SUBSCRIPTION MANAGEMENT - Premium User Subscriptions
  // ============================================================================

  // Get user's subscription status
  app.get("/api/subscription/status", requireAuth, async (req: any, res) => {
    try {
      const { getUserSubscriptionStatus } = await import("./services/subscription-service");
      const status = await getUserSubscriptionStatus(req.user.id);
      
      res.json(status || { isPremium: false, subscriptionTier: 'free' });
    } catch (error) {
      console.error("Subscription status error:", error);
      res.status(500).json({ message: "Failed to get subscription status" });
    }
  });

  // Get available subscription plans
  app.get("/api/subscription/plans", async (req, res) => {
    try {
      const plans = await db.query.subscriptionPlans.findMany({
        where: (plans, { eq }) => eq(plans.isActive, true),
        orderBy: (plans, { asc }) => [asc(plans.sortOrder)],
      });

      res.json(plans);
    } catch (error) {
      console.error("Get plans error:", error);
      res.status(500).json({ message: "Failed to get subscription plans" });
    }
  });

  // Create Stripe checkout session for premium subscription
  app.post("/api/subscription/create-checkout", requireAuth, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Payment system not configured" });
      }

      const { planId } = req.body;
      
      if (!planId) {
        return res.status(400).json({ message: "Plan ID required" });
      }

      const plan = await db.query.subscriptionPlans.findFirst({
        where: (plans, { eq }) => eq(plans.id, planId),
      });

      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      // Create or get Stripe customer
      let stripeCustomerId = req.user.stripeCustomerId;
      
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: req.user.email,
          name: req.user.name,
          metadata: {
            userId: req.user.id,
          },
        });
        
        stripeCustomerId = customer.id;
        
        // Save Stripe customer ID
        await db.update(users)
          .set({ stripeCustomerId: customer.id })
          .where(eq(users.id, req.user.id));
      }

      // Create subscription checkout session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: plan.currency,
            product_data: {
              name: plan.displayName,
              description: `Premium subscription - ${plan.features.join(', ')}`,
            },
            unit_amount: plan.price, // Price in cents
            recurring: {
              interval: plan.interval as 'month' | 'year',
            },
          },
          quantity: 1,
        }],
        mode: 'subscription',
        // H-018: Use getPublicBaseUrl so production deployments never fall back to localhost
        success_url: `${getPublicBaseUrl(req)}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${getPublicBaseUrl(req)}/subscription`,
        metadata: {
          userId: req.user.id,
          planId: plan.id,
        },
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
      console.error("Create checkout error:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  // Cancel subscription
  app.post("/api/subscription/cancel", requireAuth, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Payment system not configured" });
      }

      if (!req.user.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription" });
      }

      // Cancel at period end (user keeps access until end of billing period)
      await stripe.subscriptions.update(req.user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      // Update user record
      await db.update(users)
        .set({ subscriptionStatus: 'cancelled' })
        .where(eq(users.id, req.user.id));

      res.json({ message: "Subscription cancelled successfully" });
    } catch (error) {
      console.error("Cancel subscription error:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // Stripe webhook for subscription events
  app.post("/api/webhooks/stripe/subscription", async (req, res) => {
    try {
      if (!stripe) {
        console.error('❌ Webhook called but Stripe not configured');
        return res.status(503).json({ message: "Payment system not configured" });
      }

      const sig = req.headers['stripe-signature'];
      
      if (!sig) {
        console.error('❌ Webhook missing signature');
        return res.status(400).send('No signature');
      }

      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error('❌ STRIPE_WEBHOOK_SECRET is not configured — webhook rejected');
        return res.status(500).json({ message: 'Webhook not configured' });
      }

      let event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          webhookSecret
        );
        console.log(`📨 Stripe webhook event: ${event.type}`);
      } catch (err) {
        console.error('❌ Webhook signature verification failed:', err);
        return res.status(400).send(`Webhook Error: ${err}`);
      }

      // 🔒 SECURITY: Insert-first idempotency — atomically claim the event before processing.
      // onConflictDoNothing ensures only one concurrent handler wins; if the insert returns
      // no rows the event was already processed and we skip safely (H-023).
      const [claimedEvent] = await db.insert(stripeEvents).values({
        stripeEventId: event.id,
        eventType: event.type,
        payload: event,
        stripeCreated: new Date(event.created * 1000),
        livemode: event.livemode,
        account: event.account || null,
        processed: true,
      }).onConflictDoNothing().returning();

      if (!claimedEvent) {
        console.log(`⚠️ Event ${event.id} already processed - skipping`);
        return res.status(200).json({ received: true, message: 'Already processed' });
      }

      console.log(`✅ Event ${event.id} claimed for processing`);

      // Handle subscription events
      try {
        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object as any;
            
            // Handle subscription payments
            if (session.mode === 'subscription') {
              const userId = session.metadata.userId;
              const partnerId = session.metadata.partnerId;
              
              // ===== PARTNER SUBSCRIPTION (Preferred Client) =====
              if (partnerId) {
                const subscriptionData = await stripe.subscriptions.retrieve(session.subscription);
                
                // Update partner to verified status and save subscription data
                const [updatedPartner] = await db.update(servicePartners)
                  .set({
                    verificationStatus: 'verified',
                    status: 'active',
                    verifiedAt: new Date(),
                    stripeSubscriptionId: subscriptionData.id,
                    subscriptionStatus: 'active',
                    currentPeriodEnd: new Date((subscriptionData as any).current_period_end * 1000),
                  })
                  .where(eq(servicePartners.id, partnerId))
                  .returning();
                
                if (updatedPartner) {
                  // H-023: Idempotent credential creation — check first so a webhook replay
                  // doesn't create a second account or send a duplicate credentials email.
                  const [existingPartnerUser] = await db
                    .select({ id: partnerUsers.id })
                    .from(partnerUsers)
                    .where(eq(partnerUsers.email, updatedPartner.email))
                    .limit(1);

                  if (!existingPartnerUser) {
                    const temporaryPassword = generateSecurePassword();
                    const hashedPassword = await hashPassword(temporaryPassword);
                    
                    await db.insert(partnerUsers).values({
                      partnerId: updatedPartner.id,
                      email: updatedPartner.email,
                      password: hashedPassword,
                      name: updatedPartner.contactName,
                      role: 'admin',
                      status: 'active',
                    });
                    
                    await EmailService.sendPartnerApprovalEmail({
                      companyName: updatedPartner.companyName,
                      contactName: updatedPartner.contactName,
                      email: updatedPartner.email,
                      loginEmail: updatedPartner.email,
                      temporaryPassword: temporaryPassword,
                      accountType: updatedPartner.accountType,
                    });
                    
                    console.log(`✅ Partner subscription activated and credentials sent: ${redactEmail(updatedPartner.email)} (${subscriptionData.id})`);
                  } else {
                    console.log(`⚠️ Partner credentials already exist for ${redactEmail(updatedPartner.email)} — skipping (idempotent)`);
                  }
                } else {
                  console.error(`❌ Failed to update partner ${partnerId} - partner not found`);
                }
              }
              // ===== REGULAR USER SUBSCRIPTION (Premium) =====
              else if (userId) {
                const subscriptionData = await stripe.subscriptions.retrieve(session.subscription);
                
                const result = await db.update(users)
                  .set({
                    subscriptionTier: 'premium',
                    subscriptionStatus: 'active',
                    stripeSubscriptionId: subscriptionData.id,
                    subscriptionStartDate: new Date((subscriptionData as any).current_period_start * 1000),
                    subscriptionEndDate: new Date((subscriptionData as any).current_period_end * 1000),
                  })
                  .where(eq(users.id, userId))
                  .returning();
                
                if (result.length > 0) {
                  console.log(`✅ Subscription activated for user ${userId} (${subscriptionData.id})`);
                } else {
                  console.error(`❌ Failed to update user ${userId} - user not found`);
                }
              } else {
                console.error('❌ No userId or partnerId in session metadata');
              }
            }
            
            // Handle property listing payments
            else if (session.mode === 'payment' && session.metadata?.planType === 'listing') {
              const propertyId = session.metadata.propertyId;
              const planId = session.metadata.planId;
              const duration = parseInt(session.metadata.duration || '0');
              
              if (!propertyId) {
                console.error('❌ No propertyId in session metadata');
                break;
              }

              // 🔒 SECURITY: Use transaction for atomic updates
              await db.transaction(async (tx) => {
                // Verify property exists and check payment status
                const [existingProperty] = await tx.select()
                  .from(properties)
                  .where(eq(properties.id, propertyId));

                if (!existingProperty) {
                  console.error(`❌ Property ${propertyId} not found - cannot activate`);
                  throw new Error('Property not found');
                }

                // 🔒 SECURITY: Prevent double-payment processing
                if (existingProperty.paymentStatus === 'paid') {
                  console.warn(`⚠️ Property ${propertyId} already activated - skipping`);
                  return;
                }

                // Calculate expiration date based on plan duration
                const now = new Date();
                const expiresAt = duration > 0 ? new Date(now.getTime() + duration * 24 * 60 * 60 * 1000) : null;

                // Update ALL payment-related fields atomically
                const result = await tx.update(properties)
                  .set({
                    isActive: true,
                    paymentStatus: 'paid',
                    activatedAt: now,
                    selectedPlan: planId,
                    expiresAt,
                  })
                  .where(eq(properties.id, propertyId))
                  .returning();
                
                if (result.length > 0) {
                  console.log(`✅ Property ${propertyId} fully activated:`, {
                    paymentStatus: 'paid',
                    activatedAt: now,
                    selectedPlan: planId,
                    expiresAt,
                  });
                } else {
                  console.error(`❌ Failed to activate property ${propertyId} - update failed`);
                  throw new Error('Property activation failed');
                }
              });
            }
            break;
          }

          case 'customer.subscription.updated': {
            const subscription = event.data.object as any;
            const customer = await stripe.customers.retrieve(subscription.customer);
            const userId = (customer as any).metadata?.userId;
            
            if (userId) {
              const result = await db.update(users)
                .set({
                  subscriptionStatus: subscription.status,
                  subscriptionEndDate: new Date(subscription.current_period_end * 1000),
                })
                .where(eq(users.id, userId))
                .returning();
              
              if (result.length > 0) {
                console.log(`✅ Subscription updated for user ${userId}: status=${subscription.status}`);
              }
            } else {
              console.error('❌ No userId found for customer');
            }
            break;
          }

          case 'customer.subscription.deleted': {
            const subscription = event.data.object as any;
            const customer = await stripe.customers.retrieve(subscription.customer);
            const userId = (customer as any).metadata?.userId;
            
            if (userId) {
              const result = await db.update(users)
                .set({
                  subscriptionTier: 'free',
                  subscriptionStatus: 'inactive',
                  stripeSubscriptionId: null,
                  subscriptionEndDate: new Date(),
                })
                .where(eq(users.id, userId))
                .returning();
              
              if (result.length > 0) {
                console.log(`✅ Subscription cancelled for user ${userId}`);
              }
            } else {
              console.error('❌ No userId found for customer');
            }
            break;
          }

          default:
            console.log(`ℹ️  Unhandled webhook event: ${event.type}`);
        }
        // Event was already recorded before processing (H-023 insert-first pattern)
        console.log(`✅ Event ${event.id} processed successfully`);
      } catch (eventError) {
        console.error(`❌ Error processing ${event.type}:`, eventError);
        // Still return 200 to Stripe to prevent retries
      }

      res.json({ received: true });
    } catch (error) {
      console.error("❌ Webhook error:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // Open2view API Integration - Test Endpoints
  app.get("/api/open2view/test", async (req, res) => {
    try {
      const result = await open2viewService.testConnection();
      res.json(result);
    } catch (error) {
      console.error('Open2view test error:', error);
      res.status(500).json({ error: 'Failed to test Open2view connection' });
    }
  });

  app.get("/api/open2view/property/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const property = await open2viewService.getProperty(id);
      
      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }
      
      res.json(property);
    } catch (error) {
      console.error('Open2view property fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch property from Open2view' });
    }
  });

  app.get("/api/open2view/search", async (req, res) => {
    try {
      const filters = {
        category: req.query.category as 'residential' | 'commercial' | 'agricultural' | undefined,
        status: req.query.status as 'current' | 'contract' | 'sold' | 'rented' | undefined,
        property_type: req.query.property_type as string | undefined,
        price_from: req.query.price_from ? parseInt(req.query.price_from as string) : undefined,
        price_to: req.query.price_to ? parseInt(req.query.price_to as string) : undefined,
        bedrooms: req.query.bedrooms ? parseInt(req.query.bedrooms as string) : undefined,
        bathrooms: req.query.bathrooms ? parseInt(req.query.bathrooms as string) : undefined,
        suburb: req.query.suburb as string | undefined,
        region: req.query.region as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        detail: (req.query.detail as 'short' | 'full') || 'short'
      };

      const properties = await open2viewService.searchProperties(filters);
      res.json({ properties, count: properties.length });
    } catch (error) {
      console.error('Open2view search error:', error);
      res.status(500).json({ error: 'Failed to search properties from Open2view' });
    }
  });

  // Trade Me API Integration - Test Endpoints
  app.get("/api/trademe/test", async (req, res) => {
    try {
      const result = await tradeMeService.testConnection();
      res.json(result);
    } catch (error) {
      console.error('Trade Me test error:', error);
      res.status(500).json({ error: 'Failed to test Trade Me connection' });
    }
  });

  app.get("/api/trademe/residential", async (req, res) => {
    try {
      const filters = {
        region: req.query.region ? parseInt(req.query.region as string) : undefined,
        suburb: req.query.suburb as string,
        price_min: req.query.price_min ? parseInt(req.query.price_min as string) : undefined,
        price_max: req.query.price_max ? parseInt(req.query.price_max as string) : undefined,
        bedrooms_min: req.query.bedrooms_min ? parseInt(req.query.bedrooms_min as string) : undefined,
        bedrooms_max: req.query.bedrooms_max ? parseInt(req.query.bedrooms_max as string) : undefined,
        property_type: req.query.property_type as string,
        rows: req.query.rows ? parseInt(req.query.rows as string) : 5,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        photo_size: req.query.photo_size as any || 'Large'
      };

      const properties = await tradeMeService.searchResidential(filters);
      res.json({ properties, count: properties.length });
    } catch (error) {
      console.error('Trade Me residential search error:', error);
      res.status(500).json({ error: 'Failed to search residential properties on Trade Me' });
    }
  });

  app.get("/api/trademe/openhomes", async (req, res) => {
    try {
      const filters = {
        region: req.query.region ? parseInt(req.query.region as string) : undefined,
        suburb: req.query.suburb as string,
        rows: req.query.rows ? parseInt(req.query.rows as string) : 10,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        photo_size: req.query.photo_size as any || 'Large'
      };

      const properties = await tradeMeService.searchOpenHomes(filters);
      res.json({ properties, count: properties.length });
    } catch (error) {
      console.error('Trade Me open homes search error:', error);
      res.status(500).json({ error: 'Failed to search open homes on Trade Me' });
    }
  });

  // Trade Me Sandbox API - Test Endpoints (Immediate Access)
  app.get("/api/trademe/sandbox/test", async (req, res) => {
    try {
      const result = await tradeMeSandboxService.getSampleProperties();
      res.json(result);
    } catch (error) {
      console.error('Trade Me sandbox test error:', error);
      res.status(500).json({ error: 'Failed to test Trade Me sandbox connection' });
    }
  });

  app.get("/api/trademe/sandbox/basic", async (req, res) => {
    try {
      const result = await tradeMeSandboxService.testSandboxBasic();
      res.json(result);
    } catch (error) {
      console.error('Trade Me sandbox basic test error:', error);
      res.status(500).json({ error: 'Failed to test Trade Me sandbox basic connection' });
    }
  });

  app.get("/api/trademe/sandbox/oauth", async (req, res) => {
    try {
      const result = await tradeMeSandboxService.testSandboxOAuth();
      res.json(result);
    } catch (error) {
      console.error('Trade Me sandbox OAuth test error:', error);
      res.status(500).json({ error: 'Failed to test Trade Me sandbox OAuth connection' });
    }
  });

  app.get("/api/trademe/sandbox/properties", async (req, res) => {
    try {
      const filters = {
        region: req.query.region ? parseInt(req.query.region as string) : 1,
        rows: req.query.rows ? parseInt(req.query.rows as string) : 10,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        photo_size: req.query.photo_size as any || 'Large'
      };

      const properties = await tradeMeSandboxService.searchResidential(filters);
      res.json({ properties, count: properties.length });
    } catch (error) {
      console.error('Trade Me sandbox properties search error:', error);
      res.status(500).json({ error: 'Failed to search properties in Trade Me sandbox' });
    }
  });

  // Purchase order routes
  app.post("/api/purchase-orders", csrfProtection, async (req, res) => {
    try {
      const validatedData = insertPurchaseOrderSchema.parse(req.body);
      const order = await storage.createPurchaseOrder(validatedData);
      res.status(201).json(order);
    } catch (error) {
      res.status(400).json({ message: "Invalid purchase order data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/purchase-orders/:userId", requireAuth, async (req, res) => {
    try {
      // Ensure user can only access their own purchase orders
      if (req.params.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied - can only access your own orders" });
      }
      
      const orders = await storage.getUserPurchaseOrders(req.params.userId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  app.patch("/api/purchase-orders/:id/status", csrfProtection, async (req, res) => {
    try {
      const { status } = req.body;
      await storage.updatePurchaseOrderStatus(req.params.id, status);
      res.json({ message: "Order status updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Service Order routes (Building Inspection & Meth Testing)
  app.post("/api/service-orders", requireAuth, csrfProtection, async (req, res) => {
    try {
      const { insertServiceOrderSchema } = await import("@shared/schema");
      const validatedData = insertServiceOrderSchema.parse({
        ...req.body,
        buyerId: req.user!.id,
      });
      const order = await storage.createServiceOrder(validatedData);
      
      // TODO: Send email notification to admin about new service order
      console.log('📋 New service order created:', {
        orderId: order.id,
        serviceType: order.serviceType,
        customerEmail: order.customerEmail,
      });
      
      res.status(201).json(order);
    } catch (error) {
      captureError(error as Error, {
        userId: req.user?.id,
        additionalData: { context: 'Service Order Creation', body: req.body },
      });
      res.status(400).json({ 
        message: "Invalid service order data", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.get("/api/service-orders", requireAuth, async (req, res) => {
    try {
      const orders = await storage.getUserServiceOrders(req.user!.id);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch service orders" });
    }
  });

  app.get("/api/service-orders/all", requireAuth, requireAdmin, async (req, res) => {
    try {
      const orders = await storage.getAllServiceOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all service orders" });
    }
  });

  // Service Inquiry routes (Moving, Staging, Cleaning, Hosting)
  app.post("/api/service-inquiries", csrfProtection, async (req, res) => {
    try {
      const { insertServiceInquirySchema } = await import("@shared/schema");
      const validatedData = insertServiceInquirySchema.parse({
        ...req.body,
        userId: req.user?.id || null,
      });
      const inquiry = await storage.createServiceInquiry(validatedData);
      
      // Send email notification to admin
      try {
        const { sendServiceInquiryEmail } = await import("./services/gmail-transport");
        await sendServiceInquiryEmail(inquiry);
      } catch (emailError) {
        console.error('Failed to send inquiry email:', emailError);
        // Don't fail the request if email fails
      }
      
      res.status(201).json(inquiry);
    } catch (error) {
      captureError(error as Error, {
        userId: req.user?.id,
        additionalData: { context: 'Service Inquiry Creation', body: req.body },
      });
      res.status(400).json({ 
        message: "Invalid inquiry data", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // LINZ Property Validation routes
  app.post("/api/validate-property", csrfProtection, async (req, res) => {
    try {
      const { lotNumber, address, suburb } = req.body;
      
      if (!lotNumber || !address) {
        return res.status(400).json({ 
          message: "Lot number and address are required for validation" 
        });
      }

      const linzService = new LINZValidationService();
      const validation = await linzService.crossValidateProperty(lotNumber, address, suburb);
      
      // Simplified verification approach
      let message = '';
      let valid = false;
      let verifiedComponents = [];
      
      if (validation.lotValid.isValid) {
        verifiedComponents.push('Lot number');
      }
      if (validation.addressValid.isValid) {
        verifiedComponents.push('Address format');
      }
      
      if (verifiedComponents.length === 2) {
        message = 'Property components verified. Please confirm details are accurate.';
        valid = true; // Allow submission with self-declaration
      } else if (verifiedComponents.length === 1) {
        message = `${verifiedComponents[0]} verified. Please check other details.`;
        valid = true; // Still allow with warning
      } else {
        message = 'Unable to verify property details. Please check your information.';
        valid = false; // Block obvious errors
      }

      res.json({
        valid,
        details: {
          lotNumberValid: validation.lotValid.isValid,
          addressValid: validation.addressValid.isValid,
          crossMatch: validation.crossMatch,
          lotError: validation.lotValid.error,
          addressError: validation.addressValid.error,
          suggestions: {
            lotSuggestions: validation.lotValid.suggestions || [],
            addressSuggestions: validation.addressValid.suggestions || []
          }
        },
        message
      });
    } catch (error) {
      console.error('Property validation error:', error);
      res.status(500).json({ 
        message: "Validation service temporarily unavailable" 
      });
    }
  });

  // Individual field validation routes
  app.post("/api/validate-lot-number", csrfProtection, async (req, res) => {
    try {
      const { lotNumber } = req.body;
      
      if (!lotNumber) {
        return res.status(400).json({ 
          message: "Lot number is required" 
        });
      }

      const linzService = new LINZValidationService();
      const validation = await linzService.validateLotNumber(lotNumber);
      
      res.json({
        valid: validation.isValid,
        message: validation.isValid 
          ? `Lot number verified in LINZ database` 
          : `Lot number not found in LINZ database`,
        suggestions: validation.suggestions || []
      });
    } catch (error) {
      console.error('Lot number validation error:', error);
      res.status(500).json({ 
        message: "Validation service temporarily unavailable" 
      });
    }
  });

  app.post("/api/validate-address", csrfProtection, async (req, res) => {
    try {
      const { address, suburb } = req.body;
      
      if (!address) {
        return res.status(400).json({ 
          message: "Address is required" 
        });
      }

      const linzService = new LINZValidationService();
      const validation = await linzService.validateNZAddress(address, suburb);
      
      res.json({
        valid: validation.isValid,
        message: validation.isValid 
          ? `Valid New Zealand address format` 
          : validation.error || `Invalid address format`,
      });
    } catch (error) {
      console.error('Address validation error:', error);
      res.status(500).json({ 
        message: "Validation service temporarily unavailable" 
      });
    }
  });

  app.post("/api/validate-certificate", csrfProtection, async (req, res) => {
    try {
      const { certificate } = req.body;
      
      if (!certificate) {
        return res.status(400).json({ 
          message: "Certificate is required" 
        });
      }

      // Basic certificate format validation
      const isValid = /^CT\s+\d+\/\d+$/i.test(certificate.trim());
      
      res.json({
        valid: isValid,
        message: isValid 
          ? `Valid certificate format` 
          : `Invalid certificate format (should be CT XXXXXX/XXX)`,
      });
    } catch (error) {
      console.error('Certificate validation error:', error);
      res.status(500).json({ 
        message: "Validation service temporarily unavailable" 
      });
    }
  });

  app.get("/api/property-suggestions", async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string' || q.length < 3) {
        return res.json({ suggestions: [] });
      }

      const linzService = new LINZValidationService();
      const suggestions = await linzService.getPropertySuggestions(q);
      
      res.json({ suggestions });
    } catch (error) {
      console.error('Property suggestions error:', error);
      res.json({ suggestions: [] });
    }
  });

  // Object Storage routes for file uploads
  
  // This endpoint is used to serve public assets.
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // This endpoint serves objects from object storage.
  // H-003: Files under the private path (.private/) require authentication.
  //        Public files remain accessible to all. A full ACL ownership check via
  //        canAccessObject is the recommended long-term fix once ACL groups are wired.
  app.get("/objects/:objectPath(*)", async (req: any, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      // Only gate files stored under the private directory
      const PRIVATE_DIR = process.env.PRIVATE_OBJECT_DIR ?? '.private';
      const isPrivate = req.path.startsWith(`/objects/${PRIVATE_DIR}/`) ||
                        req.path.startsWith(`/objects/.private/`);

      if (isPrivate) {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
          return res.status(401).json({ message: 'Authentication required' });
        }
      }

      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // This endpoint is used to get the upload URL for an object entity.
  // H-017: Validate content-type before issuing a signed URL so only image files can be uploaded.
  const ALLOWED_UPLOAD_MIME_TYPES = new Set([
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  ]);
  const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

  app.post("/api/objects/upload", csrfProtection, requireAuth, uploadLimiter, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      // H-017: Validate that the client declares a supported content type
      const { contentType, fileSizeBytes } = req.body;

      if (contentType && !ALLOWED_UPLOAD_MIME_TYPES.has(contentType)) {
        return res.status(415).json({
          error: `Unsupported file type: ${contentType}. Only image uploads are allowed.`,
        });
      }

      if (fileSizeBytes && fileSizeBytes > MAX_UPLOAD_SIZE_BYTES) {
        return res.status(413).json({
          error: `File too large (${fileSizeBytes} bytes). Maximum allowed: ${MAX_UPLOAD_SIZE_BYTES} bytes.`,
        });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({
        uploadURL,
        allowedContentTypes: [...ALLOWED_UPLOAD_MIME_TYPES],
        maxSizeBytes: MAX_UPLOAD_SIZE_BYTES,
      });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // An example endpoint for updating the model state after an object entity is uploaded (property image in this case).
  // H-015: requireAuth ensures only authenticated users can trigger image normalisation
  app.put("/api/property-images", requireAuth, csrfProtection, async (req, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    try {
      const imageURL = req.body.imageURL;
      
      // If it's already a normalized path, return it
      if (!imageURL.startsWith("https://storage.googleapis.com/")) {
        return res.status(200).json({ objectPath: imageURL });
      }

      // Extract the filename from the GCS URL
      // URL format: https://storage.googleapis.com/bucket/.private/uploads/FILENAME
      const url = new URL(imageURL);
      const pathParts = url.pathname.split("/");
      
      // Get the filename (last part of the path)
      const filename = pathParts[pathParts.length - 1];
      
      if (!filename) {
        return res.status(400).json({ error: "Invalid image URL format" });
      }

      // Return the path format that works with /objects/ route
      // Files are stored at: .private/uploads/filename
      // So we need: /objects/uploads/filename
      const normalizedPath = `/objects/uploads/${filename}`;

      res.status(200).json({
        objectPath: normalizedPath,
      });
    } catch (error) {
      console.error("Error setting property image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Service Provider Routes
  app.get("/api/service-providers", async (req, res) => {
    try {
      const { category } = req.query;
      let providers;
      
      if (category && category !== "all") {
        providers = await storage.getServiceProvidersByCategory(category as string);
      } else {
        providers = await storage.getApprovedServiceProviders();
      }
      
      res.json(providers);
    } catch (error) {
      console.error("Failed to fetch service providers:", error);
      res.status(500).json({ message: "Failed to fetch service providers" });
    }
  });

  app.get("/api/service-providers/:id", async (req, res) => {
    try {
      const provider = await storage.getServiceProviderById(req.params.id);
      if (!provider) {
        return res.status(404).json({ message: "Service provider not found" });
      }
      res.json(provider);
    } catch (error) {
      console.error("Failed to fetch service provider:", error);
      res.status(500).json({ message: "Failed to fetch service provider" });
    }
  });

  // H-015: requireAdmin — only admins should create service providers
  app.post("/api/service-providers", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertServiceProviderSchema.parse(req.body);
      const provider = await storage.createServiceProvider(validatedData);
      res.status(201).json(provider);
    } catch (error: any) {
      console.error("Failed to create service provider:", error);
      if (error.code === '23505') { // Unique constraint violation
        res.status(409).json({ 
          message: "Email already exists", 
          error: "A service provider with this email already exists." 
        });
      } else {
        res.status(400).json({ message: "Invalid service provider data", error: error instanceof Error ? error.message : String(error) });
      }
    }
  });

  // User profile picture update endpoint
  app.put("/api/users/:id/profile-picture", requireAuth, async (req, res) => {
    try {
      const userId = req.params.id;
      const { profilePicture } = req.body;

      // Verify user is updating their own profile
      if (req.user?.id !== userId) {
        return res.status(403).json({ message: "You can only update your own profile picture" });
      }

      // Validate profile picture is safe (emoji or predefined avatar)
      // H-032: Use regex literal to avoid inconsistent \u{} escaping in string constructor
      // H-032: Correct emoji regex literal (all ranges use \u{XXXX} with u flag)
      const emojiRegex = /\p{Emoji}/u;
      const isEmoji = emojiRegex.test(profilePicture);
      const validAvatars = ['avatar1', 'avatar2', 'avatar3', 'avatar4', 'avatar5', 'avatar6', 'avatar7', 'avatar8'];
      const isValidAvatar = validAvatars.includes(profilePicture);

      if (!isEmoji && !isValidAvatar) {
        return res.status(400).json({ message: "Invalid profile picture. Must be an emoji or standard avatar." });
      }

      const updatedUser = await storage.updateUser(userId, { profilePicture });
      res.json({ message: "Profile picture updated successfully", user: updatedUser });
    } catch (error) {
      console.error("Failed to update profile picture:", error);
      res.status(500).json({ message: "Failed to update profile picture" });
    }
  });

  // Password Reset Routes
  const scryptAsync = promisify(scrypt);

  // Helper function for hashing passwords
  // H-021: Fixed generateSecurePassword — rejection sampling eliminates modulo bias
  function generateSecurePassword(length: number = 16): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    const out: string[] = [];
    while (out.length < length) {
      const buf = randomBytes(length * 2);
      for (let i = 0; i < buf.length && out.length < length; i++) {
        const x = buf[i];
        // Reject bytes that would bias the modulo
        if (x < 256 - (256 % chars.length)) {
          out.push(chars[x % chars.length]);
        }
      }
    }
    return out.join('');
  }

  async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }

  // Password reset request (send email with reset link)
  app.post("/api/auth/forgot-password", csrfProtection, authLimiter, emailLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // H-041: Respond immediately on BOTH paths (user found or not) so the response time
      // reveals nothing about whether an email is registered. The DB write + email send are
      // the real timing delta (~50-200ms); token generation was microseconds and insufficient.
      // Capture request properties before going async — req may not be valid after res.json().
      const protocol = req.protocol;
      const host = req.get('host') ?? '';

      const user = await storage.getUserByEmail(email);

      // Always return the same message — never reveal account existence
      res.json({ 
        message: "If an account with this email exists, you will receive a password reset link shortly." 
      });

      // Fire-and-forget: token creation + email happen after response is sent
      if (user) {
        (async () => {
          const resetToken = randomBytes(32).toString('hex');
          const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
          await storage.createPasswordResetToken(user.id, resetToken, expiresAt);
          const resetUrl = `${protocol}://${host}/reset-password?token=${resetToken}`;
          const emailSent = await sendPasswordResetEmailViaGmail({
            email: user.email,
            name: user.name,
            resetToken,
            resetUrl,
          });
          if (!emailSent) {
            console.error('[forgot-password] Email send failed for user:', user.id);
          }
          await storage.cleanupExpiredTokens();
        })().catch(err => {
          console.error('[forgot-password] Background task failed:', err);
        });
      }
    } catch (error) {
      console.error("Password reset request error:", error);
      // Only reached if getUserByEmail itself throws (before res.json was called)
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to process password reset request" });
      }
    }
  });

  // Password reset execution (process the reset with token)
  app.post("/api/auth/reset-password", csrfProtection, authLimiter, async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      // H-011: Use same 12-char minimum as registration (was incorrectly 6)
      if (newPassword.length < 12) {
        return res.status(400).json({ message: "Password must be at least 12 characters long" });
      }

      // Validate token and get userId
      const tokenData = await storage.validatePasswordResetToken(token);
      if (!tokenData) {
        return res.status(400).json({ 
          message: "Invalid or expired reset token. Please request a new password reset link." 
        });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update user's password
      await storage.updateUserPassword(tokenData.userId, hashedPassword);
      
      // Mark token as used
      await storage.markTokenAsUsed(token);

      // H-012: Invalidate all other sessions for this user after password reset
      // This ensures compromised sessions cannot continue after the user resets their password
      try {
        await db.execute(
          sql`DELETE FROM user_sessions WHERE sess->>'passport' IS NOT NULL AND (sess->'passport'->>'user') = ${tokenData.userId}`
        );
      } catch (sessionErr) {
        // Non-fatal: log but continue — the password has already been updated
        console.error('Failed to invalidate sessions after password reset:', sessionErr);
      }

      console.log(`✅ Password reset completed for user ${tokenData.userId}`);

      res.json({ message: "Password reset successfully! All other sessions have been signed out. You can now log in with your new password." });
    } catch (error) {
      console.error("Password reset execution error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Admin routes - REQUIRES ADMIN ROLE
  app.put("/api/service-providers/:id/status", requireAdmin, async (req, res) => {
    // Admin access enforced by requireAdmin middleware
    // Audit logging
    console.log(`✅ ADMIN ACTION: User ${req.user!.id} changed provider ${req.params.id} status to ${req.body.status}`);
    
    try{
      const { status, reviewNotes } = req.body;
      if (!['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      await storage.updateServiceProviderStatus(req.params.id, status, reviewNotes);
      res.json({ message: "Status updated successfully" });
    } catch (error) {
      console.error("Failed to update service provider status:", error);
      res.status(500).json({ message: "Failed to update service provider status" });
    }
  });

  // ===== OFFER SYSTEM ENDPOINTS =====

  // Submit a property offer
  app.post("/api/offers", requireAuth, csrfProtection, async (req, res) => {
    try {
      // Validate the offer data (frontend fields only)
      const validatedData = frontendOfferSchema.parse(req.body);
      
      // Get property details and seller information
      const property = await storage.getProperty(validatedData.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Get seller information
      const seller = await storage.getUser(property.userId);
      if (!seller) {
        return res.status(404).json({ message: "Property owner not found" });
      }

      // Create comprehensive offer data with property security info
      const offerData = {
        ...validatedData,
        buyerId: req.user!.id, // Get from authenticated session
        sellerId: property.userId, // Connect to seller profile
        
        // Copy property details for legal security (prevents tampering)
        propertyAddress: property.address,
        propertyLotNumber: property.lotNumber,
        propertyCertificateOfTitle: property.certificateOfTitle,
        propertyZoning: property.zoning,
        propertyLandArea: property.landArea,
        propertyFloorArea: property.floorArea,
      };
      
      // Store the offer in the database
      const offer = await storage.createOffer(offerData);

      // Generate PDF using PDFKit
      const { generateExpressInterestPDF } = await import('./services/offer-pdf');
      const pdfBuffer = await generateExpressInterestPDF(offer, property);
      
      // Save PDF to file system (in production, this would be uploaded to object storage)
      const fs = await import('fs/promises');
      const path = await import('path');
      const pdfsDir = path.join(process.cwd(), 'generated_pdfs');
      await fs.mkdir(pdfsDir, { recursive: true });
      const pdfFileName = `express-interest-${offer.id}.pdf`;
      const pdfFilePath = path.join(pdfsDir, pdfFileName);
      await fs.writeFile(pdfFilePath, pdfBuffer);
      const pdfUrl = `/generated_pdfs/${pdfFileName}`;

      // Send emails to both buyer and seller with PDF attachments
      const { sendOfferEmails } = await import('./services/offer-email');
      const emailResult = await sendOfferEmails({
        offerType: 'express_interest',
        offerData: offer,
        propertyData: property,
        buyerEmail: offer.buyerEmail,
        sellerEmail: seller.email,
        pdfBuffer,
        offerId: offer.id
      });

      // Update offer status and email tracking with proper persistence
      await storage.updateOfferStatus(offer.id, 'submitted');
      await storage.updateOfferEmailTracking(offer.id, {
        pdfGenerated: true,
        emailSent: emailResult.buyerEmailSent && emailResult.sellerEmailSent,
        emailSentAt: new Date(),
        pdfUrl
      });

      // Generate draft document automatically
      const draftDocument = await storage.createDraftDocument({
        offerId: offer.id,
        documentType: validatedData.propertyId ? 'purchase_sale_agreement' : 'lease_agreement',
        documentContent: JSON.stringify({
          type: 'express_interest',
          propertyAddress: property.address,
          offerPrice: offer.offerPrice,
          buyerName: offer.buyerName,
          settlementPeriod: offer.settlementPeriod,
          conditions: {
            finance: offer.financeCondition,
            buildingInspection: offer.buildingInspectionCondition,
            lim: offer.limCondition
          },
          generatedAt: new Date().toISOString()
        }),
        pdfUrl,
        docxUrl: null,
        version: 1,
        isLatestVersion: true,
        status: 'generated'
      });

      console.log("📄 Draft document generated:", draftDocument.id);

      // FB CAPI: Track lead server-side (non-blocking)
      const buyerUser = await storage.getUser(req.user!.id).catch(() => null);
      if (buyerUser) {
        const [fn, ...ln] = (buyerUser.name || '').split(' ');
        trackLead(
          { email: buyerUser.email, firstName: fn, lastName: ln.join(' ') || undefined },
          { id: property.id, price: property.price ?? undefined, suburb: property.suburb ?? undefined },
          req,
        ).catch(() => {});
      }

      // Build user-friendly message based on email delivery status
      let userMessage = "Offer submitted successfully and PDF generated!";
      const warnings: string[] = [];
      
      if (emailResult.validationErrors && emailResult.validationErrors.length > 0) {
        // Email validation failed - critical issue
        warnings.push("⚠️ Email delivery failed due to invalid email addresses:");
        warnings.push(...emailResult.validationErrors.map(err => `  • ${err}`));
        warnings.push("Please verify the email addresses and contact the property owner directly.");
      } else if (!emailResult.buyerEmailSent || !emailResult.sellerEmailSent) {
        // Partial email delivery
        if (!emailResult.buyerEmailSent && !emailResult.sellerEmailSent) {
          warnings.push("⚠️ Email notifications could not be sent to buyer or seller.");
        } else if (!emailResult.buyerEmailSent) {
          warnings.push("⚠️ Buyer confirmation email could not be sent.");
        } else if (!emailResult.sellerEmailSent) {
          warnings.push("⚠️ Seller notification email could not be sent.");
        }
        if (emailResult.error) {
          warnings.push(`Reason: ${emailResult.error}`);
        }
        warnings.push("Your offer was saved and the PDF is available for download.");
      } else {
        // Full success
        userMessage = "Offer submitted! PDF copies sent to both buyer and seller.";
      }

      res.status(201).json({
        success: true,
        message: userMessage,
        warnings: warnings.length > 0 ? warnings : undefined,
        offer,
        draftDocument: {
          id: draftDocument.id,
          documentType: draftDocument.documentType,
          status: draftDocument.status
        },
        emailSent: emailResult.buyerEmailSent && emailResult.sellerEmailSent,
        emailDetails: {
          buyerEmailSent: emailResult.buyerEmailSent,
          sellerEmailSent: emailResult.sellerEmailSent,
          buyerEmail: offer.buyerEmail,
          sellerEmail: seller.email,
          error: emailResult.error,
          validationErrors: emailResult.validationErrors
        }
      });

    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: "Invalid offer data",
        error: error.message
      });
    }
  });

  // Get draft document content
  app.get("/api/draft-documents/:id", requireAuth, async (req, res) => {
    try {
      const draftDocument = await storage.getDraftDocument(req.params.id);
      
      if (!draftDocument) {
        return res.status(404).json({ message: "Draft document not found" });
      }

      res.json({
        success: true,
        draftDocument
      });

    } catch (error: any) {
      res.status(500).json({
        message: "Failed to retrieve draft document",
        error: error.message
      });
    }
  });

  // Get all offers for a property (for seller view)
  app.get("/api/properties/:propertyId/offers", requireAuth, requirePropertyOwnership, async (req, res) => {
    try {
      const offers = await storage.getOffersForProperty(req.params.propertyId);
      
      res.json({
        success: true,
        offers
      });

    } catch (error: any) {
      res.status(500).json({
        message: "Failed to retrieve offers",
        error: error.message
      });
    }
  });

  // Get user's offers and documents (for profile page)
  // Returns both Express Interest offers and Official ADLS offers
  app.get("/api/user/offers", requireAuth, async (req, res) => {
    try {
      // Get Express Interest offers
      const expressOffers = await storage.getUserOffers(req.user!.id);
      
      // Get Make Offer (wizard) offers - filter out cancelled/superseded
      const allMakeOffers = await storage.getPropertyOffersByBuyer(req.user!.id);
      const makeOffers = allMakeOffers.filter((offer: any) => 
        offer.status !== 'cancelled' && offer.status !== 'superseded'
      );
      
      // Transform and combine both types with metadata
      const combinedOffers = [
        ...expressOffers.map((offer: any) => ({
          ...offer,
          type: 'express_interest',
          submittedAt: offer.createdAt,
        })),
        ...makeOffers.map((offer: any) => ({
          ...offer,
          type: 'make_offer',
        }))
      ];
      
      // Deduplicate: Keep only the most recent offer per property
      const offersByProperty = new Map();
      combinedOffers.forEach((offer: any) => {
        const existing = offersByProperty.get(offer.propertyId);
        if (!existing) {
          offersByProperty.set(offer.propertyId, offer);
        } else {
          // Keep the most recent one (by submittedAt or createdAt)
          const existingDate = new Date(existing.submittedAt || existing.createdAt).getTime();
          const currentDate = new Date(offer.submittedAt || offer.createdAt).getTime();
          if (currentDate > existingDate) {
            offersByProperty.set(offer.propertyId, offer);
          }
        }
      });
      
      // Convert back to array and sort by date (most recent first)
      const deduplicatedOffers = Array.from(offersByProperty.values()).sort((a, b) => {
        const dateA = new Date(a.submittedAt || a.createdAt).getTime();
        const dateB = new Date(b.submittedAt || b.createdAt).getTime();
        return dateB - dateA;
      });
      
      res.json({
        success: true,
        offers: deduplicatedOffers,
        summary: {
          total: deduplicatedOffers.length,
          expressInterest: expressOffers.length,
          makeOffer: makeOffers.length,
          duplicatesRemoved: combinedOffers.length - deduplicatedOffers.length
        }
      });

    } catch (error: any) {
      res.status(500).json({
        message: "Failed to retrieve your offers",
        error: error.message
      });
    }
  });

  // Get user's draft documents (for profile page)
  app.get("/api/user/documents", requireAuth, async (req, res) => {
    try {
      const documents = await storage.getUserDraftDocuments(req.user!.id);
      
      res.json({
        success: true,
        documents
      });

    } catch (error: any) {
      res.status(500).json({
        message: "Failed to retrieve your documents",
        error: error.message
      });
    }
  });

  // Get offers received by seller (for seller dashboard)
  app.get("/api/seller/offers", requireAuth, async (req, res) => {
    try {
      const offers = await storage.getSellerOffers(req.user!.id);
      
      res.json({
        success: true,
        offers
      });

    } catch (error: any) {
      res.status(500).json({
        message: "Failed to retrieve received offers",
        error: error.message
      });
    }
  });

  // Property Metrics Endpoints
  // Track property view (called when property is displayed)
  app.post("/api/properties/:propertyId/view", async (req, res) => {
    try {
      await storage.incrementPropertyViews(req.params.propertyId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to track view", error: error.message });
    }
  });

  // Like property (also auto-updates star rating and creates user swipe record)
  app.post("/api/properties/:propertyId/like", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const propertyId = req.params.propertyId;
      
      // Create user swipe record for "like" action
      await storage.createUserSwipe({
        userId,
        propertyId,
        action: 'like'
      });
      
      // ✨ Increment persona swipe counter (triggers re-detection at 10 swipes)
      try {
        await incrementPersonaSwipeCount(userId);
      } catch (error) {
        console.warn('[Like] Failed to increment persona count:', error);
        // Non-critical, continue
      }
      
      const property = await storage.incrementPropertyLikes(propertyId);
      console.log(`👍 Property ${propertyId} liked by user ${userId}! New count: ${property.likes}`);
      
      // Auto-calculate and update star rating based on new like count
      await storage.calculateAndUpdateStarRating(propertyId);
      
      // Get updated property with new star rating
      const updatedProperty = await storage.getProperty(propertyId);
      
      res.json({ 
        success: true, 
        likes: property.likes,
        averageRating: updatedProperty?.averageRating,
        totalRatings: updatedProperty?.totalRatings
      });
    } catch (error: any) {
      console.error("❌ LIKE ERROR:", error);
      res.status(500).json({ message: "Failed to like property", error: error.message });
    }
  });

  // Save/Unsave property (toggle)
  app.post("/api/properties/:propertyId/save", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const propertyId = req.params.propertyId;
      
      // Check if already saved
      const isSaved = await storage.isPropertySavedByUser(userId, propertyId);
      
      if (isSaved) {
        // Unsave: Remove from user's saved list and decrement counter
        await storage.unsavePropertyForUser(userId, propertyId);
        await db.update(properties)
          .set({ 
            saves: sql`GREATEST(${properties.saves} - 1, 0)`, // Don't go below 0
            updatedAt: new Date()
          })
          .where(eq(properties.id, propertyId));
        
        console.log(`💾 Property ${propertyId} unsaved by user ${userId}`);
        res.json({ success: true, isSaved: false });
      } else {
        // Save: Add to user's saved list and increment counter
        await storage.savePropertyForUser(userId, propertyId);
        const property = await storage.incrementPropertySaves(propertyId);
        
        console.log(`💾 Property ${propertyId} saved by user ${userId}! New count: ${property.saves}`);
        res.json({ success: true, isSaved: true, saves: property.saves });
      }
    } catch (error: any) {
      console.error("❌ SAVE ERROR:", error);
      res.status(500).json({ message: "Failed to save property", error: error.message });
    }
  });

  // Get user's saved properties
  app.get("/api/users/:userId/saved-properties", requireAuth, async (req, res) => {
    try {
      // Ensure user can only access their own saved properties
      if (req.params.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const savedProperties = await storage.getUserSavedProperties(req.params.userId);
      res.json(savedProperties);
    } catch (error: any) {
      console.error("❌ GET SAVED PROPERTIES ERROR:", error);
      res.status(500).json({ message: "Failed to get saved properties", error: error.message });
    }
  });

  // Check if property is saved by user
  app.get("/api/properties/:propertyId/is-saved", requireAuth, async (req, res) => {
    try {
      const isSaved = await storage.isPropertySavedByUser(req.user!.id, req.params.propertyId);
      res.json({ isSaved });
    } catch (error: any) {
      console.error("❌ CHECK SAVED ERROR:", error);
      res.status(500).json({ message: "Failed to check save status", error: error.message });
    }
  });

  // 🌟 AUTOMATIC STAR RATINGS - No manual rating endpoints needed!
  // Stars are auto-calculated from likes when users like properties
  // See /api/properties/:propertyId/like endpoint above

  // ===== USER STORAGE MANAGEMENT API =====

  // Get user storage statistics
  app.get("/api/users/:userId/storage", requireAuth, async (req, res) => {
    try {
      // Ensure user can only access their own storage stats
      if (req.params.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied - can only access your own storage" });
      }
      
      const stats = await storage.getUserStorageStats(req.params.userId);
      res.json(stats);
    } catch (error: any) {
      console.error("❌ STORAGE STATS ERROR:", error);
      res.status(500).json({ message: "Failed to get storage stats", error: error.message });
    }
  });

  // Check if user can upload a file
  app.post("/api/users/:userId/storage/check", requireAuth, async (req, res) => {
    try {
      // Ensure user can only check their own storage
      if (req.params.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied - can only check your own storage" });
      }
      
      const { fileSize, fileType } = req.body;
      
      if (!fileSize || !fileType) {
        return res.status(400).json({ message: "fileSize and fileType are required" });
      }

      if (!['video', 'audio'].includes(fileType)) {
        return res.status(400).json({ message: "fileType must be 'video' or 'audio'" });
      }

      const result = await storage.checkStorageLimit(req.params.userId, fileSize, fileType);
      res.json(result);
    } catch (error: any) {
      console.error("❌ STORAGE CHECK ERROR:", error);
      res.status(500).json({ message: "Failed to check storage limit", error: error.message });
    }
  });

  // Purchase storage upgrade
  app.post("/api/users/:userId/storage/upgrade", requireAuth, async (req, res) => {
    try {
      // Ensure user can only upgrade their own storage
      if (req.params.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied - can only upgrade your own storage" });
      }
      
      const { upgradeType } = req.body;
      
      if (!upgradeType || !['video', 'audio'].includes(upgradeType)) {
        return res.status(400).json({ message: "upgradeType must be 'video' or 'audio'" });
      }

      await storage.purchaseStorageUpgrade(req.params.userId, upgradeType);
      
      // Return updated storage stats
      const stats = await storage.getUserStorageStats(req.params.userId);
      res.json({ 
        success: true, 
        message: `Successfully purchased ${upgradeType} storage upgrade`,
        stats 
      });
    } catch (error: any) {
      console.error("❌ STORAGE UPGRADE ERROR:", error);
      res.status(500).json({ message: "Failed to purchase storage upgrade", error: error.message });
    }
  });

  // Update user storage after successful upload
  app.post("/api/users/:userId/storage/update", requireAuth, async (req, res) => {
    try {
      // Ensure user can only update their own storage
      if (req.params.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied - can only update your own storage" });
      }
      
      const { videoSize, audioSize } = req.body;
      
      await storage.updateUserStorage(req.params.userId, videoSize, audioSize);
      
      // Return updated storage stats
      const stats = await storage.getUserStorageStats(req.params.userId);
      res.json({ success: true, stats });
    } catch (error: any) {
      console.error("❌ STORAGE UPDATE ERROR:", error);
      res.status(500).json({ message: "Failed to update storage usage", error: error.message });
    }
  });

  // ===== ADMIN ANALYTICS API ENDPOINTS =====

  // Admin validation schemas
  const adminDateRangeSchema = z.object({
    fromDate: z.string().optional(),
    toDate: z.string().optional()
  });

  const adminPaginationSchema = z.object({
    page: z.string().optional().default("1").transform(val => parseInt(val, 10)),
    limit: z.string().optional().default("50").transform(val => parseInt(val, 10))
  });

  const adminTransactionFiltersSchema = z.object({
    type: z.string().optional(),
    category: z.string().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    userId: z.string().optional(),
    providerId: z.string().optional()
  });

  const adminOperatingCostSchema = z.object({
    category: z.string().min(1, "Category is required"),
    description: z.string().min(1, "Description is required"),
    costCents: z.number().int().min(0, "Cost must be non-negative"),
    periodStart: z.string().min(1, "Period start is required"),
    periodEnd: z.string().min(1, "Period end is required"),
    notes: z.string().optional()
  });

  // Admin Overview Dashboard
  app.get("/api/admin/overview", requireAdmin, async (req, res) => {
    try {
      const validatedQuery = adminDateRangeSchema.parse(req.query);
      const metrics = await storage.getOverviewMetrics(
        validatedQuery.fromDate,
        validatedQuery.toDate
      );
      res.json({ success: true, data: metrics });
    } catch (error) {
      console.error("Admin overview error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          message: "Invalid query parameters",
          errors: error.errors 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to fetch overview metrics"
        });
      }
    }
  });

  // Admin Profit & Loss Analytics
  app.get("/api/admin/pnl", requireAdmin, async (req, res) => {
    try {
      const validatedQuery = adminDateRangeSchema.parse(req.query);
      const pnlData = await storage.getProfitLossData(
        validatedQuery.fromDate,
        validatedQuery.toDate
      );
      res.json({ success: true, data: pnlData });
    } catch (error) {
      console.error("Admin P&L error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          message: "Invalid query parameters",
          errors: error.errors 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to fetch P&L data"
        });
      }
    }
  });

  // Admin Property Funnel Analytics
  app.get("/api/admin/properties/funnel", requireAdmin, async (req, res) => {
    try {
      const validatedQuery = adminDateRangeSchema.parse(req.query);
      const funnelData = await storage.getPropertyFunnelData(
        validatedQuery.fromDate,
        validatedQuery.toDate
      );
      res.json({ success: true, data: funnelData });
    } catch (error) {
      console.error("Admin property funnel error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          message: "Invalid query parameters",
          errors: error.errors 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to fetch property funnel data"
        });
      }
    }
  });

  // Admin Service Provider Performance
  app.get("/api/admin/providers/performance", requireAdmin, async (req, res) => {
    try {
      const validatedQuery = adminDateRangeSchema.parse(req.query);
      const performanceData = await storage.getServiceProviderPerformance(
        validatedQuery.fromDate,
        validatedQuery.toDate
      );
      res.json({ success: true, data: performanceData });
    } catch (error) {
      console.error("Admin provider performance error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          message: "Invalid query parameters",
          errors: error.errors 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to fetch provider performance data"
        });
      }
    }
  });

  // Admin User Engagement Analytics
  app.get("/api/admin/users/engagement", requireAdmin, async (req, res) => {
    try {
      const validatedQuery = adminDateRangeSchema.parse(req.query);
      const engagementData = await storage.getUserEngagementData(
        validatedQuery.fromDate,
        validatedQuery.toDate
      );
      res.json({ success: true, data: engagementData });
    } catch (error) {
      console.error("Admin user engagement error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          message: "Invalid query parameters",
          errors: error.errors 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to fetch user engagement data"
        });
      }
    }
  });

  // Admin Transaction History with Filtering and Pagination
  app.get("/api/admin/transactions", requireAdmin, async (req, res) => {
    try {
      const paginationData = adminPaginationSchema.parse(req.query);
      const filterData = adminTransactionFiltersSchema.parse(req.query);

      const transactionData = await storage.getTransactionHistory(
        paginationData.page,
        paginationData.limit,
        {
          type: filterData.type,
          category: filterData.category,
          fromDate: filterData.fromDate,
          toDate: filterData.toDate,
          userId: filterData.userId,
          providerId: filterData.providerId,
        }
      );
      res.json({ success: true, data: transactionData });
    } catch (error) {
      console.error("Admin transaction history error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          message: "Invalid query parameters",
          errors: error.errors 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to fetch transaction history"
        });
      }
    }
  });

  // Admin Create Operating Cost
  app.post("/api/admin/costs", csrfProtection, requireAdmin, async (req, res) => {
    try {
      const validatedData = adminOperatingCostSchema.parse(req.body);
      
      const operatingCost = await storage.createOperatingCost(
        validatedData,
        req.user!.id // Admin user ID
      );

      res.status(201).json({ success: true, data: operatingCost });
    } catch (error) {
      console.error("Admin create operating cost error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          message: "Invalid request body",
          errors: error.errors 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to create operating cost"
        });
      }
    }
  });

  // Admin Get Operating Costs
  app.get("/api/admin/costs", requireAdmin, async (req, res) => {
    try {
      const validatedQuery = adminDateRangeSchema.parse(req.query);
      const costs = await storage.getOperatingCosts(
        validatedQuery.fromDate,
        validatedQuery.toDate
      );
      res.json({ success: true, data: costs });
    } catch (error) {
      console.error("Admin operating costs error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          message: "Invalid query parameters",
          errors: error.errors 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to fetch operating costs"
        });
      }
    }
  });

  // Admin Daily Metrics
  app.get("/api/admin/metrics", requireAdmin, async (req, res) => {
    try {
      const validatedQuery = adminDateRangeSchema.parse(req.query);
      const metrics = await storage.getDailyMetrics(
        validatedQuery.fromDate,
        validatedQuery.toDate
      );
      res.json({ success: true, data: metrics });
    } catch (error) {
      console.error("Admin daily metrics error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          message: "Invalid query parameters",
          errors: error.errors 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to fetch daily metrics"
        });
      }
    }
  });

  // Admin Create/Update Daily Metrics (for system use)
  app.post("/api/admin/metrics/:date", csrfProtection, requireAdmin, async (req, res) => {
    try {
      const { date } = req.params;
      
      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Expected YYYY-MM-DD"
        });
      }

      // Basic validation that metrics object exists
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({
          success: false,
          message: "Metrics data is required"
        });
      }
      
      const dailyMetrics = await storage.createOrUpdateDailyMetrics(date, req.body);
      res.json({ success: true, data: dailyMetrics });
    } catch (error) {
      console.error("Admin create/update metrics error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to create/update daily metrics"
      });
    }
  });

  // ============================================================================
  // TRANSACTION & ORDER HISTORY ROUTES
  // ============================================================================

  // Get user transactions with pagination
  app.get("/api/transactions/:userId", requireAuth, async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      
      // Security: Ensure user can only access their own transactions
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Unauthorized access to transactions" });
      }

      // Parse pagination params
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const offset = (page - 1) * pageSize;

      // Fetch transactions with pagination
      const userTransactions = await db.select()
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .orderBy(sql`${transactions.createdAt} DESC`)
        .limit(pageSize)
        .offset(offset);

      // Get total count for pagination
      const totalCount = await db.select({ count: sql<number>`count(*)` })
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .then(rows => rows[0]?.count || 0);

      res.json({
        data: userTransactions,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      });
    } catch (error: any) {
      console.error("Fetch transactions error:", error);
      res.status(500).json({ message: "Error fetching transactions: " + error.message });
    }
  });

  // Get user purchase orders with pagination
  app.get("/api/purchase-orders/:userId", requireAuth, async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      
      // Security: Ensure user can only access their own orders
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Unauthorized access to orders" });
      }

      // Parse pagination params
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const offset = (page - 1) * pageSize;

      // Fetch purchase orders with pagination
      const userOrders = await db.select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.userId, userId))
        .orderBy(sql`${purchaseOrders.createdAt} DESC`)
        .limit(pageSize)
        .offset(offset);

      // Get total count for pagination
      const totalCount = await db.select({ count: sql<number>`count(*)` })
        .from(purchaseOrders)
        .where(eq(purchaseOrders.userId, userId))
        .then(rows => rows[0]?.count || 0);

      res.json({
        data: userOrders,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      });
    } catch (error: any) {
      console.error("Fetch purchase orders error:", error);
      res.status(500).json({ message: "Error fetching orders: " + error.message });
    }
  });

  // Share a purchased report with someone (POST /api/purchase-orders/:orderId/share)
  app.post("/api/purchase-orders/:orderId/share", requireAuth, async (req: any, res: any) => {
    try {
      const { email, name } = req.body;
      
      if (!email || !email.includes('@')) {
        return res.status(400).json({ message: "Valid email address is required" });
      }

      // Get the purchase order
      const [order] = await db.select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, req.params.orderId))
        .limit(1);

      if (!order) {
        return res.status(404).json({ message: "Purchase order not found" });
      }

      // Verify the user owns this order
      if (order.userId !== req.user.id) {
        return res.status(403).json({ message: "You can only share your own reports" });
      }

      // Only allow sharing completed reports
      if (order.status !== 'completed') {
        return res.status(400).json({ 
          message: "This report is not ready yet. You can only share completed reports." 
        });
      }

      // Check if already shared with this email
      const existingShares = (order.sharedWith as Array<{email: string, sharedAt: string, sharedBy: string}>) || [];
      const alreadyShared = existingShares.find(share => share.email.toLowerCase() === email.toLowerCase());

      if (alreadyShared) {
        return res.status(400).json({ 
          message: "This report has already been shared with this email address.",
          sharedAt: alreadyShared.sharedAt
        });
      }

      // Add the new share
      const newShare = {
        email: email.toLowerCase(),
        sharedAt: new Date().toISOString(),
        sharedBy: req.user.email
      };

      const updatedShares = [...existingShares, newShare];

      // Update the purchase order
      await db.update(purchaseOrders)
        .set({ sharedWith: updatedShares })
        .where(eq(purchaseOrders.id, req.params.orderId));

      // Send email notification
      const { sendReportShareEmail } = await import('./services/report-sharing-email');
      
      const emailResult = await sendReportShareEmail({
        recipientEmail: email,
        recipientName: name,
        sharedByName: req.user.name || req.user.email,
        sharedByEmail: req.user.email,
        reportType: order.reportType,
        propertyAddress: order.propertyAddress || 'Property address not available',
        reportUrl: undefined, // TODO: Add report URL when available
        orderId: order.id,
      });

      console.log(`✅ Report ${order.id} shared with ${redactEmail(email)}`);

      res.json({ 
        success: true,
        message: `Report successfully shared with ${email}`,
        emailSent: emailResult.success,
        sharedWith: updatedShares
      });
    } catch (error: any) {
      console.error('Error sharing report:', error);
      res.status(500).json({ 
        message: "Error sharing report",
        error: error.message 
      });
    }
  });

  // ============================================================================
  // STRIPE PAYMENT ROUTES
  // ============================================================================

  // Create Stripe checkout session for property listing payment
  app.post("/api/stripe/create-checkout-session", requireAuth, async (req: any, res: any) => {
    if (!stripe) {
      return res.status(500).json({ 
        message: "Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables." 
      });
    }

    try {
      const { planId, planType = 'listing', propertyData, metadata } = req.body;
      
      console.log('📝 Creating checkout session:', { planId, planType, hasPropertyData: !!propertyData, hasMetadata: !!metadata });

      // CRITICAL: Validate property data for listing payments
      // Support two flows:
      // 1. Old flow: propertyData provided (create property after payment)
      // 2. New flow: metadata.propertyId provided (activate existing property after payment)
      if (planType === 'listing' && !propertyData && !metadata?.propertyId) {
        console.error('❌ REJECTED: Checkout attempt without property data or propertyId');
        return res.status(400).json({ 
          message: "Property data or propertyId is required for listing payments." 
        });
      }

      if (planType === 'listing' && propertyData && (!propertyData.title || !propertyData.address)) {
        console.error('❌ REJECTED: Incomplete property data - missing title or address');
        return res.status(400).json({ 
          message: "Property title and address are required. Please complete the form." 
        });
      }

      // SECURITY: Verify property ownership for activation flow
      if (planType === 'listing' && metadata?.propertyId) {
        const [existingProperty] = await db.select()
          .from(properties)
          .where(eq(properties.id, metadata.propertyId));

        if (!existingProperty) {
          console.error('❌ REJECTED: Property not found:', metadata.propertyId);
          return res.status(404).json({ 
            message: "Property not found. Please try again." 
          });
        }

        if (existingProperty.userId !== req.user.id) {
          console.error('❌ REJECTED: Unauthorized property access. User:', req.user.id, 'Property owner:', existingProperty.userId);
          return res.status(403).json({ 
            message: "You do not have permission to activate this property." 
          });
        }

        console.log('✅ Property ownership verified:', metadata.propertyId);
      }

      let planInfo: { price: number; name: string; duration?: number; description?: string };

      // Handle different payment types
      if (planType === 'report' || planType === 'service') {
        // H-002: Price is always sourced from the server-side reportTypes config — never from
        // client-supplied metadata — so clients cannot manipulate the amount charged.
        const reportConfig = planId ? reportTypes[planId as keyof typeof reportTypes] : undefined;
        if (!reportConfig) {
          console.error('❌ REJECTED: Unknown report planId:', planId);
          return res.status(400).json({ 
            message: "Invalid report or service configuration. Please try again." 
          });
        }

        planInfo = {
          price: reportConfig.ourPriceCents,
          name: reportConfig.name,
          description: metadata?.description || reportConfig.name,
        };
        
        console.log('💰 Report/Service payment:', { name: planInfo.name, priceCents: planInfo.price });
      } else {
        // For listing payments, fetch from database
        const [plan] = await db.select()
          .from(pricingPlans)
          .where(eq(pricingPlans.id, planId));

        if (!plan) {
          return res.status(400).json({ message: "Invalid plan selected" });
        }

        planInfo = {
          price: plan.price,
          name: plan.name,
          duration: plan.duration
        };
      }

      // Generate appropriate description
      let productDescription: string;
      if (planType === 'listing') {
        productDescription = `List your property for ${planInfo.duration} days on housematch.nz`;
      } else if (planType === 'report' || planType === 'service') {
        productDescription = planInfo.description || 'Property report or service';
      } else {
        productDescription = 'Premium upgrade';
      }

      // Create Stripe checkout session FIRST
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'nzd',
              product_data: {
                name: planInfo.name,
                description: productDescription,
              },
              unit_amount: planInfo.price,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        // H-018: Use getPublicBaseUrl so production deployments never fall back to localhost
        success_url: `${getPublicBaseUrl(req)}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${getPublicBaseUrl(req)}/reports?payment=cancelled`,
        metadata: {
          userId: req.user.id,
          planId,
          planType,
          duration: planInfo.duration ? String(planInfo.duration) : '0',
          ...(metadata?.propertyId && { propertyId: metadata.propertyId }),
        },
      });

      console.log('✅ Stripe session created:', session.id);

      // NOW create payment session record with actual Stripe session ID
      // Store metadata in propertyData for all payment types (not just listings)
      const dataToStore = planType === 'listing' ? propertyData : metadata;
      
      const [paymentSession] = await db.insert(propertyPaymentSessions).values({
        userId: req.user.id,
        stripeSessionId: session.id, // ✅ Use actual Stripe session ID
        planId,
        planType,
        amountCents: planInfo.price,
        currency: 'nzd',
        propertyData: dataToStore, // Store metadata for reports, propertyData for listings
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      }).returning();
      
      console.log('💾 Payment session created with propertyData:', JSON.stringify(paymentSession.propertyData, null, 2));

      // Update property with pending payment metadata (activation flow only)
      if (planType === 'listing' && metadata?.propertyId) {
        await db.update(properties)
          .set({
            paymentStatus: 'pending',
            stripeSessionId: session.id,
            selectedPlan: planId,
          })
          .where(eq(properties.id, metadata.propertyId));
        
        console.log('✅ Property updated with pending payment metadata:', metadata.propertyId);
      }

      res.json({ 
        sessionId: session.id,
        url: session.url,
        paymentSessionId: paymentSession.id
      });
    } catch (error: any) {
      console.error("Stripe checkout session creation error:", error);
      res.status(500).json({ message: "Error creating payment session: " + error.message });
    }
  });

  // Handle successful payment and activate property listing
  // H-013: requireAuth ensures only logged-in users can complete the payment flow
  app.get("/api/stripe/payment-success", requireAuth, async (req: any, res: any) => {
    console.log('🎯 PAYMENT SUCCESS ENDPOINT CALLED');
    console.log('Query params:', req.query);
    
    if (!stripe) {
      console.error('❌ Stripe not configured');
      return res.status(500).json({ message: "Stripe is not configured" });
    }

    try {
      const { session_id } = req.query;
      
      if (!session_id) {
        console.error('❌ Missing session_id');
        return res.status(400).json({ message: "Missing session_id" });
      }

      console.log('🔍 Retrieving Stripe session:', session_id);
      // Retrieve session from Stripe
      const session = await stripe.checkout.sessions.retrieve(session_id as string);
      console.log('✅ Stripe session retrieved:', {
        id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        metadata: session.metadata
      });

      if (session.payment_status !== 'paid') {
        console.error('❌ Payment not completed. Status:', session.payment_status);
        return res.status(400).json({ message: "Payment not completed" });
      }

      console.log('🔍 Looking up payment session in database...');
      // Get payment session from database
      const [paymentSession] = await db.select()
        .from(propertyPaymentSessions)
        .where(eq(propertyPaymentSessions.stripeSessionId, session_id as string));

      if (!paymentSession) {
        console.error('❌ Payment session not found in database');
        return res.status(404).json({ message: "Payment session not found" });
      }
      
      console.log('✅ Payment session found:', {
        id: paymentSession.id,
        userId: paymentSession.userId,
        planType: paymentSession.planType,
        planId: paymentSession.planId,
        status: paymentSession.status
      });

      // H-014: Wrap the atomic claim AND all subsequent DB writes in a single transaction.
      // If any write fails after the claim, the entire block rolls back so the session is NOT
      // left as 'completed' with an unactivated property. Both the webhook and a browser retry
      // can then still complete the work. Response data is collected inside and sent after commit.
      let paymentResponse: any = null;
      let emailPayload: any = null;
      let alreadyProcessed = false;

      await db.transaction(async (tx) => {
        // Atomic claim: set status='completed' only if currently pending (serialises vs webhook)
        const [claimedSession] = await tx.update(propertyPaymentSessions)
          .set({ status: 'completed', completedAt: new Date() })
          .where(and(
            eq(propertyPaymentSessions.id, paymentSession.id),
            sql`${propertyPaymentSessions.status} != 'completed'`
          ))
          .returning();

        if (!claimedSession) {
          alreadyProcessed = true;
          return;
        }

        if (paymentSession.planType === 'listing') {
          const duration = parseInt(session.metadata?.duration || '30');
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + duration);
          let propertyId: string;

          if (session.metadata?.propertyId) {
            propertyId = session.metadata.propertyId;
            console.log('🔄 Activating existing property:', propertyId);
            const [updatedProperty] = await tx.update(properties)
              .set({
                isActive: true,
                paymentStatus: 'paid',
                activatedAt: new Date(),
                selectedPlan: paymentSession.planId,
                stripeSessionId: session_id as string,
                expiresAt,
              })
              .where(eq(properties.id, propertyId))
              .returning();
            if (!updatedProperty) throw new Error(`Property ${propertyId} not found`);
            console.log('✅ Property activated:', propertyId);
          } else {
            const propertyData = paymentSession.propertyData as any;
            console.log('🔍 Creating property from stored data');
            const [newProperty] = await tx.insert(properties).values({
              ...propertyData,
              userId: paymentSession.userId,
              selectedPlan: paymentSession.planId,
              paymentStatus: 'paid',
              stripeSessionId: session_id as string,
              isActive: true,
              activatedAt: new Date(),
              expiresAt,
            }).returning();
            propertyId = newProperty.id;
            console.log('✅ Property created:', propertyId);
          }

          await tx.update(propertyPaymentSessions)
            .set({ propertyId, stripePaymentIntentId: session.payment_intent as string })
            .where(eq(propertyPaymentSessions.id, paymentSession.id));

          await tx.insert(transactions).values({
            userId: paymentSession.userId,
            propertyId,
            amountCents: paymentSession.amountCents,
            netCents: paymentSession.amountCents,
            type: 'revenue',
            source: 'stripe',
            category: 'property_listing',
            description: `Property listing payment - ${paymentSession.planId}`,
            stripeTransactionId: session.payment_intent as string,
          });

          paymentResponse = { success: true, propertyId, message: "Payment successful! Your property is now live." };

        } else if (paymentSession.planType === 'storage') {
          const userId = paymentSession.userId;
          if (paymentSession.planId === 'extra-video-storage') {
            await tx.update(users)
              .set({ videoStorageLimit: sql`${users.videoStorageLimit} + 157286400`, hasVideoStorageUpgrade: true })
              .where(eq(users.id, userId));
          } else if (paymentSession.planId === 'extra-audio-storage') {
            await tx.update(users)
              .set({ audioStorageLimit: sql`${users.audioStorageLimit} + 157286400`, hasAudioStorageUpgrade: true })
              .where(eq(users.id, userId));
          }
          await tx.update(propertyPaymentSessions)
            .set({ stripePaymentIntentId: session.payment_intent as string })
            .where(eq(propertyPaymentSessions.id, paymentSession.id));

          paymentResponse = { success: true, message: "Storage upgrade successful!" };

        } else if (paymentSession.planType === 'report' || paymentSession.planType === 'service') {
          console.log('📄 ===== PROCESSING REPORT PURCHASE =====');
          const metadata = (paymentSession.propertyData as any) || {};
          const propertyId = metadata.propertyId;
          const property = propertyId
            ? await tx.select().from(properties).where(eq(properties.id, propertyId)).limit(1).then(r => r[0])
            : null;
          const reportConfig = reportTypes[paymentSession.planId];
          const provider = reportConfig?.provider?.id || 'unknown';
          const isDevEnvironment = process.env.NODE_ENV === 'development';
          const isTitleSearch = paymentSession.planId === 'title-search';

          let deliveryScheduledFor = null;
          if (isTitleSearch) {
            if (isDevEnvironment) {
              deliveryScheduledFor = new Date();
            } else {
              const scheduledDate = new Date();
              let businessDaysAdded = 0;
              while (businessDaysAdded < 2) {
                scheduledDate.setDate(scheduledDate.getDate() + 1);
                const dayOfWeek = scheduledDate.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) businessDaysAdded++;
              }
              deliveryScheduledFor = scheduledDate;
              console.log('📅 Title report scheduled for', scheduledDate.toLocaleString('en-NZ'));
            }
          }

          const [purchaseOrder] = await tx.insert(purchaseOrders).values({
            userId: paymentSession.userId,
            propertyId: propertyId || null,
            reportType: paymentSession.planId,
            provider,
            status: 'processing',
            price: (paymentSession.amountCents / 100).toString(),
            propertyAddress: property?.address || metadata.propertyAddress || null,
            propertyTitle: property?.title || metadata.propertyTitle || null,
            stripeSessionId: session.id,
            paidAt: new Date(),
            deliveryScheduledFor,
            metadata,
            stripePaymentIntentId: session.payment_intent as string,
          } as any).returning();

          console.log('✅ Purchase order created:', purchaseOrder.id);

          await tx.update(propertyPaymentSessions)
            .set({ stripePaymentIntentId: session.payment_intent as string })
            .where(eq(propertyPaymentSessions.id, paymentSession.id));

          await tx.insert(transactions).values({
            userId: paymentSession.userId,
            amountCents: paymentSession.amountCents,
            netCents: paymentSession.amountCents,
            type: 'revenue',
            source: 'stripe',
            category: 'report_purchase',
            description: `Report purchase - ${paymentSession.planId}`,
            stripeTransactionId: session.payment_intent as string,
          });

          // Queue email payload for after-transaction sending (non-title-search only)
          if (!isTitleSearch) {
            emailPayload = {
              purchaseOrderId: purchaseOrder.id,
              planId: paymentSession.planId,
              userId: paymentSession.userId,
              propertyAddress: purchaseOrder.propertyAddress,
              propertyTitle: purchaseOrder.propertyTitle,
              paidAt: purchaseOrder.paidAt || new Date(),
              stripePaymentIntentId: session.payment_intent as string,
              metadata,
            };
          } else {
            console.log('📄 Title Search report scheduled for automated delivery');
          }

          paymentResponse = {
            success: true,
            orderId: purchaseOrder.id,
            message: "Payment successful! Your report order has been received and is being processed. You'll receive an email when it's ready.",
          };

        } else {
          throw new Error(`Unsupported payment type: ${paymentSession.planType}`);
        }
      });

      if (alreadyProcessed) {
        console.log('⚠️ Payment session already completed — webhook beat us or duplicate call');
        return res.json({ message: "Payment already processed", propertyId: paymentSession.propertyId });
      }

      // Send admin email AFTER the transaction commits so a failed email never rolls back a payment
      if (emailPayload) {
        try {
          const buyer = await db.select().from(users)
            .where(eq(users.id, emailPayload.userId))
            .limit(1)
            .then(r => r[0]);
          if (buyer) {
            const reportConfig = reportTypes[emailPayload.planId];
            if (reportConfig) {
              await sendManualReportOrderNotification({
                orderId: emailPayload.purchaseOrderId,
                reportType: emailPayload.planId,
                reportName: reportConfig.name,
                propertyAddress: emailPayload.propertyAddress,
                propertyTitle: emailPayload.propertyTitle,
                provider: reportConfig.provider.name,
                price: (reportConfig.ourPriceCents / 100).toFixed(2),
                estimatedDays: reportConfig.estimatedDays,
                buyerName: buyer.name || 'Customer',
                buyerEmail: buyer.email,
                stripePaymentIntentId: emailPayload.stripePaymentIntentId,
                paidAt: emailPayload.paidAt,
                metadata: emailPayload.metadata,
              });
              console.log('✅ Manual fulfillment email notification sent to admin');
            }
          }
        } catch (emailError: any) {
          console.error('❌ Failed to send manual fulfillment email:', emailError.message);
          // Non-critical — payment is complete, email failure does not roll back
        }
      }

      res.json(paymentResponse);
    } catch (error: any) {
      console.error("Payment success handler error:", error);
      res.status(500).json({ message: "Error processing payment: " + error.message });
    }
  });

  // ============================================================================
  // OFFER WIZARD ROUTES - HouseMatch Offer Wizard System
  // ============================================================================

  // Get standard chattels (reference data - no auth required)
  app.get("/api/offer-wizard/standard-chattels", async (req, res) => {
    try {
      const chattels = await storage.getAllStandardChattels();
      res.json(chattels);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching standard chattels: " + error.message });
    }
  });

  // Create a new property offer (requires auth) - PHASE 1: Complete payload
  app.post("/api/offer-wizard/offers", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Validate against Phase 1 schema (minimum required fields)
      const { propertyId, offerPrice, depositAmount, depositPaymentDate, settlementDate, propertyType } = req.body;
      
      if (!propertyId || !offerPrice || !depositAmount || !depositPaymentDate || !settlementDate) {
        return res.status(400).json({ message: "Missing required offer fields" });
      }

      // ✅ SAFEGUARD: Check if property exists before creating offer
      const propertyExists = await storage.getProperty(propertyId);
      if (!propertyExists) {
        console.warn(`⚠️ Offer rejected: Property ${propertyId} not found in database`);
        return res.status(404).json({ 
          message: "Property not found. It may have been removed or is no longer available.",
          propertyId: propertyId 
        });
      }

      // Check if user already has an active offer for this property
      const existingOffers = await storage.getPropertyOffersByBuyer(userId);
      const activeOfferForProperty = existingOffers.find((offer: any) => 
        offer.propertyId === propertyId && 
        offer.status !== 'cancelled' && 
        offer.status !== 'superseded' &&
        offer.status !== 'rejected' &&
        offer.status !== 'withdrawn'
      );

      if (activeOfferForProperty) {
        return res.status(400).json({ 
          message: "You already have an active offer for this property. Please edit your existing offer or withdraw it before creating a new one.",
          existingOfferId: activeOfferForProperty.id,
          existingOfferStatus: activeOfferForProperty.status
        });
      }

      // PHASE 1: Backend balance calculation (ADLS integrity - don't trust frontend)
      const offerPriceNum = parseFloat(offerPrice);
      const depositAmountNum = parseFloat(depositAmount);
      const calculatedBalance = offerPriceNum - depositAmountNum;

      // PHASE 1: Convert date strings to Date objects
      const dateFields = {
        depositPaymentDate: new Date(depositPaymentDate),
        settlementDate: new Date(settlementDate),
        balancePayableDate: req.body.balancePayableDate ? new Date(req.body.balancePayableDate) : new Date(settlementDate),
        financeDeadline: req.body.financeDeadline ? new Date(req.body.financeDeadline) : null,
        limDeadline: req.body.limDeadline ? new Date(req.body.limDeadline) : null,
        buildingInspectionDeadline: req.body.buildingInspectionDeadline ? new Date(req.body.buildingInspectionDeadline) : null,
        methTestDeadline: req.body.methTestDeadline ? new Date(req.body.methTestDeadline) : null,
      };

      // PHASE 1: Create offer with complete Phase 1 payload
      const offer = await storage.createPropertyOffer({
        // Core references
        propertyId,
        buyerId: userId,

        // Phase 1: Buyer contact info
        buyerFullName: req.body.buyerFullName || null,
        buyerPhone: req.body.buyerPhone || null,
        buyerEmail: req.body.buyerEmail || null,
        buyerAddress: req.body.buyerAddress || null,
        buyingEntityType: req.body.buyingEntityType || null,
        trustOrCompanyName: req.body.trustOrCompanyName || null,

        // Phase 1: Property confirmation
        propertyAddress: req.body.propertyAddress || null,
        propertyTitleReference: req.body.propertyTitleReference || null,
        propertyLegalDescription: req.body.propertyLegalDescription || null,
        propertyType: propertyType || null,

        // Offer amounts (converted to decimals)
        offerPrice: String(parseFloat(offerPrice)),
        depositAmount: String(parseFloat(depositAmount)),
        balancePayable: String(calculatedBalance), // Backend-calculated for integrity

        // Dates
        ...dateFields,

        // Phase 1: Required condition toggles
        financeRequired: req.body.financeRequired || false,
        financeAmount: req.body.financeAmount ? String(parseFloat(req.body.financeAmount)) : null,
        limRequired: req.body.limRequired || false,
        buildingInspectionRequired: req.body.buildingInspectionRequired || false,
        methTestRequired: req.body.methTestRequired || false,

        // Status
        status: 'draft',
      } as any);

      // Log activity
      await storage.createOfferActivity({
        offerId: offer.id,
        activityType: 'offer_created',
        description: 'Offer wizard started (Phase 1)',
        createdBy: userId,
      });

      res.json(offer);
    } catch (error: any) {
      console.error("Error creating property offer:", error);
      res.status(500).json({ message: "Error creating offer: " + error.message });
    }
  });

  // Get user's offers (buyer)
  app.get("/api/offer-wizard/offers/my-offers", requireAuth, async (req: any, res) => {
    try {
      const allOffers = await storage.getPropertyOffersByBuyer(req.user.id);
      // Filter out cancelled and superseded offers
      const activeOffers = allOffers.filter((offer: any) => 
        offer.status !== 'cancelled' && offer.status !== 'superseded'
      );
      res.json(activeOffers);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching offers: " + error.message });
    }
  });

  // Get draft offer for a specific property (for auto-loading when reopening wizard)
  app.get("/api/offer-wizard/properties/:propertyId/draft-offer", requireAuth, async (req: any, res) => {
    try {
      const draftOffer = await storage.getDraftOfferForProperty(req.params.propertyId, req.user.id);
      res.json(draftOffer || null);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching draft offer: " + error.message });
    }
  });

  // Get a specific offer
  app.get("/api/offer-wizard/offers/:offerId", requireAuth, async (req: any, res) => {
    try {
      const offer = await storage.getPropertyOffer(req.params.offerId);
      
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }

      // Check authorization (buyer or property owner)
      if (offer.buyerId !== req.user.id) {
        const property = await storage.getProperty(offer.propertyId);
        if (!property || property.userId !== req.user.id) {
          return res.status(403).json({ message: "Not authorized to view this offer" });
        }
      }

      res.json(offer);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching offer: " + error.message });
    }
  });

  // Update offer wizard step
  app.patch("/api/offer-wizard/offers/:offerId/step", requireAuth, async (req: any, res) => {
    try {
      const offer = await storage.getPropertyOffer(req.params.offerId);
      
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }

      if (offer.buyerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to modify this offer" });
      }

      await storage.updatePropertyOfferWizardStep(req.params.offerId, req.body.step);

      // Log activity
      await storage.createOfferActivity({
        offerId: req.params.offerId,
        activityType: 'wizard_step_updated',
        description: `Wizard progressed to step ${req.body.step}`,
        createdBy: req.user.id,
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Error updating wizard step: " + error.message });
    }
  });

  // Update offer details - PHASE 1: Complete payload with field restrictions
  app.patch("/api/offer-wizard/offers/:offerId", requireAuth, async (req: any, res) => {
    try {
      const offer = await storage.getPropertyOffer(req.params.offerId);
      
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }

      if (offer.buyerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to modify this offer" });
      }

      // PHASE 1: Restrict to allowed updateable fields (prevent mutation of immutable columns)
      const allowedFields = [
        // Buyer contact
        'buyerFullName', 'buyerPhone', 'buyerEmail', 'buyerAddress', 'buyingEntityType', 'trustOrCompanyName',
        // Property confirmation
        'propertyAddress', 'propertyTitleReference', 'propertyLegalDescription', 'propertyType',
        // Offer amounts
        'offerPrice', 'depositAmount', 'depositPaymentDate', 'balancePayable', 'balancePayableDate', 'settlementDate',
        // Finance toggle
        'financeRequired', 'financeAmount', 'financeDeadline',
        // Condition toggles
        'limRequired', 'limDeadline', 'buildingInspectionRequired', 'buildingInspectionDeadline',
        'methTestRequired', 'methTestDeadline',
      ];

      const updateData: any = {};
      
      // Filter to allowed fields only
      Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
          updateData[key] = req.body[key];
        }
      });

      // PHASE 1: Backend balance recalculation if price/deposit changed
      if (updateData.offerPrice || updateData.depositAmount) {
        const finalOfferPrice = updateData.offerPrice ? parseFloat(updateData.offerPrice) : offer.offerPrice;
        const finalDepositAmount = updateData.depositAmount ? parseFloat(updateData.depositAmount) : offer.depositAmount;
        updateData.balancePayable = (parseFloat(String(finalOfferPrice)) - parseFloat(String(finalDepositAmount))).toString();
      }

      // PHASE 1: Convert all date strings to Date objects
      const dateFields = ['depositPaymentDate', 'settlementDate', 'balancePayableDate', 'financeDeadline', 
                          'limDeadline', 'buildingInspectionDeadline', 'methTestDeadline'];
      dateFields.forEach(field => {
        if (updateData[field]) {
          updateData[field] = new Date(updateData[field]);
        }
      });

      // PHASE 1: Convert monetary strings to numbers
      const moneyFields = ['offerPrice', 'depositAmount', 'balancePayable', 'financeAmount'];
      moneyFields.forEach(field => {
        if (updateData[field] && typeof updateData[field] === 'string') {
          updateData[field] = parseFloat(updateData[field]);
        }
      });

      const updated = await storage.updatePropertyOffer(req.params.offerId, updateData);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Error updating offer: " + error.message });
    }
  });

  // Get buyer details for an offer
  app.get("/api/offer-wizard/offers/:offerId/buyer-details", requireAuth, async (req: any, res) => {
    try {
      const offer = await storage.getPropertyOffer(req.params.offerId);
      if (!offer || offer.buyerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const buyerDetails = await storage.getOfferBuyerDetails(req.params.offerId);
      res.json(buyerDetails || null);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching buyer details: " + error.message });
    }
  });

  // Create or update buyer details for an offer
  app.post("/api/offer-wizard/offers/:offerId/buyer-details", requireAuth, async (req: any, res) => {
    try {
      const offer = await storage.getPropertyOffer(req.params.offerId);
      if (!offer || offer.buyerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      // Check if buyer details already exist
      const existing = await storage.getOfferBuyerDetails(req.params.offerId);
      let buyerDetails;
      
      if (existing) {
        // Update existing
        buyerDetails = await storage.updateOfferBuyerDetails(req.params.offerId, req.body);
      } else {
        // Create new
        buyerDetails = await storage.createOfferBuyerDetails({
          offerId: req.params.offerId,
          ...req.body
        });
      }
      
      res.json(buyerDetails);
    } catch (error: any) {
      console.error("Error creating buyer details:", error);
      res.status(500).json({ message: "Error saving buyer details: " + error.message });
    }
  });

  // Update buyer details for an offer
  app.patch("/api/offer-wizard/offers/:offerId/buyer-details", requireAuth, async (req: any, res) => {
    try {
      const offer = await storage.getPropertyOffer(req.params.offerId);
      if (!offer || offer.buyerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      // Check if buyer details already exist
      const existing = await storage.getOfferBuyerDetails(req.params.offerId);
      let buyerDetails;
      
      if (existing) {
        // Update existing
        buyerDetails = await storage.updateOfferBuyerDetails(req.params.offerId, req.body);
      } else {
        // Create new if doesn't exist
        buyerDetails = await storage.createOfferBuyerDetails({
          offerId: req.params.offerId,
          ...req.body
        });
      }
      
      res.json(buyerDetails);
    } catch (error: any) {
      console.error("Error updating buyer details:", error);
      res.status(500).json({ message: "Error updating buyer details: " + error.message });
    }
  });

  // Get conditions for an offer
  app.get("/api/offer-wizard/offers/:offerId/conditions", requireAuth, async (req: any, res) => {
    try {
      const offer = await storage.getPropertyOffer(req.params.offerId);
      if (!offer || offer.buyerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const conditions = await storage.getOfferConditions(req.params.offerId);
      res.json(conditions || []);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching conditions: " + error.message });
    }
  });

  // Add condition to an offer
  app.post("/api/offer-wizard/offers/:offerId/conditions", requireAuth, async (req: any, res) => {
    try {
      const offer = await storage.getPropertyOffer(req.params.offerId);
      if (!offer || offer.buyerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      // Convert dueDate string to Date object if needed
      const conditionData = {
        offerId: req.params.offerId,
        ...req.body,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined
      };
      
      const condition = await storage.createOfferCondition(conditionData);
      res.json(condition);
    } catch (error: any) {
      console.error("Error creating condition:", error);
      res.status(500).json({ message: "Error adding condition: " + error.message });
    }
  });

  // Delete a condition
  app.delete("/api/offer-wizard/conditions/:conditionId", requireAuth, async (req: any, res) => {
    try {
      await storage.deleteOfferCondition(req.params.conditionId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Error deleting condition: " + error.message });
    }
  });

  // Get chattels for an offer
  app.get("/api/offer-wizard/offers/:offerId/chattels", requireAuth, async (req: any, res) => {
    try {
      const offer = await storage.getPropertyOffer(req.params.offerId);
      if (!offer || offer.buyerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const chattels = await storage.getOfferChattels(req.params.offerId);
      res.json(chattels || []);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching chattels: " + error.message });
    }
  });

  // Add chattel to an offer
  app.post("/api/offer-wizard/offers/:offerId/chattels", requireAuth, async (req: any, res) => {
    try {
      const offer = await storage.getPropertyOffer(req.params.offerId);
      if (!offer || offer.buyerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const chattel = await storage.createOfferChattel({
        offerId: req.params.offerId,
        ...req.body
      });
      res.json(chattel);
    } catch (error: any) {
      console.error("Error creating chattel:", error);
      res.status(500).json({ message: "Error adding chattel: " + error.message });
    }
  });

  // Delete a chattel
  app.delete("/api/offer-wizard/chattels/:chattelId", requireAuth, async (req: any, res) => {
    try {
      await storage.deleteOfferChattel(req.params.chattelId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Error deleting chattel: " + error.message });
    }
  });

  // Submit offer (mark as pending)
  app.post("/api/offer-wizard/offers/:offerId/submit", requireAuth, async (req: any, res) => {
    try {
      const offer = await storage.getPropertyOffer(req.params.offerId);
      
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }

      if (offer.buyerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to submit this offer" });
      }

      // Get property and seller information
      const property = await storage.getProperty(offer.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      const seller = await storage.getUser(property.userId);
      if (!seller) {
        return res.status(404).json({ message: "Property owner not found" });
      }

      // Get buyer information (propertyOffers references users table)
      const buyer = await storage.getUser(offer.buyerId);
      if (!buyer) {
        return res.status(404).json({ message: "Buyer not found" });
      }

      // Get buyer details, conditions, and chattels for comprehensive PDF
      const buyerDetails = await storage.getOfferBuyerDetails(req.params.offerId);
      const conditions = await storage.getOfferConditions(req.params.offerId);
      const chattels = await storage.getOfferChattels(req.params.offerId);

      // Prepare offer data with buyer contact info for PDF/email
      const offerWithBuyerInfo = {
        ...offer,
        buyerName: buyer.name,
        buyerEmail: buyer.email,
        buyerPhone: 'N/A' // PropertyOffers doesn't store phone; buyer can add via buyerDetails
      };

      // Generate ADLS-compliant PDF using PDFKit
      const { generateMakeOfferPDF } = await import('./services/offer-pdf');
      const pdfBuffer = await generateMakeOfferPDF(
        offerWithBuyerInfo,
        property,
        buyerDetails,
        conditions,
        {
          included: chattels.filter((c: any) => c.chattelType === 'included').map((c: any) => c.itemDescription),
          excluded: chattels.filter((c: any) => c.chattelType === 'excluded').map((c: any) => c.itemDescription)
        }
      );

      // Save PDF to file system (in production, this would be uploaded to object storage)
      const fs = await import('fs/promises');
      const path = await import('path');
      const pdfsDir = path.join(process.cwd(), 'generated_pdfs');
      await fs.mkdir(pdfsDir, { recursive: true });
      const pdfFileName = `make-offer-${offer.id}.pdf`;
      const pdfFilePath = path.join(pdfsDir, pdfFileName);
      await fs.writeFile(pdfFilePath, pdfBuffer);
      const pdfUrl = `/generated_pdfs/${pdfFileName}`;

      // Send emails to both buyer and seller with PDF attachments
      const { sendOfferEmails } = await import('./services/offer-email');
      const emailResult = await sendOfferEmails({
        offerType: 'make_offer',
        offerData: offerWithBuyerInfo,
        propertyData: property,
        buyerEmail: buyer.email,
        sellerEmail: seller.email,
        pdfBuffer,
        offerId: offer.id
      });

      // Update offer with submission, PDF tracking, and email delivery status
      await storage.updatePropertyOffer(req.params.offerId, {
        status: 'pending',
        pdfGenerated: true,
        emailSent: emailResult.buyerEmailSent && emailResult.sellerEmailSent,
        emailSentAt: new Date(),
        pdfUrl
      } as any);

      // Log activity
      await storage.createOfferActivity({
        offerId: req.params.offerId,
        activityType: 'offer_submitted',
        description: 'Official ADLS-compliant offer submitted to vendor with PDF copies sent to all parties',
        createdBy: req.user.id,
      });

      // Build user-friendly message based on email delivery status
      let userMessage = "Official offer submitted successfully and PDF generated!";
      const warnings: string[] = [];
      
      if (emailResult.validationErrors && emailResult.validationErrors.length > 0) {
        // Email validation failed - critical issue
        warnings.push("⚠️ Email delivery failed due to invalid email addresses:");
        warnings.push(...emailResult.validationErrors.map((err: string) => `  • ${err}`));
        warnings.push("Please verify the email addresses and contact the property owner directly.");
      } else if (!emailResult.buyerEmailSent || !emailResult.sellerEmailSent) {
        // Partial email delivery
        if (!emailResult.buyerEmailSent && !emailResult.sellerEmailSent) {
          warnings.push("⚠️ Email notifications could not be sent to buyer or seller.");
        } else if (!emailResult.buyerEmailSent) {
          warnings.push("⚠️ Buyer confirmation email could not be sent.");
        } else if (!emailResult.sellerEmailSent) {
          warnings.push("⚠️ Seller notification email could not be sent.");
        }
        if (emailResult.error) {
          warnings.push(`Reason: ${emailResult.error}`);
        }
        warnings.push("Your official offer was saved and the PDF is available for download.");
      } else {
        // Full success
        userMessage = "Official offer submitted successfully! PDF copies sent to both buyer and seller.";
      }

      res.json({ 
        success: true, 
        message: userMessage,
        warnings: warnings.length > 0 ? warnings : undefined,
        emailDetails: {
          buyerEmailSent: emailResult.buyerEmailSent,
          sellerEmailSent: emailResult.sellerEmailSent,
          buyerEmail: buyer.email,
          sellerEmail: seller.email,
          error: emailResult.error,
          validationErrors: emailResult.validationErrors
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error submitting offer: " + error.message });
    }
  });

  // Delete offer
  app.delete("/api/offer-wizard/offers/:offerId", requireAuth, async (req: any, res) => {
    try {
      const offer = await storage.getPropertyOffer(req.params.offerId);
      
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }

      if (offer.buyerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this offer" });
      }

      await storage.deletePropertyOffer(req.params.offerId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Error deleting offer: " + error.message });
    }
  });

  // ========== PARTNER ECOSYSTEM API ROUTES ==========
  
  // ========== PARTNER SECURITY: FILE UPLOAD REQUIREMENTS ==========
  // 🔒 CRITICAL: When implementing photo uploads for partner job updates:
  //
  // 1. FILE TYPE VALIDATION:
  //    - Only allow image types: image/jpeg, image/png, image/webp
  //    - Reject executable files, scripts, and non-image formats
  //
  // 2. FILE SIZE LIMITS:
  //    - Maximum 5MB per file
  //    - Maximum 10 photos per update
  //
  // 3. CONTENT PROCESSING:
  //    - Use Sharp library to re-encode images (prevents script injection)
  //    - Strip EXIF data that may contain sensitive location/device info
  //    - Resize to max 1920x1080 to save storage
  //
  // 4. SECURE STORAGE:
  //    - Generate random UUIDs for filenames (prevent path traversal)
  //    - Store in private bucket with signed URLs (not public directory)
  //    - Use Object Storage Service with proper access controls
  //
  // 5. VALIDATION EXAMPLE:
  //    import sharp from 'sharp';
  //    const processed = await sharp(buffer)
  //      .resize(1920, 1080, { fit: 'inside' })
  //      .jpeg({ quality: 85 })
  //      .toBuffer();
  
  // ========== PARTNER SECURITY: Validation Schemas ==========
  const updateOrderSchema = z.object({
    status: z.enum(['pending', 'assigned', 'accepted', 'in_progress', 'completed', 'cancelled']),
    message: z.string().max(2000).optional(),
    photos: z.array(z.string().url()).max(10).optional(), // Max 10 photos
    scheduledDate: z.string().datetime().optional(),
  });

  const assignPartnerSchema = z.object({
    partnerId: z.string().uuid(),
  });

  const createReviewSchema = z.object({
    partnerId: z.string().uuid(),
    serviceOrderId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    review: z.string().max(1000).optional(),
    photos: z.array(z.string().url()).max(5).optional(),
  });

  // Get all service partners (admin only)
  app.get("/api/partners", requireAuth, requireAdmin, async (req, res) => {
    try {
      const partners = await storage.getAllServicePartners();
      res.json(partners);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching partners: " + error.message });
    }
  });

  // Get active partners for a specific service type
  app.get("/api/partners/by-service/:serviceType", requireAuth, async (req, res) => {
    try {
      const partners = await storage.getPartnersByServiceType(req.params.serviceType);
      res.json(partners);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching partners: " + error.message });
    }
  });

  // Create new service partner (admin only)
  app.post("/api/partners", requireAuth, requireAdmin, async (req, res) => {
    try {
      const partner = await storage.createServicePartner(req.body);
      res.json(partner);
    } catch (error: any) {
      res.status(500).json({ message: "Error creating partner: " + error.message });
    }
  });

  // Update partner (admin only)
  app.patch("/api/partners/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const partner = await storage.updateServicePartner(req.params.id, req.body);
      res.json(partner);
    } catch (error: any) {
      res.status(500).json({ message: "Error updating partner: " + error.message });
    }
  });

  // ========== MVP: ADMIN PARTNER VERIFICATION ROUTES ==========

  // Get pending partners awaiting verification (admin only)
  app.get("/api/partners/pending", requireAuth, requireAdmin, async (req, res) => {
    try {
      const pending = await storage.getPendingPartners();
      res.json(pending);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching pending partners: " + error.message });
    }
  });

  // Verify/approve a partner (admin only)
  app.post("/api/partners/:id/verify", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      console.log('\n🔵 ===== PARTNER APPROVAL STARTED =====');
      console.log('🔵 Partner ID:', req.params.id);
      // H-029: Redact PII from logs
      console.log('🔵 Admin User:', req.user?.email ? redactEmail(req.user.email) : req.user?.id);
      
      const { notes } = req.body;
      
      // Get partner details first to check account type
      console.log('🔵 Step 1: Fetching partner from database...');
      const [partner] = await db.select()
        .from(servicePartners)
        .where(eq(servicePartners.id, req.params.id))
        .limit(1);
      
      console.log('🔵 Step 2: Partner found:', partner ? {
        id: partner.id,
        email: partner.email,
        companyName: partner.companyName,
        accountType: partner.accountType,
        verificationStatus: partner.verificationStatus
      } : 'NOT FOUND');
        
      if (!partner) {
        console.log('❌ Partner not found in database');
        return res.status(404).json({ message: "Partner not found" });
      }
      
      // Check if partner is already verified
      if (partner.verificationStatus === 'verified') {
        console.log('⚠️ Partner already verified - cannot approve again');
        return res.status(400).json({ 
          message: "Partner is already verified and active",
          partner: partner
        });
      }
      
      if (partner.verificationStatus === 'approved_pending_payment') {
        console.log('⚠️ Partner already approved, waiting for payment');
        return res.status(400).json({ 
          message: "Partner is already approved and waiting for payment",
          partner: partner
        });
      }
      
      // TWO-TIER PAYMENT FLOW
      console.log('🔵 Step 3: Account Type Check:', partner.accountType);
      
      if (partner.accountType === 'preferred_client') {
        // ===== PREFERRED CLIENT: Require payment before activation =====
        console.log('💳 Processing PREFERRED CLIENT approval...');
        
        if (!stripe) {
          console.log('❌ Stripe not configured');
          return res.status(503).json({ message: "Payment system not configured" });
        }
        
        console.log('🔵 Step 4a: Updating partner status to approved_pending_payment...');
        // Update status to approved_pending_payment (NOT verified yet)
        const [updatedPartner] = await db.update(servicePartners)
          .set({
            verificationStatus: 'approved_pending_payment',
            verificationNotes: notes,
            verifiedBy: req.user.id,
          })
          .where(eq(servicePartners.id, req.params.id))
          .returning();
        console.log('✅ Partner status updated');
        
        // Create or get Stripe customer
        console.log('🔵 Step 5a: Creating/getting Stripe customer...');
        let stripeCustomerId = partner.stripeCustomerId;
        if (!stripeCustomerId) {
          console.log('Creating new Stripe customer...');
          const customer = await stripe.customers.create({
            email: partner.email,
            name: partner.companyName,
            metadata: {
              partnerId: partner.id,
              accountType: 'preferred_client',
            },
          });
          stripeCustomerId = customer.id;
          console.log('✅ Stripe customer created:', stripeCustomerId);
          
          // Save customer ID
          await db.update(servicePartners)
            .set({ stripeCustomerId: customer.id })
            .where(eq(servicePartners.id, partner.id));
        } else {
          console.log('✅ Using existing Stripe customer:', stripeCustomerId);
        }
        
        // Create Stripe Checkout session for subscription
        console.log('🔵 Step 6a: Creating Stripe Checkout session...');
        const checkoutSession = await stripe.checkout.sessions.create({
          customer: stripeCustomerId,
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: 'nzd',
              product_data: {
                name: 'HouseMatch Partner - Preferred Client',
                description: 'Monthly subscription for premium listing and direct client referrals',
              },
              recurring: {
                interval: 'month',
              },
              unit_amount: 9900, // $99.00 NZD in cents
            },
            quantity: 1,
          }],
          mode: 'subscription',
          // H-018: Use getPublicBaseUrl so production deployments never fall back to localhost
          success_url: `${getPublicBaseUrl(req)}/partner/activation-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${getPublicBaseUrl(req)}/partner/activation-pending`,
          metadata: {
            partnerId: partner.id,
            accountType: 'preferred_client',
          },
        });
        console.log('✅ Checkout session created:', checkoutSession.id);
        console.log('💰 Payment URL:', checkoutSession.url);
        
        // Send approval email WITH Stripe payment link
        console.log('🔵 Step 7a: Sending approval email with payment link...');
        await EmailService.sendPartnerApprovalWithPayment({
          companyName: partner.companyName,
          contactName: partner.contactName,
          email: partner.email,
          paymentLink: checkoutSession.url!,
          accountType: 'preferred_client',
        });
        
        console.log(`✅ Preferred Client approved, payment link sent to: ${redactEmail(partner.email)}`);
        console.log('🔵 ===== PREFERRED CLIENT APPROVAL COMPLETE =====\n');
        
        res.json({ 
          success: true, 
          partner: updatedPartner,
          requiresPayment: true,
          paymentLink: checkoutSession.url,
        });
        
      } else {
        // ===== SERVICE PARTNER: Immediate activation (commission-based, no upfront payment) =====
        console.log('🤝 Processing SERVICE PARTNER approval (immediate activation)...');
        
        console.log('🔵 Step 4b: Verifying partner in database...');
        const verifiedPartner = await storage.verifyPartner(req.params.id, req.user.id, notes);
        console.log('✅ Partner verified');
        
        // Auto-generate login credentials
        console.log('🔵 Step 5b: Generating secure password...');
        const temporaryPassword = generateSecurePassword();
        const hashedPassword = await hashPassword(temporaryPassword);
        console.log('✅ Password generated and hashed');
        // H-008: Never log plaintext passwords (removed per security audit)
        
        // Create partner login account
        console.log('🔵 Step 6b: Creating partner login account...');
        await db.insert(partnerUsers).values({
          partnerId: verifiedPartner.id,
          email: verifiedPartner.email,
          password: hashedPassword,
          name: verifiedPartner.contactName,
          role: 'admin',
          status: 'active',
        }).returning();
        console.log('✅ Partner login account created');
        
        // Send approval email with login credentials
        console.log('🔵 Step 7b: Sending approval email with credentials...');
        await EmailService.sendPartnerApprovalEmail({
          companyName: verifiedPartner.companyName,
          contactName: verifiedPartner.contactName,
          email: verifiedPartner.email,
          loginEmail: verifiedPartner.email,
          temporaryPassword: temporaryPassword,
          accountType: verifiedPartner.accountType,
        });
        
        console.log(`✅ Service Partner approved and credentials sent to: ${redactEmail(verifiedPartner.email)}`);
        console.log('🔵 ===== SERVICE PARTNER APPROVAL COMPLETE =====\n');
        
        res.json({ success: true, partner: verifiedPartner, requiresPayment: false });
      }
    } catch (error: any) {
      console.error('❌ ===== PARTNER APPROVAL ERROR =====');
      console.error('Error details:', error);
      console.error('Error stack:', error.stack);
      console.error('❌ ===================================\n');
      res.status(500).json({ message: "Error verifying partner: " + error.message });
    }
  });

  // Reject a partner (admin only)
  app.post("/api/partners/:id/reject", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { notes } = req.body;
      if (!notes) {
        return res.status(400).json({ message: "Rejection notes are required" });
      }
      const partner = await storage.rejectPartner(req.params.id, req.user.id, notes);
      
      // Send rejection email with reason
      await EmailService.sendPartnerRejectionEmail({
        companyName: partner.companyName,
        contactName: partner.contactName,
        email: partner.email,
        reason: notes,
      });
      
      console.log(`✅ Partner rejected and notification sent: ${redactEmail(partner.email)}`);
      
      res.json({ success: true, partner });
    } catch (error: any) {
      console.error('Error rejecting partner:', error);
      res.status(500).json({ message: "Error rejecting partner: " + error.message });
    }
  });

  // ========== MVP: ADMIN PAYOUT MANAGEMENT ROUTES ==========

  // Get all unpaid orders (admin only)
  app.get("/api/payouts/unpaid", requireAuth, requireAdmin, async (req, res) => {
    try {
      const unpaid = await storage.getUnpaidOrders();
      res.json(unpaid);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching unpaid orders: " + error.message });
    }
  });

  // Update payout status (admin only) - Track manual bank transfers
  app.post("/api/payouts/:orderId", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { status, amount, notes } = req.body;
      const order = await storage.updatePayoutStatus(req.params.orderId, { status, amount, notes });
      res.json({ success: true, order });
    } catch (error: any) {
      res.status(500).json({ message: "Error updating payout: " + error.message });
    }
  });

  // Get partner earnings summary (admin only)
  app.get("/api/partners/:id/earnings", requireAuth, requireAdmin, async (req, res) => {
    try {
      const earnings = await storage.getPartnerEarnings(req.params.id);
      res.json(earnings);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching earnings: " + error.message });
    }
  });

  // Get partner orders (partner portal)
  app.get("/partner/orders", requirePartnerAuth, async (req: any, res) => {
    try {
      const partnerId = req.user.partnerData.partnerId;
      const status = req.query.status as string | undefined;
      const orders = await storage.getPartnerOrders(partnerId, status);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching orders: " + error.message });
    }
  });

  // Accept service order (partner portal) - WITH AUTHORIZATION & VERIFICATION CHECK
  app.post("/partner/orders/:id/accept", requirePartnerAuth, async (req: any, res) => {
    try {
      const partnerId = req.user.partnerData.partnerId;
      
      // SECURITY: Verify partner is verified before accepting orders
      if (req.user.partnerData.verificationStatus !== 'verified') {
        return res.status(403).json({ message: "Your account must be verified before accepting orders" });
      }
      
      // SECURITY: Verify this partner is assigned to this order
      const order = await storage.getServiceOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (order.partnerId !== partnerId) {
        return res.status(403).json({ message: "Not authorized to accept this order" });
      }
      if (order.status !== 'assigned' && order.status !== 'pending') {
        return res.status(400).json({ message: "Order cannot be accepted in current status" });
      }
      
      const accepted = await storage.acceptServiceOrder(req.params.id, req.user.partnerData.id);
      res.json(accepted);
    } catch (error: any) {
      res.status(500).json({ message: "Error accepting order: " + error.message });
    }
  });

  // Update service order status (partner portal) - WITH AUTHORIZATION & VALIDATION
  app.post("/partner/orders/:id/update", requirePartnerAuth, async (req: any, res) => {
    try {
      // SECURITY: Validate input
      const validData = updateOrderSchema.parse(req.body);
      const partnerId = req.user.partnerData.partnerId;
      
      // SECURITY: Verify this partner is assigned to this order
      const order = await storage.getServiceOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (order.partnerId !== partnerId) {
        return res.status(403).json({ message: "Not authorized to update this order" });
      }
      // SECURITY: Cannot update completed or cancelled orders
      if (order.status === 'completed' || order.status === 'cancelled') {
        return res.status(400).json({ message: "Cannot update closed orders" });
      }
      
      const update = await storage.createPartnerUpdate({
        serviceOrderId: req.params.id,
        partnerId: req.user.partnerData.partnerId,
        partnerUserId: req.user.partnerData.id,
        status: validData.status,
        message: validData.message,
        photos: validData.photos,
        scheduledDate: validData.scheduledDate ? new Date(validData.scheduledDate) : undefined,
      });
      res.json(update);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating order: " + error.message });
    }
  });

  // Get partner analytics (partner portal)
  app.get("/partner/analytics", requirePartnerAuth, async (req: any, res) => {
    try {
      const partnerId = req.user.partnerData.partnerId;
      const analytics = await storage.getPartnerAnalytics(partnerId);
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching analytics: " + error.message });
    }
  });

  // Customer creates service order with payment
  app.post("/api/service-orders", requireAuth, async (req: any, res) => {
    try {
      const orderData = {
        ...req.body,
        buyerId: req.user.id,
        status: 'pending',
      };
      const order = await storage.createServiceOrder(orderData);
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: "Error creating order: " + error.message });
    }
  });

  // Admin assigns partner to order - WITH VALIDATION
  app.post("/api/service-orders/:id/assign", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      // SECURITY: Validate input
      const validData = assignPartnerSchema.parse(req.body);
      
      // Verify order exists
      const order = await storage.getServiceOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Verify partner exists
      const partner = await storage.getServicePartner(validData.partnerId);
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }
      if (partner.status !== 'active') {
        return res.status(400).json({ message: "Partner is not active" });
      }
      
      const assigned = await storage.assignPartnerToOrder(req.params.id, validData.partnerId);
      res.json(assigned);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Error assigning partner: " + error.message });
    }
  });

  // Customer submits service review - WITH VALIDATION & AUTHORIZATION
  app.post("/api/service-reviews", requireAuth, async (req: any, res) => {
    try {
      // SECURITY: Validate input
      const validData = createReviewSchema.parse(req.body);
      
      // SECURITY: Verify user purchased this service
      const order = await storage.getServiceOrder(validData.serviceOrderId);
      if (!order) {
        return res.status(404).json({ message: "Service order not found" });
      }
      if (order.buyerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to review this service" });
      }
      if (order.status !== 'completed') {
        return res.status(400).json({ message: "Can only review completed services" });
      }
      
      const reviewData = {
        ...validData,
        userId: req.user.id,
      };
      const review = await storage.createServiceReview(reviewData);
      res.json(review);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating review: " + error.message });
    }
  });

  // Get service insights for property (data-driven recommendations)
  app.get("/api/properties/:id/service-insights", requireAuth, async (req, res) => {
    try {
      const insights = await storage.getServiceInsights(req.params.id);
      res.json(insights);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching insights: " + error.message });
    }
  });

  // ===== AI SCOUT / LIFESTYLE SWAP ROUTES =====

  // Create a new lifestyle scout
  app.post("/api/scout", csrfProtection, requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const parsed = insertLifestyleScoutSchema.safeParse({ ...req.body, userId });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid scout data", errors: parsed.error.errors });
      }
      const [scout] = await db.insert(lifestyleScouts).values(parsed.data).returning();
      // Run initial match immediately
      await runScoutMatching(scout.id, userId);
      res.json(scout);
    } catch (error: any) {
      res.status(500).json({ message: "Error creating scout: " + error.message });
    }
  });

  // Get user's scouts
  app.get("/api/scout", requireAuth, async (req: any, res) => {
    try {
      const scouts = await db.select().from(lifestyleScouts).where(eq(lifestyleScouts.userId, req.user.id));
      res.json(scouts);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching scouts: " + error.message });
    }
  });

  // Get matches for a scout
  app.get("/api/scout/:scoutId/matches", requireAuth, async (req: any, res) => {
    try {
      const { scoutId } = req.params;
      const scout = await db.select().from(lifestyleScouts).where(
        and(eq(lifestyleScouts.id, scoutId), eq(lifestyleScouts.userId, req.user.id))
      );
      if (!scout.length) return res.status(404).json({ message: "Scout not found" });

      const matches = await db.select({
        match: scoutMatches,
        property: properties,
        matchedScout: lifestyleScouts,
      })
        .from(scoutMatches)
        .leftJoin(properties, eq(scoutMatches.matchedPropertyId, properties.id))
        .leftJoin(lifestyleScouts, eq(scoutMatches.matchedScoutId, lifestyleScouts.id))
        .where(eq(scoutMatches.scoutId, scoutId))
        .orderBy(sql`${scoutMatches.matchScore} DESC`);

      res.json(matches);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching matches: " + error.message });
    }
  });

  // Delete a scout
  app.delete("/api/scout/:scoutId", csrfProtection, requireAuth, async (req: any, res) => {
    try {
      const { scoutId } = req.params;
      await db.delete(scoutMatches).where(eq(scoutMatches.scoutId, scoutId));
      await db.delete(lifestyleScouts).where(
        and(eq(lifestyleScouts.id, scoutId), eq(lifestyleScouts.userId, req.user.id))
      );
      res.json({ message: "Scout deleted" });
    } catch (error: any) {
      res.status(500).json({ message: "Error deleting scout: " + error.message });
    }
  });

  // Run matching for all active scouts (internal / cron)
  app.post("/api/scout/run-matching", requireAuth, async (req: any, res) => {
    try {
      const scouts = await db.select().from(lifestyleScouts).where(
        and(eq(lifestyleScouts.userId, req.user.id), eq(lifestyleScouts.status, "active"))
      );
      for (const scout of scouts) {
        await runScoutMatching(scout.id, scout.userId);
      }
      res.json({ message: `Scanned ${scouts.length} scouts` });
    } catch (error: any) {
      res.status(500).json({ message: "Error running matching: " + error.message });
    }
  });

  // Helper: match a scout against the property database and other scouts
  async function runScoutMatching(scoutId: string, userId: string) {
    const [scout] = await db.select().from(lifestyleScouts).where(eq(lifestyleScouts.id, scoutId));
    if (!scout) return;

    // Match against listings in the database
    const allProperties = await db.select().from(properties).where(
      and(
        eq(properties.publishStatus, "published"),
        sql`LOWER(${properties.suburb}) LIKE LOWER('%' || ${scout.targetSuburb} || '%')
          OR LOWER(${properties.city}) LIKE LOWER('%' || ${scout.targetCity} || '%')`
      )
    );

    // Match against other scouts (lifestyle swappers) who want what this user has
    const inverseScouts = await db.select().from(lifestyleScouts).where(
      and(
        sql`${lifestyleScouts.userId} != ${userId}`,
        eq(lifestyleScouts.status, "active"),
        sql`LOWER(${lifestyleScouts.targetSuburb}) LIKE LOWER('%' || ${scout.currentSuburb} || '%')
          OR LOWER(${lifestyleScouts.targetCity}) LIKE LOWER('%' || ${scout.currentCity} || '%')`
      )
    );

    // Score property matches
    for (const property of allProperties) {
      let score = 50;
      const reasons: string[] = [];

      if (scout.targetBedrooms && property.bedrooms) {
        if (property.bedrooms >= scout.targetBedrooms) { score += 20; reasons.push(`${property.bedrooms} bed match`); }
        else if (property.bedrooms === scout.targetBedrooms - 1) score += 10;
      }
      if (scout.targetPropertyType && property.propertyType === scout.targetPropertyType) {
        score += 15; reasons.push(`${property.propertyType} property type`);
      }
      const cityMatch = property.city?.toLowerCase().includes(scout.targetCity.toLowerCase());
      const suburbMatch = property.suburb?.toLowerCase().includes(scout.targetSuburb.toLowerCase());
      if (suburbMatch) { score += 20; reasons.push("exact suburb match"); }
      else if (cityMatch) { score += 10; reasons.push("city match"); }

      if (score >= 55) {
        const existing = await db.select().from(scoutMatches).where(
          and(eq(scoutMatches.scoutId, scoutId), eq(scoutMatches.matchedPropertyId, property.id))
        );
        if (!existing.length) {
          await db.insert(scoutMatches).values({
            scoutId,
            userId,
            matchedPropertyId: property.id,
            matchScore: Math.min(score, 100),
            matchReason: reasons.join(", "),
            matchType: "lifestyle_match",
            status: "new",
          });
        }
      }
    }

    // Score direct swap matches (user-to-user lifestyle swaps)
    for (const otherScout of inverseScouts) {
      let score = 60;
      const reasons: string[] = ["Lifestyle swap candidate"];

      if (scout.targetBedrooms && otherScout.currentBedrooms) {
        if (otherScout.currentBedrooms >= scout.targetBedrooms) { score += 20; reasons.push("bedroom count aligns"); }
      }
      if (scout.targetPropertyType === otherScout.currentPropertyType) {
        score += 15; reasons.push("property type aligns");
      }
      // Bonus: if they want city and you have city (and vice versa)
      const isInverseTransition =
        (scout.transitionType === "city_to_rural" && otherScout.transitionType === "rural_to_city") ||
        (scout.transitionType === "rural_to_city" && otherScout.transitionType === "city_to_rural") ||
        (scout.transitionType === "upsizing" && otherScout.transitionType === "downsizing") ||
        (scout.transitionType === "downsizing" && otherScout.transitionType === "upsizing");
      if (isInverseTransition) { score += 25; reasons.push("mirror lifestyle swap"); }

      if (score >= 65) {
        const existing = await db.select().from(scoutMatches).where(
          and(eq(scoutMatches.scoutId, scoutId), eq(scoutMatches.matchedScoutId, otherScout.id))
        );
        if (!existing.length) {
          await db.insert(scoutMatches).values({
            scoutId,
            userId,
            matchedScoutId: otherScout.id,
            matchScore: Math.min(score, 100),
            matchReason: reasons.join(", "),
            matchType: "direct_swap",
            status: "new",
          });
        }
      }
    }

    // Update scout stats
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(scoutMatches).where(eq(scoutMatches.scoutId, scoutId));
    await db.update(lifestyleScouts)
      .set({ lastScannedAt: new Date(), matchCount: Number(count), updatedAt: new Date() })
      .where(eq(lifestyleScouts.id, scoutId));
  }

  // Create and return the HTTP server
  const server = createServer(app);
  return server;
}
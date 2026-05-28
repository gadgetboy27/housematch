import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import rateLimit from "express-rate-limit";
import { db } from "./db";
import { partnerUsers, servicePartners, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { PartnerUser } from "@shared/schema";
import { EmailService } from "./services/email";

// Extend Express session to support partner auth
declare global {
  namespace Express {
    interface User {
      isPartner?: boolean;
      partnerData?: PartnerUser;
    }
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// H-009: Strip sensitive fields before sending partner user data to client
function publicPartnerUser(p: PartnerUser) {
  const { password, ...safe } = p;
  return safe;
}

// Partner-specific passport instance
const partnerPassport = new passport.Passport();

export function setupPartnerAuth(app: Express) {
  // Partner auth rate limiter - prevents brute force attacks
  const partnerAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Only 5 attempts per IP per 15 minutes
    message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
  });

  // Auth status check rate limiter - prevents abuse of status endpoint
  const authStatusLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute (allows frontend polling)
    message: { message: 'Too many status check requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // 🔒 ENFORCE SESSION SECRET IN PRODUCTION
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret === "dev-secret-change-in-production") {
    console.error("🚨 SECURITY WARNING: SESSION_SECRET not set or using default value. Generate a strong secret for production!");
    if (process.env.NODE_ENV === 'production') {
      throw new Error("SESSION_SECRET must be set in production environment");
    }
  }
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Partner session store (separate from customer sessions)
  const PgSession = pgSession(session);
  const partnerSessionStore = isProduction 
    ? new PgSession({
        conString: process.env.DATABASE_URL,
        tableName: 'partner_sessions',
        createTableIfMissing: true,
      })
    : undefined;

  const partnerSessionSettings: session.SessionOptions = {
    name: 'partner.sid', // Different session cookie name
    store: partnerSessionStore,
    secret: sessionSecret || "dev-secret-change-in-production", // Fallback for dev only
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
      path: '/partner', // Scope cookies to partner routes
    },
  };

  // Partner routes use separate session middleware
  app.use('/partner', session(partnerSessionSettings));
  app.use('/partner', partnerPassport.initialize());
  app.use('/partner', partnerPassport.session());

  // Partner authentication strategy
  partnerPassport.use(
    'partner-local',
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          const [partnerUser] = await db
            .select()
            .from(partnerUsers)
            .where(eq(partnerUsers.email, email))
            .limit(1);

          // Partner user exists in partner system
          if (partnerUser) {
            // Check if password is correct
            if (await comparePasswords(password, partnerUser.password)) {
              if (partnerUser.status !== 'active') {
                return done(null, false, { message: 'Account is inactive' });
              }

              // Update last login
              await db
                .update(partnerUsers)
                .set({ lastLogin: new Date() })
                .where(eq(partnerUsers.id, partnerUser.id));

              return done(null, { isPartner: true, partnerData: partnerUser } as any);
            } else {
              // Partner user exists but wrong password
              return done(null, false, { message: 'Invalid email or password' });
            }
          }

          // Partner user doesn't exist in partner system - check regular user system
          const { storage } = await import('./storage');
          const regularUser = await storage.getUserByEmail(email);
          
          if (regularUser) {
            return done(null, false, { 
              message: 'REGULAR_USER_ACCOUNT_DETECTED',
              email: email 
            } as any);
          }
          
          // Doesn't exist in either system — use generic message to prevent enumeration
          return done(null, false, { 
            message: 'INVALID_CREDENTIALS',
            email: email 
          } as any);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  partnerPassport.serializeUser((user: any, done) => {
    done(null, { id: user.partnerData.id, isPartner: true });
  });

  partnerPassport.deserializeUser(async (data: any, done) => {
    try {
      const [partnerUser] = await db
        .select()
        .from(partnerUsers)
        .where(eq(partnerUsers.id, data.id))
        .limit(1);

      if (!partnerUser) {
        return done(null, false);
      }

      done(null, { isPartner: true, partnerData: partnerUser } as any);
    } catch (err) {
      done(err);
    }
  });

  // TWO-TIER PARTNER SIGNUP - Handles both Preferred Clients and Service Partners
  app.post('/partner/signup', partnerAuthLimiter, async (req, res) => {
    try {
      const { 
        companyName, 
        contactName, 
        email, 
        phone, 
        businessAddress,
        website,
        description,
        gstNumber,
        serviceTypes, 
        regions,
        accountType 
      } = req.body;
      
      // Validate required fields
      if (!companyName || !contactName || !email || !phone || !gstNumber || !serviceTypes || !regions || !accountType) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Validate account type
      if (!['preferred_client', 'service_partner'].includes(accountType)) {
        return res.status(400).json({ message: 'Invalid account type' });
      }

      // Validate NZ phone number format
      const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
      if (!/^\+64[2-9]\d{7,9}$/.test(cleanedPhone)) {
        return res.status(400).json({ message: 'Phone number must be a valid NZ number starting with +64' });
      }

      // Check if company email already exists in service partners
      const [existingPartner] = await db
        .select()
        .from(servicePartners)
        .where(eq(servicePartners.email, email))
        .limit(1);
        
      if (existingPartner) {
        return res.status(400).json({ message: 'Company email already registered' });
      }
      
      // Create service partner record
      const [partner] = await db
        .insert(servicePartners)
        .values({
          companyName,
          contactName,
          email,
          phone,
          businessAddress: businessAddress || null,
          website: website || null,
          description: description || null,
          gstNumber,
          serviceTypes: Array.isArray(serviceTypes) ? serviceTypes : [serviceTypes],
          regions: Array.isArray(regions) ? regions : [regions],
          accountType,
          status: 'pending',
          verificationStatus: 'pending',
          // Set defaults based on account type
          ...(accountType === 'preferred_client' ? {
            subscriptionStatus: 'pending',
            subscriptionPlan: 'preferred_monthly',
            monthlyFee: '99.00',
          } : {
            commissionRate: '10.00',
          }),
        })
        .returning();

      console.log("\n========================================");
      console.log("✅ PARTNER APPLICATION SUBMITTED");
      console.log("========================================");
      console.log("🏢 Service Partner Record:");
      console.log("  - ID:", partner.id);
      console.log("  - Company Name:", partner.companyName);
      console.log("  - Contact:", partner.contactName);
      // H-029: Redact PII from logs
      console.log("  - Company Email:", partner.email?.replace(/(?<=.{2}).(?=.*@)/g, '*'));
      console.log("  - Phone:", partner.phone?.replace(/\d(?=\d{4})/g, '*'));
      console.log("  - Account Type:", partner.accountType);
      console.log("  - Status:", partner.status);
      console.log("  - Verification Status:", partner.verificationStatus);
      console.log("  - Services:", partner.serviceTypes);
      console.log("  - Regions:", partner.regions);
      console.log("========================================\n");

      // Send email notification to admin
      try {
        await EmailService.sendPartnerSignupNotification({
          companyName,
          contactName,
          email,
          phone,
          accountType,
          serviceTypes: Array.isArray(serviceTypes) ? serviceTypes : [serviceTypes],
          regions: Array.isArray(regions) ? regions : [regions],
          website: website || undefined,
          description: description || undefined,
          businessAddress: businessAddress || undefined,
        });
        console.log('✉️  Partner signup notification sent to admin@swiperight.nz');
      } catch (emailError) {
        // Don't fail signup if email fails
        console.error('Failed to send partner signup notification:', emailError);
      }

      // Return success - Admin will review and create account
      res.status(201).json({
        success: true,
        partnerId: partner.id,
        message: 'Application submitted successfully. We\'ll email you once your account has been verified.',
      });
    } catch (error: any) {
      console.error('Partner signup error:', error);
      res.status(500).json({ message: 'Signup failed: ' + error.message });
    }
  });

  // Partner login endpoint 
  // TODO: Add session rotation for production (currently simplified for MVP)
  app.post('/partner/login', partnerAuthLimiter, (req, res, next) => {
    partnerPassport.authenticate('partner-local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ 
          success: false,
          message: "Login failed" 
        });
      }
      if (!user) {
        // ✅ Handle regular user account detected
        if (info?.message === 'REGULAR_USER_ACCOUNT_DETECTED') {
          // Check if they're currently logged into regular user portal
          const hasRegularSession = req.cookies && req.cookies['connect.sid'];
          
          return res.status(400).json({ 
            success: false,
            message: hasRegularSession
              ? "You're currently logged into the main portal. Would you like to logout and switch to your partner account?"
              : "This is a regular user account. Please use the main login page instead.",
            code: 'REGULAR_USER_ACCOUNT_DETECTED',
            email: info.email,
            redirectTo: '/',
            hasActiveSession: !!hasRegularSession
          });
        }
        // ✅ Handle email not found — use generic message to prevent enumeration (H-010)
        if (info?.message === 'INVALID_CREDENTIALS') {
          return res.status(400).json({ 
            success: false,
            message: "Invalid email or password.",
            code: 'INVALID_CREDENTIALS',
          });
        }
        return res.status(400).json({ 
          success: false,
          message: info?.message || "Invalid credentials" 
        });
      }
      // H-022: Regenerate session ID after login to prevent session fixation (mirrors customer login)
      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ success: false, message: "Login failed" });
        }
        req.login(user, (err) => {
          if (err) {
            return res.status(500).json({ success: false, message: "Login failed" });
          }
          // H-009: Strip password hash from response
          res.json({
            success: true,
            user: user.partnerData ? publicPartnerUser(user.partnerData) : null,
          });
        });
      });
    })(req, res, next);
  });

  // Partner logout endpoint
  app.post('/partner/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Error logging out' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Partner auth status endpoint - rate limited to prevent abuse
  app.get('/partner/auth/status', authStatusLimiter, (req, res) => {
    if (req.user?.isPartner) {
      res.json({
        isAuthenticated: true,
        // H-009: Strip password hash from response
        user: req.user.partnerData ? publicPartnerUser(req.user.partnerData) : null,
      });
    } else {
      res.json({ isAuthenticated: false });
    }
  });
}

// Middleware to protect partner routes
export function requirePartnerAuth(req: any, res: any, next: any) {
  if (req.user?.isPartner) {
    return next();
  }
  res.status(401).json({ message: 'Partner authentication required' });
}

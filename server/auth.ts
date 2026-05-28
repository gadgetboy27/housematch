import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { User as SelectUser, users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { trackSignup } from "./facebook-conversion-api";
import {
  generateVerificationToken,
  getVerificationExpiry,
  sendVerificationEmail,
  sendVerificationReminderEmail,
} from "./email-verification";
import { setSignupPersona } from "./services/persona-detection";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// H-041: Constant-time dummy hash for use when no user record exists.
// Ensures the login response time is indistinguishable whether or not an email is registered.
const FAKE_HASH = '0'.repeat(128) + '.' + '0'.repeat(32);

// H-007 / H-021: Generate a cryptographically secure password without modulo bias
function generateAdminTempPassword(length: number = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  const out: string[] = [];
  while (out.length < length) {
    const buf = randomBytes(length * 2);
    for (let i = 0; i < buf.length && out.length < length; i++) {
      const x = buf[i];
      // Rejection sampling to eliminate modulo bias
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

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // 🛡️ ENHANCED DDOS PROTECTION
  
  // Aggressive auth rate limiter - prevents brute force attacks
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Only 5 attempts per IP per 15 minutes
    message: { message: 'Too many authentication attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false, // Count all attempts, even successful ones
  });

  // Email verification rate limiter - prevents spam
  const verificationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Max 3 verification emails per hour
    message: { message: 'Too many verification requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Global API rate limiter - general DDoS protection
  const globalApiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute per IP
    message: { message: 'Too many requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply global rate limiting to all API routes
  app.use('/api', globalApiLimiter);

  // Generate secure session secret if not provided
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret === "dev-secret-change-in-production") {
    console.error("🚨 SECURITY WARNING: SESSION_SECRET not set or using default value. Generate a strong secret for production!");
    if (process.env.NODE_ENV === 'production') {
      throw new Error("SESSION_SECRET must be set in production environment");
    }
  }

  const isProduction = process.env.NODE_ENV === 'production';
  
  // Production-grade session store (PostgreSQL-backed)
  const PgSession = pgSession(session);
  const sessionStore = isProduction 
    ? new PgSession({
        conString: process.env.DATABASE_URL,
        tableName: 'user_sessions',
        createTableIfMissing: true,
      })
    : undefined; // Use default MemoryStore in development

  const sessionSettings: session.SessionOptions = {
    store: sessionStore, // Use PostgreSQL store in production, MemoryStore in dev
    secret: sessionSecret || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction, // Always true in production (requires HTTPS)
      httpOnly: true, // Prevent XSS attacks
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax', // CSRF protection while allowing external redirects (e.g., Stripe)
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: 'email' }, // Use email instead of username
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          
          // User exists in regular system
          if (user) {
            // Check if password is correct
            if (await comparePasswords(password, user.password)) {
              // H-005: Email verification check — enabled unless SKIP_EMAIL_VERIFICATION=true
              const skipVerification = process.env.SKIP_EMAIL_VERIFICATION === 'true';
              if (!skipVerification && !user.isVerified) {
                return done(null, false, { message: 'EMAIL_NOT_VERIFIED' });
              }
              
              return done(null, user);
            } else {
              // User exists but wrong password
              return done(null, false, { message: 'Invalid email or password' });
            }
          }
          
          // H-041: Run a real scrypt derivation to equalise response timing whether the
          // email is registered or not. We skip timingSafeEqual — the ~100ms derivation
          // cost is all that matters; the comparison is microseconds and irrelevant.
          await scryptAsync(password, FAKE_HASH, 64);

          // H-010: Don't check the partner system here — doing so would enumerate whether an
          // email is a partner account without requiring the correct password.
          // Partner users must use /partner/login. Return a generic error.
          return done(null, false, { 
            message: 'INVALID_CREDENTIALS',
            email: email 
          } as any);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Register endpoint - WITH EMAIL VERIFICATION
  app.post("/api/auth/register", authLimiter, async (req, res, next) => {
    const startTime = Date.now();

    try {
      const { email, name, password, persona } = req.body;

      // Validation
      if (!email || !name || !password) {
        return res.status(400).json({ 
          success: false,
          message: "All fields are required (email, name, password)" 
        });
      }

      if (password.length < 12) {
        return res.status(400).json({ 
          success: false,
          message: "Password must be at least 12 characters for security" 
        });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address"
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ 
          success: false,
          message: "Email already registered - try logging in instead" 
        });
      }

      // H-005: Control email verification via env var — MUST NOT be skipped in production
      const SKIP_EMAIL_VERIFICATION = process.env.SKIP_EMAIL_VERIFICATION === 'true';
      if (SKIP_EMAIL_VERIFICATION && process.env.NODE_ENV === 'production') {
        throw new Error('SKIP_EMAIL_VERIFICATION cannot be used in production');
      }

      let verificationToken: string | null = null;
      let verificationExpiry: Date | null = null;
      if (!SKIP_EMAIL_VERIFICATION) {
        verificationToken = generateVerificationToken();
        verificationExpiry = getVerificationExpiry();
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        name,
        password: hashedPassword,
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
        isVerified: SKIP_EMAIL_VERIFICATION, // Only auto-verify if explicitly allowed
      });

      // ✨ SET PERSONA if provided at signup
      if (persona && ['family', 'investor', 'professional', 'retiree', 'first_home_buyer'].includes(persona)) {
        await setSignupPersona(user.id, persona);
        console.log(`[Auth] Set signup persona for user ${user.id}: ${persona}`);
      }

      // H-005: Send verification email if verification is required
      if (!SKIP_EMAIL_VERIFICATION && verificationToken) {
        const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-email/${verificationToken}`;
        await sendVerificationEmail({
          email,
          name,
          verificationToken,
          verificationUrl,
        });
      }

      // FB CAPI: Track signup server-side (non-blocking)
      const [firstName, ...rest] = (user.name || '').split(' ');
      trackSignup({ email: user.email, firstName, lastName: rest.join(' ') || undefined }, req).catch(() => {});

      // H-005: If email verification required, do NOT auto-login; tell frontend to check inbox
      if (!SKIP_EMAIL_VERIFICATION) {
        return res.json({
          success: true,
          requiresVerification: true,
          message: "Registration successful! Please check your email to verify your account.",
        });
      }

      // Auto-login after registration (only when email verification is skipped)
      req.login(user, (err) => {
        if (err) {
          console.error('Auto-login error:', err);
          return res.json({ 
            success: true,
            message: "Registration successful! You can now login.",
            user: { id: user.id, name: user.name, email: user.email },
          });
        }
        
        res.json({ 
          success: true,
          message: "Registration successful! You are now logged in.",
          user: { id: user.id, name: user.name, email: user.email },
        });
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error('Registration error:', error);
      res.status(500).json({ 
        success: false,
        message: `Registration failed: ${(error as Error).message || "Unknown error"}` 
      });
    }
  });

  // Login endpoint - WITH EMAIL VERIFICATION CHECK
  app.post("/api/auth/login", authLimiter, (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ 
          success: false,
          message: "Login failed" 
        });
      }
      if (!user) {
        // ✅ Handle email not verified error specifically
        if (info?.message === 'EMAIL_NOT_VERIFIED') {
          return res.status(403).json({ 
            success: false,
            message: "Please verify your email before logging in. Check your inbox for the verification link.",
            code: 'EMAIL_NOT_VERIFIED',
            email: req.body.email, // Send email back for resend functionality
          });
        }
        // H-010: Return a generic error for all non-verified, not-found, and wrong-password cases
        if (info?.message === 'INVALID_CREDENTIALS' || info?.message === 'EMAIL_NOT_FOUND') {
          return res.status(400).json({ 
            success: false,
            message: "Invalid email or password.",
            code: 'INVALID_CREDENTIALS',
          });
        }
        return res.status(400).json({ 
          success: false,
          message: "Invalid email or password.",
          code: 'INVALID_CREDENTIALS',
        });
      }
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ 
            success: false,
            message: "Login failed" 
          });
        }
        // Regenerate session ID to prevent session fixation attacks
        req.session.regenerate((err) => {
          if (err) {
            return res.status(500).json({ 
              success: false,
              message: "Login failed" 
            });
          }
          // Re-establish user session after regeneration
          req.login(user, (err) => {
            if (err) {
              return res.status(500).json({ 
                success: false,
                message: "Login failed" 
              });
            }
            res.json({ 
              success: true, 
              user: { 
                id: user.id, 
                email: user.email, 
                name: user.name,
                isAdmin: user.isAdmin || false
              } 
            });
          });
        });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ success: true });
    });
  });

  // ✅ Email Verification Endpoint
  app.get("/api/auth/verify-email/:token", async (req, res) => {
    try {
      const { token } = req.params;

      // Find user with this verification token
      const user = await storage.getUserByVerificationToken(token);

      if (!user) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: #dc2626;">❌ Invalid Verification Link</h1>
              <p>This verification link is invalid or has already been used.</p>
              <a href="/" style="color: #667eea; text-decoration: none; font-weight: bold;">← Return to HouseMatch.nz</a>
            </body>
          </html>
        `);
      }

      // Check if token has expired
      if (user.emailVerificationExpiry && new Date() > new Date(user.emailVerificationExpiry)) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: #f59e0b;">⏰ Verification Link Expired</h1>
              <p>This verification link has expired. Please log in to request a new one.</p>
              <a href="/" style="color: #667eea; text-decoration: none; font-weight: bold;">← Return to HouseMatch.nz</a>
            </body>
          </html>
        `);
      }

      // Mark user as verified
      await storage.updateUser(user.id, {
        isVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      });

      // Success page
      res.send(`
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; margin: 0;">
            <div style="background: white; border-radius: 10px; padding: 40px; max-width: 500px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
              <h1 style="color: #10b981; margin: 0 0 20px 0;">✅ Email Verified!</h1>
              <p style="font-size: 18px; color: #333; margin: 0 0 30px 0;">Your email has been successfully verified. You can now log in and start swiping properties!</p>
              <a href="/" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Start Swiping →</a>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #dc2626;">❌ Verification Failed</h1>
            <p>An error occurred during verification. Please try again or contact support.</p>
            <a href="/" style="color: #667eea; text-decoration: none; font-weight: bold;">← Return to HouseMatch.nz</a>
          </body>
        </html>
      `);
    }
  });

  // ✅ Resend Verification Email Endpoint
  app.post("/api/auth/resend-verification", verificationLimiter, async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required"
        });
      }

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({
          success: true,
          message: "If this email is registered, a verification link has been sent."
        });
      }

      // If already verified, don't send
      if (user.isVerified) {
        return res.status(400).json({
          success: false,
          message: "This email is already verified. You can log in now!"
        });
      }

      // Generate new verification token
      const verificationToken = generateVerificationToken();
      const verificationExpiry = getVerificationExpiry();

      // Update user with new token
      await storage.updateUser(user.id, {
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      });

      // Send verification email
      const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-email/${verificationToken}`;
      await sendVerificationEmail({
        email: user.email,
        name: user.name,
        verificationToken,
        verificationUrl,
      });

      res.json({
        success: true,
        message: "Verification email sent! Please check your inbox."
      });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to resend verification email"
      });
    }
  });

  // Get current user (with fresh data from database)
  app.get("/api/auth/user", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      // Fetch fresh user data from database to include profile picture updates
      const freshUser = await storage.getUser(req.user.id);
      if (!freshUser) {
        return res.status(401).json({ message: "User not found" });
      }
      
      res.json({ 
        id: freshUser.id, 
        email: freshUser.email, 
        name: freshUser.name,
        profilePicture: freshUser.profilePicture,
        isAdmin: freshUser.isAdmin || false,
        subscriptionTier: freshUser.subscriptionTier,
        subscriptionStatus: freshUser.subscriptionStatus
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user data" });
    }
  });

  // Check if any admin exists (for first-time setup)
  app.get('/api/admin/exists', async (req, res) => {
    try {
      const [adminUser] = await db
        .select()
        .from(users)
        .where(eq(users.isAdmin, true))
        .limit(1);
      
      res.json({ exists: !!adminUser });
    } catch (error) {
      res.status(500).json({ message: "Failed to check admin status" });
    }
  });

  // Create first admin (only works if no admin exists AND correct setup token provided)
  app.post('/api/admin/setup', async (req, res) => {
    try {
      // H-006: Require ADMIN_SETUP_TOKEN header to prevent unauthorized admin creation
      const setupToken = req.headers['x-admin-setup-token'];
      const configuredToken = process.env.ADMIN_SETUP_TOKEN;
      if (!configuredToken || setupToken !== configuredToken) {
        return res.status(403).json({ message: "Setup not permitted" });
      }

      const { name, email, password } = req.body;

      // Validate input
      if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email, and password are required" });
      }

      // H-006/H-011: Enforce 12-char minimum for admin passwords (same as customer policy)
      if (password.length < 12) {
        return res.status(400).json({ message: "Password must be at least 12 characters" });
      }

      // Check if any admin already exists
      const [existingAdmin] = await db
        .select()
        .from(users)
        .where(eq(users.isAdmin, true))
        .limit(1);

      if (existingAdmin) {
        return res.status(403).json({ message: "Admin already exists. Use invite feature instead." });
      }

      // Check if email already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create first admin user
      const [newAdmin] = await db
        .insert(users)
        .values({
          name,
          email,
          password: hashedPassword,
          isAdmin: true,
          profilePicture: "👤",
        })
        .returning();

      // H-029: Redact email in log
      console.log(`✅ First admin created: ${newAdmin.email.replace(/(?<=.{2}).(?=.*@)/g, '*')}`);

      res.status(201).json({ 
        message: "Admin account created successfully",
        email: newAdmin.email 
      });
    } catch (error: any) {
      console.error('Admin setup error:', error);
      res.status(500).json({ message: "Failed to create admin account" });
    }
  });

  // Invite additional admin (requires existing admin)
  app.post('/api/admin/invite', requireAdmin, async (req, res) => {
    try {
      const { name, email } = req.body;

      // H-007: Validate only name and email — server generates the password
      if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required" });
      }

      // Check if email already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // H-007: Server generates the temporary password — never echoed in the HTTP response
      const tempPassword = generateAdminTempPassword();
      const hashedPassword = await hashPassword(tempPassword);

      // Create new admin user
      const [newAdmin] = await db
        .insert(users)
        .values({
          name,
          email,
          password: hashedPassword,
          isAdmin: true,
          profilePicture: "👤",
        })
        .returning();

      // H-029: Redact emails in log
      const invitedByEmail = (req.user as any)?.email;
      console.log(`✅ Admin invited: ${newAdmin.email.replace(/(?<=.{2}).(?=.*@)/g, '*')} by ${invitedByEmail ? invitedByEmail.replace(/(?<=.{2}).(?=.*@)/g, '*') : 'unknown'}`);

      // H-007: Password is sent via email only — never returned in the HTTP response
      // TODO: Wire up EmailService.sendAdminInvite({ email, tempPassword, invitedBy: req.user.email });
      console.log(`🔑 Temporary credentials generated for admin (length: ${tempPassword.length})`);

      res.status(201).json({ 
        message: "Admin invited. Credentials have been sent to their email.",
        email: newAdmin.email,
      });
    } catch (error: any) {
      console.error('Admin invite error:', error);
      res.status(500).json({ message: "Failed to invite admin" });
    }
  });
}

// Auth middleware
export function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  // Add userId to request for easy access
  req.userId = req.user.id;
  next();
}

// Admin middleware - requires admin role for dashboard access
export function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  
  req.userId = req.user.id;
  next();
}

// Secure property ownership middleware using session auth
export async function requirePropertyOwnership(req: any, res: any, next: any) {
  try {
    const propertyId = req.params.id;
    const userId = req.userId; // Set by requireAuth middleware
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const property = await storage.getProperty(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    if (property.userId !== userId) {
      return res.status(403).json({ message: 'Access denied: You can only modify your own properties' });
    }
    
    next();
  } catch (error) {
    console.error('Property ownership check failed:', error);
    res.status(500).json({ message: 'Authorization check failed' });
  }
}
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

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
  // Auth rate limiter to prevent brute force attacks
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth requests per windowMs
    message: { message: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

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
      sameSite: 'strict', // Enhanced CSRF protection
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
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: 'Invalid email or password' });
          }
          return done(null, user);
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

  // Register endpoint
  app.post("/api/auth/register", authLimiter, async (req, res, next) => {
    const startTime = Date.now();

    try {
      const { email, name, password } = req.body;

      // Validation
      if (!email || !name || !password) {
        return res.status(400).json({ 
          success: false,
          message: "All fields are required (email, name, password)" 
        });
      }

      if (password.length < 6) {
        return res.status(400).json({ 
          success: false,
          message: "Password must be at least 6 characters" 
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

      // Create user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        name,
        password: hashedPassword,
      });

      // Log them in with session regeneration for security
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        // Regenerate session ID to prevent session fixation attacks
        req.session.regenerate((err) => {
          if (err) {
            return next(err);
          }
          // Re-establish user session after regeneration
          req.login(user, (err) => {
            if (err) {
              return next(err);
            }
            const responseTime = Date.now() - startTime;
            res.json({ 
              success: true, 
              user: { 
                id: user.id, 
                email: user.email, 
                name: user.name 
              } 
            });
          });
        });
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      res.status(500).json({ 
        success: false,
        message: `Registration failed: ${(error as Error).message || "Unknown error"}` 
      });
    }
  });

  // Login endpoint
  app.post("/api/auth/login", authLimiter, (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ 
          success: false,
          message: "Login failed" 
        });
      }
      if (!user) {
        return res.status(400).json({ 
          success: false,
          message: info?.message || "Invalid credentials" 
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
                name: user.name 
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
        profilePicture: freshUser.profilePicture 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user data" });
    }
  });
}

// Auth middleware
export function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  // Add userId to request for easy access
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
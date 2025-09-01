import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
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
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true, // Prevent XSS attacks
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax', // CSRF protection
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
  app.post("/api/auth/register", async (req, res, next) => {
    const startTime = Date.now();
    console.log("📝 REGISTRATION REQUEST:", { 
      body: { ...req.body, password: "[REDACTED]" }, 
      timestamp: new Date().toISOString() 
    });

    try {
      const { email, name, password } = req.body;

      // Validation
      if (!email || !name || !password) {
        console.log("❌ VALIDATION FAILED: Missing fields", { email: !!email, name: !!name, password: !!password });
        return res.status(400).json({ 
          success: false,
          message: "All fields are required (email, name, password)" 
        });
      }

      if (password.length < 6) {
        console.log("❌ VALIDATION FAILED: Password too short", { length: password.length });
        return res.status(400).json({ 
          success: false,
          message: "Password must be at least 6 characters" 
        });
      }

      // Check if user already exists
      console.log("🔍 Checking if user exists:", email);
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        console.log("❌ USER ALREADY EXISTS:", email);
        return res.status(400).json({ 
          success: false,
          message: "Email already registered - try logging in instead" 
        });
      }

      // Create user
      console.log("🔨 Creating user:", { email, name });
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        name,
        password: hashedPassword,
      });
      console.log("✅ User created successfully:", { id: user.id, email: user.email });

      // Log them in
      req.login(user, (err) => {
        if (err) {
          console.error("❌ AUTO-LOGIN FAILED:", err);
          return next(err);
        }
        const responseTime = Date.now() - startTime;
        console.log("✅ REGISTRATION COMPLETE:", { userId: user.id, responseTime: `${responseTime}ms` });
        res.json({ 
          success: true, 
          user: { 
            id: user.id, 
            email: user.email, 
            name: user.name 
          } 
        });
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error("❌ REGISTRATION ERROR:", {
        error: error.message,
        stack: error.stack,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      });
      res.status(500).json({ 
        success: false,
        message: `Registration failed: ${error.message || "Unknown error"}` 
      });
    }
  });

  // Login endpoint
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
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
        res.json({ 
          success: true, 
          user: { 
            id: user.id, 
            email: user.email, 
            name: user.name 
          } 
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

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({ 
      id: req.user.id, 
      email: req.user.email, 
      name: req.user.name 
    });
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
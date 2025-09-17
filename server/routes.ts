import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertOfferSchema, insertDraftDocumentSchema } from "@shared/schema";
import { insertPropertySchema, insertUserSwipeSchema, insertPurchaseOrderSchema, insertServiceProviderSchema, pricingPlans } from "@shared/schema";
import { db } from "./db";
import { analyzeUserPreferences, generatePropertyRecommendations, generateMarketInsights } from "./services/openai";
import { setupAuth, requireAuth, requirePropertyOwnership } from "./auth";
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

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", "wss:", "ws:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // Disable x-powered-by header
  app.disable('x-powered-by');

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

  // Setup authentication
  setupAuth(app);

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

  // Property routes with personalization
  app.get("/api/properties", async (req, res) => {
    try {
      const { type, suburb, userId = "demo-user" } = req.query;
      let properties;
      
      if (type) {
        properties = await storage.getPropertiesByType(type as string);
      } else if (suburb) {
        properties = await storage.searchProperties({ suburb: suburb as string });
      } else {
        // Simply return all active properties for now
        properties = await storage.getAllProperties();
      }
      
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
      await storage.updatePropertyMetrics(property.id, property.views + 1);
      
      res.json(property);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  app.post("/api/properties", requireAuth, async (req, res) => {
    try {
      const validatedData = insertPropertySchema.parse(req.body);
      // Add userId to property data from authenticated user
      const propertyData = { ...validatedData, userId: req.userId! };
      
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
    } catch (error) {
      // Handle database constraint violations
      if (error.message.includes('unique constraint') || error.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ 
          message: "Duplicate property detected", 
          error: "This property appears to already exist in our system (same address/lot number or certificate of title). Please verify your information."
        });
      }
      
      res.status(400).json({ message: "Invalid property data", error: error.message });
    }
  });

  app.post("/api/properties/:id/metrics", requireAuth, requirePropertyOwnership, async (req, res) => {
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
      if (req.params.userId !== req.userId) {
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
  app.put("/api/properties/:id", requireAuth, requirePropertyOwnership, async (req, res) => {
    try {
      const validatedData = insertPropertySchema.parse(req.body);
      const updatedProperty = await storage.updateProperty(req.params.id, validatedData);
      
      res.json({
        message: "Property updated successfully",
        property: updatedProperty
      });
    } catch (error) {
      console.error("Failed to update property:", error);
      res.status(400).json({ 
        message: "Failed to update property", 
        error: error.message 
      });
    }
  });

  // Delete property (soft delete)
  app.delete("/api/properties/:id", requireAuth, requirePropertyOwnership, async (req, res) => {
    try {
      await storage.softDeleteProperty(req.params.id);
      res.json({ message: "Property removed from listings" });
    } catch (error) {
      console.error("Failed to delete property:", error);
      res.status(500).json({ message: "Failed to remove property" });
    }
  });

  // User swipe routes
  app.post("/api/swipes", async (req, res) => {
    try {
      const validatedData = insertUserSwipeSchema.parse(req.body);
      const swipe = await storage.createUserSwipe(validatedData);
      
      // Update property metrics based on swipe action
      const property = await storage.getProperty(swipe.propertyId!);
      if (property) {
        if (swipe.action === 'like' || swipe.action === 'super_like') {
          await storage.updatePropertyMetrics(property.id, undefined, property.likes + 1);
        }
      }
      
      res.status(201).json(swipe);
    } catch (error) {
      res.status(400).json({ message: "Invalid swipe data", error: error.message });
    }
  });

  app.get("/api/swipes/:userId", async (req, res) => {
    try {
      const swipes = await storage.getUserSwipes(req.params.userId);
      res.json(swipes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch swipes" });
    }
  });

  app.get("/api/swipes/:userId/count", async (req, res) => {
    try {
      const count = await storage.getUserSwipeCount(req.params.userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch swipe count" });
    }
  });

  // AI recommendation routes
  app.post("/api/ai/analyze-preferences", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

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
          aiInsights: insights,
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

  app.post("/api/ai/recommendations", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const userPreferences = await storage.getUserPreferences(userId);
      if (!userPreferences || !userPreferences.aiInsights) {
        return res.status(400).json({ message: "User preferences not found. Please analyze preferences first." });
      }

      const availableProperties = await storage.getAllProperties();
      const recommendations = await generatePropertyRecommendations(
        userPreferences.aiInsights,
        availableProperties
      );

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

      res.json(detailedRecommendations);
    } catch (error) {
      console.error("Recommendations error:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  app.get("/api/ai/market-insights", async (req, res) => {
    try {
      const { location = "Auckland", propertyType = "residential" } = req.query;
      const insights = await generateMarketInsights(location as string, propertyType as string);
      res.json({ insights });
    } catch (error) {
      console.error("Market insights error:", error);
      res.status(500).json({ message: "Failed to generate market insights" });
    }
  });

  // Purchase order routes
  app.post("/api/purchase-orders", async (req, res) => {
    try {
      const validatedData = insertPurchaseOrderSchema.parse(req.body);
      const order = await storage.createPurchaseOrder(validatedData);
      res.status(201).json(order);
    } catch (error) {
      res.status(400).json({ message: "Invalid purchase order data", error: error.message });
    }
  });

  app.get("/api/purchase-orders/:userId", async (req, res) => {
    try {
      const orders = await storage.getUserPurchaseOrders(req.params.userId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  app.patch("/api/purchase-orders/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      await storage.updatePurchaseOrderStatus(req.params.id, status);
      res.json({ message: "Order status updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // LINZ Property Validation routes
  app.post("/api/validate-property", async (req, res) => {
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
  app.post("/api/validate-lot-number", async (req, res) => {
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

  app.post("/api/validate-address", async (req, res) => {
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

  app.post("/api/validate-certificate", async (req, res) => {
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

  // This endpoint is used to serve private objects that can be accessed publicly
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
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
  app.post("/api/objects/upload", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // An example endpoint for updating the model state after an object entity is uploaded (property image in this case).
  app.put("/api/property-images", async (req, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(
        req.body.imageURL,
      );

      res.status(200).json({
        objectPath: objectPath,
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

  app.post("/api/service-providers", async (req, res) => {
    try {
      const validatedData = insertServiceProviderSchema.parse(req.body);
      const provider = await storage.createServiceProvider(validatedData);
      res.status(201).json(provider);
    } catch (error) {
      console.error("Failed to create service provider:", error);
      if (error.code === '23505') { // Unique constraint violation
        res.status(409).json({ 
          message: "Email already exists", 
          error: "A service provider with this email already exists." 
        });
      } else {
        res.status(400).json({ message: "Invalid service provider data", error: error.message });
      }
    }
  });

  // User profile picture update endpoint
  app.put("/api/users/:id/profile-picture", requireAuth, async (req, res) => {
    try {
      const userId = req.params.id;
      const { profilePicture } = req.body;

      // Verify user is updating their own profile
      if (req.userId !== userId) {
        return res.status(403).json({ message: "You can only update your own profile picture" });
      }

      // Validate profile picture is safe (emoji or predefined avatar)
      const isEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(profilePicture);
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
  async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }

  // Password reset request (send email with reset link)
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ 
          message: "If an account with this email exists, you will receive a password reset link shortly." 
        });
      }

      // Generate secure reset token
      const resetToken = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      
      // Save token to database
      await storage.createPasswordResetToken(user.id, resetToken, expiresAt);
      
      // Send reset email
      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
      const emailSent = await sendPasswordResetEmailViaGmail({
        email: user.email,
        name: user.name,
        resetToken,
        resetUrl
      });

      if (!emailSent) {
        console.error("Failed to send password reset email to:", email);
        return res.status(500).json({ message: "Failed to send reset email" });
      }

      // Clean up old expired tokens
      await storage.cleanupExpiredTokens();

      res.json({ 
        message: "If an account with this email exists, you will receive a password reset link shortly." 
      });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Password reset execution (process the reset with token)
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
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

      console.log(`✅ Password reset completed for user ${tokenData.userId}`);

      res.json({ message: "Password reset successfully! You can now log in with your new password." });
    } catch (error) {
      console.error("Password reset execution error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Admin routes (you can add authentication later)
  app.put("/api/service-providers/:id/status", async (req, res) => {
    try {
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
  app.post("/api/offers", async (req, res) => {
    try {
      console.log("📝 OFFER SUBMISSION:", {
        body: req.body,
        user: req.user?.id || 'anonymous',
        timestamp: new Date().toISOString()
      });

      // Validate the offer data
      const validatedData = insertOfferSchema.parse(req.body);
      
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
        buyerId: req.user?.id || null, // Connect to user profile if logged in
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
      console.log("✅ Offer created:", offer.id);

      // Generate draft document automatically
      const draftDocument = await storage.createDraftDocument({
        offerId: offer.id,
        documentType: validatedData.propertyId ? 'purchase_sale_agreement' : 'lease_agreement',
        documentContent: generateDraftContent(validatedData, offer),
        pdfUrl: null, // Will be generated later
        docxUrl: null,
        version: 1,
        isLatestVersion: true,
        status: 'generated'
      });

      console.log("📄 Draft document generated:", draftDocument.id);

      // Generate PDF for email attachment
      const { generateSimplePDF } = await import('./pdf-generator');
      const pdfBase64 = generateSimplePDF(offer, property);

      // Send email notification to seller
      const { sendOfferNotificationViaGmail } = await import('./gmail-email');
      const emailSent = await sendOfferNotificationViaGmail(
        seller.email,
        offer,
        property,
        pdfBase64
      );


      res.status(201).json({
        success: true,
        message: emailSent ? "Offer submitted, document generated, and seller notified!" : "Offer submitted and document generated (email failed)",
        offer,
        draftDocument: {
          id: draftDocument.id,
          documentType: draftDocument.documentType,
          status: draftDocument.status
        },
        emailSent
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
  app.get("/api/draft-documents/:id", async (req, res) => {
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
  app.get("/api/properties/:propertyId/offers", async (req, res) => {
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
  app.get("/api/user/offers", async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Please log in to view your offers" });
      }

      const offers = await storage.getUserOffers(req.user.id);
      
      res.json({
        success: true,
        offers
      });

    } catch (error: any) {
      res.status(500).json({
        message: "Failed to retrieve your offers",
        error: error.message
      });
    }
  });

  // Get user's draft documents (for profile page)
  app.get("/api/user/documents", async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Please log in to view your documents" });
      }

      const documents = await storage.getUserDraftDocuments(req.user.id);
      
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
  app.get("/api/seller/offers", async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Please log in to view received offers" });
      }

      const offers = await storage.getSellerOffers(req.user.id);
      
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

  // Like property
  app.post("/api/properties/:propertyId/like", async (req, res) => {
    try {
      const property = await storage.incrementPropertyLikes(req.params.propertyId);
      console.log(`👍 Property ${req.params.propertyId} liked! New count: ${property.likes}`);
      res.json({ success: true, likes: property.likes });
    } catch (error: any) {
      console.error("❌ LIKE ERROR:", error);
      res.status(500).json({ message: "Failed to like property", error: error.message });
    }
  });

  // Save property
  app.post("/api/properties/:propertyId/save", async (req, res) => {
    try {
      const property = await storage.incrementPropertySaves(req.params.propertyId);
      console.log(`💾 Property ${req.params.propertyId} saved! New count: ${property.saves}`);
      res.json({ success: true, saves: property.saves });
    } catch (error: any) {
      console.error("❌ SAVE ERROR:", error);
      res.status(500).json({ message: "Failed to save property", error: error.message });
    }
  });

  // ===== USER STORAGE MANAGEMENT API =====

  // Get user storage statistics
  app.get("/api/users/:userId/storage", requireAuth, async (req, res) => {
    try {
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

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to generate draft legal document content
function generateDraftContent(offerData: any, offer: any): string {
  const conditions = [];
  if (offerData.financeCondition) conditions.push("Subject to finance approval");
  if (offerData.buildingInspectionCondition) conditions.push("Subject to building inspection");
  if (offerData.limCondition) conditions.push("Subject to LIM report");
  if (offerData.additionalConditions) conditions.push(offerData.additionalConditions);

  return `
# DRAFT PURCHASE AND SALE AGREEMENT

**⚠️ DRAFT DOCUMENT - FOR REVIEW ONLY**

## Property Details
- **Property ID**: ${offerData.propertyId}
- **Offer Price**: ${offerData.offerPrice}
- **Settlement Period**: ${offerData.settlementPeriod}

## Buyer Information
- **Name**: ${offerData.buyerName}
- **Email**: ${offerData.buyerEmail}
- **Phone**: ${offerData.buyerPhone}

## Terms and Conditions
${conditions.length > 0 ? conditions.map(c => `- ${c}`).join('\n') : '- No special conditions'}

## Additional Comments
${offerData.additionalComments || 'None'}

---

**LEGAL DISCLAIMER**: This is a draft document generated for review purposes only. Please have a qualified lawyer review all terms before signing. This document is not legally binding until properly executed by all parties.

**Generated**: ${new Date().toISOString()}
**Offer ID**: ${offer.id}
  `.trim();
}

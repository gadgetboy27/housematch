import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPropertySchema, insertUserSwipeSchema, insertPurchaseOrderSchema } from "@shared/schema";
import { analyzeUserPreferences, generatePropertyRecommendations, generateMarketInsights } from "./services/openai";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";

export async function registerRoutes(app: Express): Promise<Server> {
  
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
        // Use personalized properties for the demo user
        if (userId === "demo-user") {
          try {
            const { AnalyticsService } = await import("./services/analytics");
            const analyticsService = new AnalyticsService(storage);
            const personalizedProperties = await analyticsService.getPersonalizedProperties(userId as string);
            properties = personalizedProperties.map(p => p.property);
          } catch (error) {
            console.error("Analytics fallback to all properties:", error);
            properties = await storage.getAllProperties();
          }
        } else {
          properties = await storage.getAllProperties();
        }
      }
      
      res.json(properties);
    } catch (error) {
      console.error("Failed to fetch properties:", error);
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

  app.post("/api/properties", async (req, res) => {
    try {
      const validatedData = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(validatedData);
      res.status(201).json(property);
    } catch (error) {
      res.status(400).json({ message: "Invalid property data", error: error.message });
    }
  });

  app.post("/api/properties/:id/metrics", async (req, res) => {
    try {
      const { views, likes, saves } = req.body;
      await storage.updatePropertyMetrics(req.params.id, views, likes, saves);
      res.json({ message: "Metrics updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update metrics" });
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

  const httpServer = createServer(app);
  return httpServer;
}

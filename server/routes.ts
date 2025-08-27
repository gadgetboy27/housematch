import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPropertySchema, insertUserSwipeSchema, insertPurchaseOrderSchema } from "@shared/schema";
import { analyzeUserPreferences, generatePropertyRecommendations, generateMarketInsights } from "./services/openai";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Property routes
  app.get("/api/properties", async (req, res) => {
    try {
      const { type, suburb } = req.query;
      let properties;
      
      if (type) {
        properties = await storage.getPropertiesByType(type as string);
      } else if (suburb) {
        properties = await storage.searchProperties({ suburb: suburb as string });
      } else {
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
      const likedProperties = [];
      const dislikedProperties = [];

      for (const swipe of swipes) {
        const property = await storage.getProperty(swipe.propertyId!);
        if (property) {
          if (swipe.action === 'like' || swipe.action === 'super_like') {
            likedProperties.push(property);
          } else if (swipe.action === 'dislike') {
            dislikedProperties.push(property);
          }
        }
      }

      if (likedProperties.length === 0 && dislikedProperties.length === 0) {
        return res.status(400).json({ message: "Not enough swipe data for analysis" });
      }

      const insights = await analyzeUserPreferences(likedProperties, dislikedProperties);
      
      // Save insights to user preferences
      await storage.createOrUpdateUserPreferences({
        userId,
        preferredPropertyTypes: insights.preferredPropertyTypes,
        priceRangeMin: insights.priceRange.min.toString(),
        priceRangeMax: insights.priceRange.max.toString(),
        preferredSuburbs: insights.preferredLocations,
        aiInsights: insights,
      });

      res.json(insights);
    } catch (error) {
      console.error("AI analysis error:", error);
      res.status(500).json({ message: "Failed to analyze preferences" });
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

  const httpServer = createServer(app);
  return httpServer;
}

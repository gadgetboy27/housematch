import { type User, type InsertUser, type Property, type InsertProperty, type UserSwipe, type InsertUserSwipe, type UserPreferences, type InsertUserPreferences, type PurchaseOrder, type InsertPurchaseOrder, type ServiceProvider, type InsertServiceProvider, type PricingPlan, type InsertPricingPlan, type Offer, type InsertOffer, type DraftDocument, type InsertDraftDocument, type LawyerReview, type InsertLawyerReview, users, properties, userSwipes, userPreferences, purchaseOrders, serviceProviders, passwordResetTokens, pricingPlans, offers, draftDocuments, lawyerReviews } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Properties
  getProperty(id: string): Promise<Property | undefined>;
  getAllProperties(): Promise<Property[]>;
  getPropertiesByType(type: string): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  updatePropertyMetrics(id: string, views?: number, likes?: number, saves?: number): Promise<void>;
  searchProperties(query: { suburb?: string; propertyType?: string; minPrice?: number; maxPrice?: number }): Promise<Property[]>;
  findPropertyByAddressAndLot(address: string, lotNumber: string): Promise<Property | undefined>;

  // User Swipes
  createUserSwipe(swipe: InsertUserSwipe): Promise<UserSwipe>;
  getUserSwipes(userId: string): Promise<UserSwipe[]>;
  getUserSwipeCount(userId: string): Promise<number>;

  // User Preferences
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  createOrUpdateUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;

  // Purchase Orders
  createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder>;
  getUserPurchaseOrders(userId: string): Promise<PurchaseOrder[]>;
  updatePurchaseOrderStatus(id: string, status: string): Promise<void>;

  // Service Providers
  createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider>;
  getAllServiceProviders(): Promise<ServiceProvider[]>;
  getServiceProvidersByCategory(category: string): Promise<ServiceProvider[]>;
  getServiceProviderById(id: string): Promise<ServiceProvider | undefined>;
  updateServiceProviderStatus(id: string, status: string, reviewNotes?: string): Promise<void>;
  getApprovedServiceProviders(): Promise<ServiceProvider[]>;

  // Property Management
  getUserProperties(userId: string): Promise<Property[]>;
  updateProperty(id: string, data: Partial<InsertProperty>): Promise<Property>;
  softDeleteProperty(id: string): Promise<void>;

  // Password Reset
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  validatePasswordResetToken(token: string): Promise<{ userId: string } | null>;
  markTokenAsUsed(token: string): Promise<void>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;
  cleanupExpiredTokens(): Promise<void>;

  // Pricing Plans
  getAllPricingPlans(): Promise<PricingPlan[]>;
  getActivePricingPlans(): Promise<PricingPlan[]>;

  // Offer System
  createOffer(offer: InsertOffer): Promise<Offer>;
  getOffer(id: string): Promise<Offer | undefined>;
  getOffersForProperty(propertyId: string): Promise<Offer[]>;
  updateOfferStatus(id: string, status: string): Promise<void>;

  // Draft Documents
  createDraftDocument(document: InsertDraftDocument): Promise<DraftDocument>;
  getDraftDocument(id: string): Promise<DraftDocument | undefined>;
  getDraftDocumentsByOffer(offerId: string): Promise<DraftDocument[]>;
  updateDraftDocumentContent(id: string, content: string): Promise<void>;

  // Lawyer Reviews
  createLawyerReview(review: InsertLawyerReview): Promise<LawyerReview>;
  getLawyerReview(id: string): Promise<LawyerReview | undefined>;
  getLawyerReviewsByDocument(documentId: string): Promise<LawyerReview[]>;
  updateLawyerReviewStatus(id: string, status: string, notes?: string): Promise<void>;

  // User Profile Methods
  getUserOffers(userId: string): Promise<Offer[]>;
  getUserDraftDocuments(userId: string): Promise<DraftDocument[]>;
  getSellerOffers(sellerId: string): Promise<Offer[]>; // Get offers received by seller

  // Property Metrics Methods
  incrementPropertyViews(propertyId: string): Promise<void>;
  incrementPropertyLikes(propertyId: string): Promise<Property>;
  incrementPropertySaves(propertyId: string): Promise<Property>;
}


export class DatabaseStorage implements IStorage {
  private seeded = false;

  private async seedDatabase() {
    if (this.seeded) return;
    
    // Create demo user first
    let demoUser;
    try {
      demoUser = await this.getUserByEmail("demo@example.com");
      if (!demoUser) {
        demoUser = await this.createUser({
          email: "demo@example.com",
          name: "Demo User",
          password: "demo123"
        });
      }
    } catch (error) {
      demoUser = await this.getUserByEmail("demo@example.com");
    }

    if (!demoUser) return;

    // Check if properties already exist (avoid calling getAllProperties to prevent circular dependency)
    const existingProperties = await db.select().from(properties).where(eq(properties.isActive, true));
    if (existingProperties.length > 0) {
      this.seeded = true;
      return;
    }

    // Seed properties with beautiful images and good metrics
    const mockProperties = [
      {
        userId: demoUser.id,
        title: "Modern Family Home",
        address: "123 Queen Street, Auckland Central",
        suburb: "Ponsonby",
        price: "$1,250,000",
        bedrooms: 4,
        bathrooms: 2,
        floorArea: 180,
        landArea: 450,
        propertyType: "residential",
        lotNumber: "Lot 15 DP 456789",
        certificateOfTitle: "CT 456789/123",
        zoning: "Residential Mixed Use",
        yearBuilt: 2018,
        imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        description: "Stunning modern family home in the heart of Ponsonby",
        additionalImages: [
          "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        views: 147,
        likes: 23,
        saves: 8,
        isLinzValidated: true,
        selfDeclaration: true
      },
      {
        userId: demoUser.id,
        title: "Luxury Apartment",
        address: "89 The Terrace, Wellington Central",
        suburb: "Wellington Central",
        price: "$950,000",
        bedrooms: 2,
        bathrooms: 2,
        floorArea: 95,
        landArea: 0,
        propertyType: "residential",
        lotNumber: "Lot 3 DP 567890",
        certificateOfTitle: "CT 567890/456",
        zoning: "Residential",
        yearBuilt: 2020,
        imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        description: "Luxury apartment with harbour views",
        additionalImages: [
          "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1540932239986-30128078f3c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        views: 89,
        likes: 15,
        saves: 5,
        isLinzValidated: true,
        selfDeclaration: true,
        isActive: true
      },
      {
        userId: demoUser.id,
        title: "Family Villa",
        address: "456 Colombo Street, Christchurch",
        suburb: "Sydenham",
        price: "$720,000",
        bedrooms: 3,
        bathrooms: 2,
        floorArea: 150,
        landArea: 600,
        propertyType: "residential",
        lotNumber: "Lot 8 DP 678901",
        certificateOfTitle: "CT 678901/789",
        zoning: "Residential",
        yearBuilt: 1995,
        imageUrl: "https://images.unsplash.com/photo-1449844908441-8829872d2607?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        description: "Charming family villa with large garden",
        additionalImages: [
          "https://images.unsplash.com/photo-1570129477492-45c003edd2be?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        views: 234,
        likes: 34,
        saves: 12,
        isLinzValidated: true,
        selfDeclaration: true,
        isActive: true
      },
      {
        userId: demoUser.id,
        title: "Commercial Space",
        address: "78 High Street, Auckland CBD",
        suburb: "Auckland Central",
        price: "$2,200,000",
        bedrooms: 0,
        bathrooms: 3,
        floorArea: 300,
        landArea: 0,
        propertyType: "commercial",
        lotNumber: "Lot 2 DP 789012",
        certificateOfTitle: "CT 789012/890",
        zoning: "Commercial",
        yearBuilt: 2015,
        imageUrl: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        description: "Prime commercial space in CBD",
        additionalImages: [
          "https://images.unsplash.com/photo-1565444563072-6c8065ade936?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        views: 56,
        likes: 7,
        saves: 2,
        isLinzValidated: true,
        selfDeclaration: true,
        isActive: true
      },
      {
        userId: demoUser.id,
        title: "Luxury Villa",
        address: "45 Orakei Road, Auckland",
        suburb: "Orakei",
        price: "$3,500,000",
        bedrooms: 5,
        bathrooms: 4,
        floorArea: 350,
        landArea: 1200,
        propertyType: "residential",
        lotNumber: "Lot 1 DP 345678",
        certificateOfTitle: "CT 345678/123",
        zoning: "Residential",
        yearBuilt: 2020,
        imageUrl: "https://images.unsplash.com/photo-1613545325278-f24b0cae1224?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        description: "Exclusive luxury villa with water views",
        additionalImages: [
          "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1560448075-bb485b067938?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        views: 156,
        likes: 67,
        saves: 28,
        isLinzValidated: true,
        selfDeclaration: true,
        isActive: true
      }
    ];

    // Insert mock properties
    for (const property of mockProperties) {
      try {
        await db.insert(properties).values(property);
      } catch (error) {
        console.log("Property already exists or error:", error.message);
      }
    }

    this.seeded = true;
    console.log("Database seeded with beautiful mock properties!");
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property || undefined;
  }

  async getAllProperties(): Promise<Property[]> {
    try {
      const result = await db.select().from(properties).where(eq(properties.isActive, true));
      return result;
    } catch (error) {
      return [];
    }
  }

  async getPropertiesByType(type: string): Promise<Property[]> {
    return await db.select().from(properties).where(and(eq(properties.propertyType, type), eq(properties.isActive, true)));
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const [property] = await db.insert(properties).values(insertProperty).returning();
    return property;
  }

  async updatePropertyMetrics(id: string, views?: number, likes?: number, saves?: number): Promise<void> {
    const updates: any = {};
    if (views !== undefined) updates.views = views;
    if (likes !== undefined) updates.likes = likes;
    if (saves !== undefined) updates.saves = saves;
    
    if (Object.keys(updates).length > 0) {
      await db.update(properties).set(updates).where(eq(properties.id, id));
    }
  }

  async searchProperties(query: { suburb?: string; propertyType?: string; minPrice?: number; maxPrice?: number }): Promise<Property[]> {
    // For now, return all properties - we can add filtering later
    return await this.getAllProperties();
  }

  async findPropertyByAddressAndLot(address: string, lotNumber: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(
      and(eq(properties.address, address), eq(properties.lotNumber, lotNumber))
    );
    return property || undefined;
  }

  async createUserSwipe(insertSwipe: InsertUserSwipe): Promise<UserSwipe> {
    const [swipe] = await db.insert(userSwipes).values(insertSwipe).returning();
    return swipe;
  }

  async getUserSwipes(userId: string): Promise<UserSwipe[]> {
    return await db.select().from(userSwipes).where(eq(userSwipes.userId, userId));
  }

  async getUserSwipeCount(userId: string): Promise<number> {
    const swipes = await this.getUserSwipes(userId);
    return swipes.length;
  }

  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return prefs || undefined;
  }

  async createOrUpdateUserPreferences(insertPreferences: InsertUserPreferences): Promise<UserPreferences> {
    const existing = await this.getUserPreferences(insertPreferences.userId!);
    
    if (existing) {
      const [updated] = await db.update(userPreferences)
        .set({ ...insertPreferences, updatedAt: new Date() })
        .where(eq(userPreferences.userId, insertPreferences.userId!))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(userPreferences).values(insertPreferences).returning();
      return created;
    }
  }

  async createPurchaseOrder(insertOrder: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const [order] = await db.insert(purchaseOrders).values(insertOrder).returning();
    return order;
  }

  async getUserPurchaseOrders(userId: string): Promise<PurchaseOrder[]> {
    return await db.select().from(purchaseOrders).where(eq(purchaseOrders.userId, userId));
  }

  async updatePurchaseOrderStatus(id: string, status: string): Promise<void> {
    const updates: any = { status };
    if (status === 'completed') {
      updates.completedAt = new Date();
    }
    await db.update(purchaseOrders).set(updates).where(eq(purchaseOrders.id, id));
  }

  // Service Providers
  async createServiceProvider(insertProvider: InsertServiceProvider): Promise<ServiceProvider> {
    const [provider] = await db.insert(serviceProviders).values(insertProvider).returning();
    return provider;
  }

  async getAllServiceProviders(): Promise<ServiceProvider[]> {
    return await db.select().from(serviceProviders);
  }

  async getServiceProvidersByCategory(category: string): Promise<ServiceProvider[]> {
    return await db.select().from(serviceProviders)
      .where(and(eq(serviceProviders.category, category), eq(serviceProviders.status, 'approved'), eq(serviceProviders.isActive, true)));
  }

  async getServiceProviderById(id: string): Promise<ServiceProvider | undefined> {
    const [provider] = await db.select().from(serviceProviders).where(eq(serviceProviders.id, id));
    return provider || undefined;
  }

  async updateServiceProviderStatus(id: string, status: string, reviewNotes?: string): Promise<void> {
    const updates: any = { 
      status, 
      reviewedAt: new Date(),
      updatedAt: new Date()
    };
    if (reviewNotes) updates.reviewNotes = reviewNotes;
    await db.update(serviceProviders).set(updates).where(eq(serviceProviders.id, id));
  }

  async getApprovedServiceProviders(): Promise<ServiceProvider[]> {
    return await db.select().from(serviceProviders)
      .where(and(eq(serviceProviders.status, 'approved'), eq(serviceProviders.isActive, true)));
  }

  // Property Management
  async getUserProperties(userId: string): Promise<Property[]> {
    return await db.select().from(properties)
      .where(and(eq(properties.userId, userId), eq(properties.isActive, true)));
  }

  async updateProperty(id: string, data: Partial<InsertProperty>): Promise<Property> {
    const [updatedProperty] = await db.update(properties)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return updatedProperty;
  }

  async softDeleteProperty(id: string): Promise<void> {
    await db.update(properties)
      .set({ 
        isActive: false, 
        updatedAt: new Date() 
      })
      .where(eq(properties.id, id));
  }

  // Password Reset Methods
  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
      used: false,
    });
  }

  async validatePasswordResetToken(token: string): Promise<{ userId: string } | null> {
    const [resetToken] = await db.select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          eq(passwordResetTokens.used, false)
        )
      );

    if (!resetToken) return null;

    // Check if token has expired
    if (new Date() > resetToken.expiresAt) {
      return null;
    }

    return { userId: resetToken.userId };
  }

  async markTokenAsUsed(token: string): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  async cleanupExpiredTokens(): Promise<void> {
    await db.delete(passwordResetTokens)
      .where(sql`expires_at < NOW()`);
  }

  // Pricing Plans
  async getAllPricingPlans(): Promise<PricingPlan[]> {
    return await db.select().from(pricingPlans);
  }

  async getActivePricingPlans(): Promise<PricingPlan[]> {
    return await db.select().from(pricingPlans)
      .where(eq(pricingPlans.isActive, true))
      .orderBy(pricingPlans.sortOrder);
  }

  // ===== OFFER SYSTEM METHODS =====

  // Offer Methods
  async createOffer(offer: InsertOffer): Promise<Offer> {
    const [newOffer] = await db.insert(offers)
      .values({
        ...offer,
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return newOffer;
  }

  async getOffer(id: string): Promise<Offer | undefined> {
    const [offer] = await db.select().from(offers)
      .where(eq(offers.id, id));
    return offer;
  }

  async getOffersForProperty(propertyId: string): Promise<Offer[]> {
    return await db.select().from(offers)
      .where(eq(offers.propertyId, propertyId))
      .orderBy(offers.createdAt);
  }

  async updateOfferStatus(id: string, status: string): Promise<void> {
    await db.update(offers)
      .set({ status, updatedAt: new Date() })
      .where(eq(offers.id, id));
  }

  // Draft Document Methods
  async createDraftDocument(document: InsertDraftDocument): Promise<DraftDocument> {
    const [newDocument] = await db.insert(draftDocuments)
      .values({
        ...document,
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return newDocument;
  }

  async getDraftDocument(id: string): Promise<DraftDocument | undefined> {
    const [document] = await db.select().from(draftDocuments)
      .where(eq(draftDocuments.id, id));
    return document;
  }

  async getDraftDocumentsByOffer(offerId: string): Promise<DraftDocument[]> {
    return await db.select().from(draftDocuments)
      .where(eq(draftDocuments.offerId, offerId))
      .orderBy(draftDocuments.version);
  }

  async updateDraftDocumentContent(id: string, content: string): Promise<void> {
    await db.update(draftDocuments)
      .set({ documentContent: content, updatedAt: new Date() })
      .where(eq(draftDocuments.id, id));
  }

  // Lawyer Review Methods
  async createLawyerReview(review: InsertLawyerReview): Promise<LawyerReview> {
    const [newReview] = await db.insert(lawyerReviews)
      .values({
        ...review,
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return newReview;
  }

  async getLawyerReview(id: string): Promise<LawyerReview | undefined> {
    const [review] = await db.select().from(lawyerReviews)
      .where(eq(lawyerReviews.id, id));
    return review;
  }

  async getLawyerReviewsByDocument(documentId: string): Promise<LawyerReview[]> {
    return await db.select().from(lawyerReviews)
      .where(eq(lawyerReviews.draftDocumentId, documentId))
      .orderBy(lawyerReviews.createdAt);
  }

  async updateLawyerReviewStatus(id: string, status: string, notes?: string): Promise<void> {
    await db.update(lawyerReviews)
      .set({ 
        reviewStatus: status, 
        reviewNotes: notes,
        reviewCompletedAt: status === 'completed' ? new Date() : undefined,
        updatedAt: new Date() 
      })
      .where(eq(lawyerReviews.id, id));
  }

  // ===== USER PROFILE METHODS =====

  // Get all offers made by a user
  async getUserOffers(userId: string): Promise<Offer[]> {
    return await db.select().from(offers)
      .where(eq(offers.buyerId, userId))
      .orderBy(offers.createdAt);
  }

  // Get all draft documents for a user's offers
  async getUserDraftDocuments(userId: string): Promise<DraftDocument[]> {
    return await db.select({
      id: draftDocuments.id,
      offerId: draftDocuments.offerId,
      documentType: draftDocuments.documentType,
      documentContent: draftDocuments.documentContent,
      pdfUrl: draftDocuments.pdfUrl,
      docxUrl: draftDocuments.docxUrl,
      version: draftDocuments.version,
      isLatestVersion: draftDocuments.isLatestVersion,
      status: draftDocuments.status,
      createdAt: draftDocuments.createdAt,
      updatedAt: draftDocuments.updatedAt,
    })
    .from(draftDocuments)
    .innerJoin(offers, eq(draftDocuments.offerId, offers.id))
    .where(eq(offers.buyerId, userId))
    .orderBy(draftDocuments.createdAt);
  }

  // Get all offers received by a seller
  async getSellerOffers(sellerId: string): Promise<Offer[]> {
    return await db.select().from(offers)
      .where(eq(offers.sellerId, sellerId))
      .orderBy(offers.createdAt);
  }

  // Property Metrics Methods
  async incrementPropertyViews(propertyId: string): Promise<void> {
    await db.update(properties)
      .set({ 
        views: sql`${properties.views} + 1`,
        updatedAt: new Date()
      })
      .where(eq(properties.id, propertyId));
  }

  async incrementPropertyLikes(propertyId: string): Promise<Property> {
    const [property] = await db.update(properties)
      .set({ 
        likes: sql`${properties.likes} + 1`,
        updatedAt: new Date()
      })
      .where(eq(properties.id, propertyId))
      .returning();
    return property;
  }

  async incrementPropertySaves(propertyId: string): Promise<Property> {
    const [property] = await db.update(properties)
      .set({ 
        saves: sql`${properties.saves} + 1`,
        updatedAt: new Date()
      })
      .where(eq(properties.id, propertyId))
      .returning();
    return property;
  }
}

export const storage = new DatabaseStorage();

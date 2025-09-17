import { type User, type InsertUser, type Property, type InsertProperty, type UserSwipe, type InsertUserSwipe, type UserPreferences, type InsertUserPreferences, type PurchaseOrder, type InsertPurchaseOrder, type ServiceProvider, type InsertServiceProvider, type PricingPlan, type InsertPricingPlan, type Offer, type InsertOffer, type DraftDocument, type InsertDraftDocument, type LawyerReview, type InsertLawyerReview, type Transaction, type InsertTransaction, type StripeEvent, type InsertStripeEvent, type ServiceOrder, type InsertServiceOrder, type PropertyEvent, type InsertPropertyEvent, type EngagementEvent, type InsertEngagementEvent, type OperatingCost, type InsertOperatingCost, type DailyMetrics, type InsertDailyMetrics, users, properties, userSwipes, userPreferences, purchaseOrders, serviceProviders, passwordResetTokens, pricingPlans, offers, draftDocuments, lawyerReviews, transactions, stripeEvents, serviceOrders, propertyEvents, engagementEvents, operatingCosts, dailyMetrics } from "@shared/schema";
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

  // User Storage Management
  getUserStorageStats(userId: string): Promise<{
    videoUsed: number;
    audioUsed: number;
    videoLimit: number;
    audioLimit: number;
    hasVideoUpgrade: boolean;
    hasAudioUpgrade: boolean;
  }>;
  checkStorageLimit(userId: string, fileSize: number, fileType: 'video' | 'audio'): Promise<{
    canUpload: boolean;
    exceededBy: number;
    currentUsage: number;
    limit: number;
  }>;
  updateUserStorage(userId: string, videoSize?: number, audioSize?: number): Promise<void>;
  purchaseStorageUpgrade(userId: string, upgradeType: 'video' | 'audio'): Promise<void>;

  // User Profile Methods
  getUserOffers(userId: string): Promise<Offer[]>;
  getUserDraftDocuments(userId: string): Promise<DraftDocument[]>;
  getSellerOffers(sellerId: string): Promise<Offer[]>; // Get offers received by seller

  // Property Metrics Methods
  incrementPropertyViews(propertyId: string): Promise<void>;
  incrementPropertyLikes(propertyId: string): Promise<Property>;
  incrementPropertySaves(propertyId: string): Promise<Property>;

  // Analytics Methods for Admin Dashboard
  // Overview Analytics
  getOverviewMetrics(fromDate?: string, toDate?: string): Promise<{
    totalUsers: number;
    totalProperties: number;
    totalTransactions: number;
    totalRevenueCents: number;
    activeServiceProviders: number;
    recentTransactions: any[];
    userGrowthData: any[];
    revenueGrowthData: any[];
  }>;

  // P&L Analytics
  getProfitLossData(fromDate?: string, toDate?: string): Promise<{
    totalRevenueCents: number;
    totalExpensesCents: number;
    netProfitCents: number;
    platformFeesCents: number;
    revenueByCategory: any[];
    expensesByCategory: any[];
    monthlyTrends: any[];
  }>;

  // Property Funnel Analytics
  getPropertyFunnelData(fromDate?: string, toDate?: string): Promise<{
    totalProperties: number;
    totalViews: number;
    totalLikes: number;
    totalOffers: number;
    totalSold: number;
    conversionRates: any[];
    funnelBySuburb: any[];
    averagePriceByStage: any[];
  }>;

  // Service Provider Performance
  getServiceProviderPerformance(fromDate?: string, toDate?: string): Promise<{
    totalProviders: number;
    activeProviders: number;
    pendingApplications: number;
    totalServiceOrders: number;
    totalServiceRevenueCents: number;
    providersByCategory: any[];
    topPerformers: any[];
    approvalMetrics: any[];
  }>;

  // User Engagement Analytics
  getUserEngagementData(fromDate?: string, toDate?: string): Promise<{
    totalUsers: number;
    activeUsers: number;
    newSignups: number;
    retentionRate: number;
    averageSessionsPerUser: number;
    engagementByEventType: any[];
    cohortAnalysis: any[];
    userAcquisitionChannels: any[];
  }>;

  // Transaction History with Filtering
  getTransactionHistory(
    page?: number,
    limit?: number,
    filters?: {
      type?: string;
      category?: string;
      fromDate?: string;
      toDate?: string;
      userId?: string;
      providerId?: string;
    }
  ): Promise<{
    transactions: any[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }>;

  // Operating Costs Management
  createOperatingCost(cost: {
    category: string;
    description: string;
    costCents: number;
    periodStart: string;
    periodEnd: string;
    notes?: string;
  }, addedBy: string): Promise<any>;

  getOperatingCosts(fromDate?: string, toDate?: string): Promise<any[]>;

  // Daily Metrics Management
  getDailyMetrics(fromDate?: string, toDate?: string): Promise<any[]>;
  createOrUpdateDailyMetrics(date: string, metrics: any): Promise<any>;
}


export class DatabaseStorage implements IStorage {
  private seeded = false;

  private async seedDatabase() {
    if (this.seeded) return;
    
    // SECURITY CHECK: Prevent demo seeding in production environment
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      console.info('🔒 Production environment detected: Demo user seeding disabled for security');
      this.seeded = true;
      return;
    }
    
    // Security warning for development/staging environments
    console.warn('⚠️  DEVELOPMENT MODE: Demo user seeding enabled. This should NEVER happen in production!');
    
    // Create demo user first (development only)
    let demoUser;
    try {
      demoUser = await this.getUserByEmail("demo@example.com");
      if (!demoUser) {
        // Import hash function to properly secure the demo password
        const { scrypt, randomBytes } = await import("crypto");
        const { promisify } = await import("util");
        const scryptAsync = promisify(scrypt);
        
        // Hash the demo password properly (same logic as auth.ts)
        const salt = randomBytes(16).toString("hex");
        const buf = (await scryptAsync("demo123", salt, 64)) as Buffer;
        const hashedPassword = `${buf.toString("hex")}.${salt}`;
        
        demoUser = await this.createUser({
          email: "demo@example.com",
          name: "Demo User",
          password: hashedPassword
        });
        
        console.log('🔐 Demo user created with hashed password (development only)');
      } else {
        console.log('📋 Demo user already exists, skipping creation');
      }
    } catch (error) {
      console.error('❌ Error creating demo user:', error instanceof Error ? error.message : 'Unknown error');
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
        console.log("Property already exists or error:", error instanceof Error ? error.message : 'Unknown error');
      }
    }

    this.seeded = true;
    console.log("🏡 Database seeded with mock properties (development only)");
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
    const insertData = {
      ...insertProperty,
      additionalImages: insertProperty.additionalImages || []
    };
    const [property] = await db.insert(properties).values(insertData).returning();
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
      const updateData = {
        ...insertPreferences,
        updatedAt: new Date(),
        preferredPropertyTypes: insertPreferences.preferredPropertyTypes || [],
        preferredSuburbs: insertPreferences.preferredSuburbs || []
      };
      const [updated] = await db.update(userPreferences)
        .set(updateData)
        .where(eq(userPreferences.userId, insertPreferences.userId!))
        .returning();
      return updated;
    } else {
      const insertData = {
        ...insertPreferences,
        preferredPropertyTypes: insertPreferences.preferredPropertyTypes || [],
        preferredSuburbs: insertPreferences.preferredSuburbs || []
      };
      const [created] = await db.insert(userPreferences).values(insertData).returning();
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
    const insertData = {
      ...insertProvider,
      certifications: insertProvider.certifications || [],
      servicesOffered: insertProvider.servicesOffered || [],
      serviceAreas: insertProvider.serviceAreas || []
    };
    const [provider] = await db.insert(serviceProviders).values(insertData).returning();
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
    const updateData = {
      ...data,
      updatedAt: new Date(),
      additionalImages: data.additionalImages || []
    };
    const [updatedProperty] = await db.update(properties)
      .set(updateData)
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

  // ===== USER STORAGE MANAGEMENT =====

  // Get user storage statistics
  async getUserStorageStats(userId: string): Promise<{
    videoUsed: number;
    audioUsed: number;
    videoLimit: number;
    audioLimit: number;
    hasVideoUpgrade: boolean;
    hasAudioUpgrade: boolean;
  }> {
    const [user] = await db.select({
      videoStorageUsed: users.videoStorageUsed,
      audioStorageUsed: users.audioStorageUsed,
      videoStorageLimit: users.videoStorageLimit,
      audioStorageLimit: users.audioStorageLimit,
      hasVideoStorageUpgrade: users.hasVideoStorageUpgrade,
      hasAudioStorageUpgrade: users.hasAudioStorageUpgrade,
    }).from(users).where(eq(users.id, userId));

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    return {
      videoUsed: user.videoStorageUsed || 0,
      audioUsed: user.audioStorageUsed || 0,
      videoLimit: user.videoStorageLimit || 157286400, // 150MB
      audioLimit: user.audioStorageLimit || 20971520,  // 20MB
      hasVideoUpgrade: user.hasVideoStorageUpgrade || false,
      hasAudioUpgrade: user.hasAudioStorageUpgrade || false,
    };
  }

  // Check if user can upload a file of given size
  async checkStorageLimit(userId: string, fileSize: number, fileType: 'video' | 'audio'): Promise<{
    canUpload: boolean;
    exceededBy: number;
    currentUsage: number;
    limit: number;
  }> {
    const stats = await this.getUserStorageStats(userId);
    
    const currentUsage = fileType === 'video' ? stats.videoUsed : stats.audioUsed;
    const limit = fileType === 'video' ? stats.videoLimit : stats.audioLimit;
    
    const newUsage = currentUsage + fileSize;
    const canUpload = newUsage <= limit;
    const exceededBy = Math.max(0, newUsage - limit);

    return {
      canUpload,
      exceededBy,
      currentUsage,
      limit
    };
  }

  // Update user storage usage
  async updateUserStorage(userId: string, videoSize?: number, audioSize?: number): Promise<void> {
    const updateData: any = { updatedAt: new Date() };

    if (videoSize !== undefined) {
      updateData.videoStorageUsed = sql`${users.videoStorageUsed} + ${videoSize}`;
    }
    
    if (audioSize !== undefined) {
      updateData.audioStorageUsed = sql`${users.audioStorageUsed} + ${audioSize}`;
    }

    await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId));
  }

  // Purchase storage upgrade for user
  async purchaseStorageUpgrade(userId: string, upgradeType: 'video' | 'audio'): Promise<void> {
    const updateData: any = { updatedAt: new Date() };
    
    if (upgradeType === 'video') {
      // Add 150MB (157286400 bytes) to video limit and mark as upgraded
      updateData.videoStorageLimit = sql`${users.videoStorageLimit} + 157286400`;
      updateData.hasVideoStorageUpgrade = true;
    } else if (upgradeType === 'audio') {
      // Add 50MB (52428800 bytes) to audio limit and mark as upgraded  
      updateData.audioStorageLimit = sql`${users.audioStorageLimit} + 52428800`;
      updateData.hasAudioStorageUpgrade = true;
    }

    await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId));
  }

  // ===== ANALYTICS METHODS FOR ADMIN DASHBOARD =====

  async getOverviewMetrics(fromDate?: string, toDate?: string): Promise<{
    totalUsers: number;
    totalProperties: number;
    totalTransactions: number;
    totalRevenueCents: number;
    activeServiceProviders: number;
    recentTransactions: any[];
    userGrowthData: any[];
    revenueGrowthData: any[];
  }> {
    // Build date filter conditions
    const dateConditions = [];
    if (fromDate) dateConditions.push(sql`${users.createdAt} >= ${fromDate}`);
    if (toDate) dateConditions.push(sql`${users.createdAt} <= ${toDate}`);

    // Get basic counts
    const [usersCount] = await db.select({ count: sql`COUNT(*)::int` }).from(users);
    const [propertiesCount] = await db.select({ count: sql`COUNT(*)::int` }).from(properties);
    const [providersCount] = await db.select({ count: sql`COUNT(*)::int` }).from(serviceProviders).where(eq(serviceProviders.status, 'approved'));

    // Get transaction metrics
    const transactionMetrics = await db
      .select({
        totalTransactions: sql`COUNT(*)::int`,
        totalRevenue: sql`COALESCE(SUM(${transactions.amountCents}), 0)::int`
      })
      .from(transactions)
      .where(and(
        eq(transactions.type, 'revenue'),
        fromDate ? sql`${transactions.occurredAt} >= ${fromDate}` : sql`1=1`,
        toDate ? sql`${transactions.occurredAt} <= ${toDate}` : sql`1=1`
      ));

    // Get recent transactions
    const recentTransactions = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        amountCents: transactions.amountCents,
        description: transactions.description,
        occurredAt: transactions.occurredAt,
      })
      .from(transactions)
      .orderBy(sql`${transactions.occurredAt} DESC`)
      .limit(10);

    return {
      totalUsers: usersCount.count || 0,
      totalProperties: propertiesCount.count || 0,
      totalTransactions: transactionMetrics[0]?.totalTransactions || 0,
      totalRevenueCents: transactionMetrics[0]?.totalRevenue || 0,
      activeServiceProviders: providersCount.count || 0,
      recentTransactions: recentTransactions || [],
      userGrowthData: [], // TODO: Implement time series data
      revenueGrowthData: [], // TODO: Implement time series data
    };
  }

  async getProfitLossData(fromDate?: string, toDate?: string): Promise<{
    totalRevenueCents: number;
    totalExpensesCents: number;
    netProfitCents: number;
    platformFeesCents: number;
    revenueByCategory: any[];
    expensesByCategory: any[];
    monthlyTrends: any[];
  }> {
    // Build date conditions
    const dateFilter = and(
      fromDate ? sql`${transactions.occurredAt} >= ${fromDate}` : sql`1=1`,
      toDate ? sql`${transactions.occurredAt} <= ${toDate}` : sql`1=1`
    );

    // Get revenue data
    const revenueData = await db
      .select({
        category: transactions.category,
        total: sql`COALESCE(SUM(${transactions.amountCents}), 0)::int`,
        totalFees: sql`COALESCE(SUM(${transactions.feeCents}), 0)::int`
      })
      .from(transactions)
      .where(and(eq(transactions.type, 'revenue'), dateFilter))
      .groupBy(transactions.category);

    // Get expenses data
    const expensesData = await db
      .select({
        category: transactions.category,
        total: sql`COALESCE(SUM(${transactions.amountCents}), 0)::int`
      })
      .from(transactions)
      .where(and(eq(transactions.type, 'expense'), dateFilter))
      .groupBy(transactions.category);

    // Get operating costs
    const operatingCostsData = await db
      .select({
        category: operatingCosts.category,
        total: sql`COALESCE(SUM(${operatingCosts.costCents}), 0)::int`
      })
      .from(operatingCosts)
      .where(and(
        fromDate ? sql`${operatingCosts.periodStart} >= ${fromDate}` : sql`1=1`,
        toDate ? sql`${operatingCosts.periodEnd} <= ${toDate}` : sql`1=1`
      ))
      .groupBy(operatingCosts.category);

    const totalRevenueCents = revenueData.reduce((sum, item) => sum + (item.total || 0), 0);
    const totalExpensesCents = expensesData.reduce((sum, item) => sum + (item.total || 0), 0) +
                               operatingCostsData.reduce((sum, item) => sum + (item.total || 0), 0);
    const platformFeesCents = revenueData.reduce((sum, item) => sum + (item.totalFees || 0), 0);
    const netProfitCents = totalRevenueCents - totalExpensesCents;

    return {
      totalRevenueCents,
      totalExpensesCents,
      netProfitCents,
      platformFeesCents,
      revenueByCategory: revenueData,
      expensesByCategory: [...expensesData, ...operatingCostsData],
      monthlyTrends: [], // TODO: Implement monthly trend analysis
    };
  }

  async getPropertyFunnelData(fromDate?: string, toDate?: string): Promise<{
    totalProperties: number;
    totalViews: number;
    totalLikes: number;
    totalOffers: number;
    totalSold: number;
    conversionRates: any[];
    funnelBySuburb: any[];
    averagePriceByStage: any[];
  }> {
    // Property metrics
    const propertyMetrics = await db
      .select({
        totalProperties: sql`COUNT(*)::int`,
        totalViews: sql`COALESCE(SUM(${properties.views}), 0)::int`,
        totalLikes: sql`COALESCE(SUM(${properties.likes}), 0)::int`,
      })
      .from(properties)
      .where(eq(properties.isActive, true));

    // Offers count
    const [offersCount] = await db
      .select({ count: sql`COUNT(*)::int` })
      .from(offers)
      .where(fromDate ? sql`${offers.createdAt} >= ${fromDate}` : sql`1=1`);

    // Properties by suburb
    const suburbMetrics = await db
      .select({
        suburb: properties.suburb,
        count: sql`COUNT(*)::int`,
        avgViews: sql`AVG(${properties.views})::int`,
        avgLikes: sql`AVG(${properties.likes})::int`,
      })
      .from(properties)
      .where(eq(properties.isActive, true))
      .groupBy(properties.suburb)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);

    const metrics = propertyMetrics[0] || { totalProperties: 0, totalViews: 0, totalLikes: 0 };

    return {
      totalProperties: metrics.totalProperties,
      totalViews: metrics.totalViews,
      totalLikes: metrics.totalLikes,
      totalOffers: offersCount?.count || 0,
      totalSold: 0, // TODO: Implement sold properties tracking
      conversionRates: [
        { stage: 'Views to Likes', rate: metrics.totalViews > 0 ? (metrics.totalLikes / metrics.totalViews * 100).toFixed(2) : '0' },
        { stage: 'Likes to Offers', rate: metrics.totalLikes > 0 ? ((offersCount?.count || 0) / metrics.totalLikes * 100).toFixed(2) : '0' },
      ],
      funnelBySuburb: suburbMetrics,
      averagePriceByStage: [], // TODO: Implement price analysis by stage
    };
  }

  async getServiceProviderPerformance(fromDate?: string, toDate?: string): Promise<{
    totalProviders: number;
    activeProviders: number;
    pendingApplications: number;
    totalServiceOrders: number;
    totalServiceRevenueCents: number;
    providersByCategory: any[];
    topPerformers: any[];
    approvalMetrics: any[];
  }> {
    // Provider counts by status
    const providerStats = await db
      .select({
        status: serviceProviders.status,
        count: sql`COUNT(*)::int`
      })
      .from(serviceProviders)
      .groupBy(serviceProviders.status);

    // Providers by category
    const categoryStats = await db
      .select({
        category: serviceProviders.category,
        count: sql`COUNT(*)::int`
      })
      .from(serviceProviders)
      .where(eq(serviceProviders.status, 'approved'))
      .groupBy(serviceProviders.category);

    const totalProviders = providerStats.reduce((sum, item) => sum + item.count, 0);
    const activeProviders = providerStats.find(p => p.status === 'approved')?.count || 0;
    const pendingApplications = providerStats.find(p => p.status === 'pending')?.count || 0;

    return {
      totalProviders,
      activeProviders,
      pendingApplications,
      totalServiceOrders: 0, // TODO: Implement when service orders are being created
      totalServiceRevenueCents: 0, // TODO: Implement service revenue tracking
      providersByCategory: categoryStats,
      topPerformers: [], // TODO: Implement performance metrics
      approvalMetrics: providerStats,
    };
  }

  async getUserEngagementData(fromDate?: string, toDate?: string): Promise<{
    totalUsers: number;
    activeUsers: number;
    newSignups: number;
    retentionRate: number;
    averageSessionsPerUser: number;
    engagementByEventType: any[];
    cohortAnalysis: any[];
    userAcquisitionChannels: any[];
  }> {
    // User counts
    const [totalUsers] = await db.select({ count: sql`COUNT(*)::int` }).from(users);
    
    // New signups in date range
    const newSignups = await db
      .select({ count: sql`COUNT(*)::int` })
      .from(users)
      .where(and(
        fromDate ? sql`${users.createdAt} >= ${fromDate}` : sql`1=1`,
        toDate ? sql`${users.createdAt} <= ${toDate}` : sql`1=1`
      ));

    return {
      totalUsers: totalUsers.count || 0,
      activeUsers: 0, // TODO: Implement based on engagement events
      newSignups: newSignups[0]?.count || 0,
      retentionRate: 0, // TODO: Implement retention calculation
      averageSessionsPerUser: 0, // TODO: Implement session tracking
      engagementByEventType: [], // TODO: Implement based on engagement events
      cohortAnalysis: [], // TODO: Implement cohort analysis
      userAcquisitionChannels: [], // TODO: Implement acquisition tracking
    };
  }

  async getTransactionHistory(
    page: number = 1,
    limit: number = 50,
    filters?: {
      type?: string;
      category?: string;
      fromDate?: string;
      toDate?: string;
      userId?: string;
      providerId?: string;
    }
  ): Promise<{
    transactions: any[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    // Build filter conditions
    const conditions = [];
    if (filters?.type) conditions.push(eq(transactions.type, filters.type));
    if (filters?.category) conditions.push(eq(transactions.category, filters.category));
    if (filters?.fromDate) conditions.push(sql`${transactions.occurredAt} >= ${filters.fromDate}`);
    if (filters?.toDate) conditions.push(sql`${transactions.occurredAt} <= ${filters.toDate}`);
    if (filters?.userId) conditions.push(eq(transactions.userId, filters.userId));
    if (filters?.providerId) conditions.push(eq(transactions.providerId, filters.providerId));

    const whereClause = conditions.length > 0 ? and(...conditions) : sql`1=1`;

    // Get total count
    const [totalCount] = await db
      .select({ count: sql`COUNT(*)::int` })
      .from(transactions)
      .where(whereClause);

    // Get paginated transactions
    const offset = (page - 1) * limit;
    const transactionsList = await db
      .select()
      .from(transactions)
      .where(whereClause)
      .orderBy(sql`${transactions.occurredAt} DESC`)
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil((totalCount.count || 0) / limit);

    return {
      transactions: transactionsList,
      totalCount: totalCount.count || 0,
      totalPages,
      currentPage: page,
    };
  }

  async createOperatingCost(cost: {
    category: string;
    description: string;
    costCents: number;
    periodStart: string;
    periodEnd: string;
    notes?: string;
  }, addedBy: string): Promise<any> {
    const [operatingCost] = await db.insert(operatingCosts).values({
      ...cost,
      addedBy,
      periodStart: new Date(cost.periodStart),
      periodEnd: new Date(cost.periodEnd),
    }).returning();

    return operatingCost;
  }

  async getOperatingCosts(fromDate?: string, toDate?: string): Promise<any[]> {
    return await db
      .select()
      .from(operatingCosts)
      .where(and(
        fromDate ? sql`${operatingCosts.periodStart} >= ${fromDate}` : sql`1=1`,
        toDate ? sql`${operatingCosts.periodEnd} <= ${toDate}` : sql`1=1`
      ))
      .orderBy(sql`${operatingCosts.createdAt} DESC`);
  }

  async getDailyMetrics(fromDate?: string, toDate?: string): Promise<any[]> {
    return await db
      .select()
      .from(dailyMetrics)
      .where(and(
        fromDate ? sql`${dailyMetrics.date} >= ${fromDate}` : sql`1=1`,
        toDate ? sql`${dailyMetrics.date} <= ${toDate}` : sql`1=1`
      ))
      .orderBy(sql`${dailyMetrics.date} DESC`);
  }

  async createOrUpdateDailyMetrics(date: string, metrics: any): Promise<any> {
    // Try to update first, then insert if not exists
    const existing = await db
      .select({ id: dailyMetrics.id })
      .from(dailyMetrics)
      .where(eq(dailyMetrics.date, date))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      const [updated] = await db
        .update(dailyMetrics)
        .set({ ...metrics, updatedAt: new Date() })
        .where(eq(dailyMetrics.date, date))
        .returning();
      return updated;
    } else {
      // Insert new
      const [created] = await db
        .insert(dailyMetrics)
        .values({ date, ...metrics })
        .returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();

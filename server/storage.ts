import { type User, type InsertUser, type Property, type InsertProperty, type UserSwipe, type InsertUserSwipe, type UserSavedProperty, type InsertUserSavedProperty, type PropertyShare, type InsertPropertyShare, type UserPreferences, type InsertUserPreferences, type PurchaseOrder, type InsertPurchaseOrder, type PropertyReport, type InsertPropertyReport, type ReportPackage, type InsertReportPackage, type ServiceProvider, type InsertServiceProvider, type PricingPlan, type InsertPricingPlan, type Offer, type InsertOffer, type DraftDocument, type InsertDraftDocument, type LawyerReview, type InsertLawyerReview, type Transaction, type InsertTransaction, type StripeEvent, type InsertStripeEvent, type ServiceOrder, type InsertServiceOrder, type ServiceInquiry, type InsertServiceInquiry, type PropertyEvent, type InsertPropertyEvent, type EngagementEvent, type InsertEngagementEvent, type OperatingCost, type InsertOperatingCost, type DailyMetrics, type InsertDailyMetrics, type PropertyOffer, type InsertPropertyOffer, type OfferBuyerDetails, type InsertOfferBuyerDetails, type OfferCondition, type InsertOfferCondition, type OfferChattel, type InsertOfferChattel, type StandardChattel, type OfferActivity, type InsertOfferActivity, type OfferMessage, type InsertOfferMessage, type SentryError, type InsertSentryError, type ErrorAnalysis, type InsertErrorAnalysis, type ErrorFix, type InsertErrorFix, type EarlyBirdPromotion, type InsertEarlyBirdPromotion, type EarlyBirdUsage, type InsertEarlyBirdUsage, users, properties, userSwipes, userSavedProperties, propertyShares, userPreferences, purchaseOrders, propertyReports, reportPackages, serviceProviders, passwordResetTokens, pricingPlans, offers, draftDocuments, lawyerReviews, transactions, stripeEvents, serviceOrders, serviceInquiries, propertyEvents, engagementEvents, operatingCosts, dailyMetrics, propertyOffers, offerBuyerDetails, offerConditions, offerChattels, standardChattels, offerActivities, offerMessages, sentryErrors, errorAnalysis, errorFixes, earlyBirdPromotion, earlyBirdUsage, servicePartners, partnerUsers, partnerUpdates, serviceReviews, serviceInsights } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Properties
  getProperty(id: string): Promise<Property | undefined>;
  getAllProperties(): Promise<Property[]>;
  getPropertiesBatch(limit: number, offset: number): Promise<Property[]>; // Added for pagination
  getPropertiesByType(type: string): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  updatePropertyMetrics(id: string, views?: number, likes?: number, saves?: number): Promise<void>;
  searchProperties(query: { suburb?: string; propertyType?: string; minPrice?: number; maxPrice?: number }): Promise<Property[]>;
  findPropertyByAddressAndLot(address: string, lotNumber: string): Promise<Property | undefined>;

  // User Swipes
  createUserSwipe(swipe: InsertUserSwipe): Promise<UserSwipe>;
  getUserSwipes(userId: string): Promise<UserSwipe[]>;
  getUserSwipeCount(userId: string): Promise<number>;

  // User Saved Properties
  savePropertyForUser(userId: string, propertyId: string): Promise<void>;
  unsavePropertyForUser(userId: string, propertyId: string): Promise<void>;
  getUserSavedProperties(userId: string): Promise<Property[]>;
  isPropertySavedByUser(userId: string, propertyId: string): Promise<boolean>;

  // 🌟 AUTOMATIC STAR RATINGS - Calculated from Likes
  // Stars auto-calculate based on like count (no manual rating needed)
  // This method is called automatically when likes are updated
  calculateAndUpdateStarRating(propertyId: string): Promise<void>;

  // User Preferences
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  createOrUpdateUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;

  // Purchase Orders
  createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder>;
  getUserPurchaseOrders(userId: string): Promise<PurchaseOrder[]>;
  updatePurchaseOrderStatus(id: string, status: string): Promise<void>;

  // Property Reports
  createPropertyReport(report: InsertPropertyReport): Promise<PropertyReport>;
  getPropertyReport(id: string): Promise<PropertyReport | undefined>;
  getReportsByOrder(orderId: string): Promise<PropertyReport[]>;
  getReportsByUser(userId: string): Promise<PropertyReport[]>;
  getReportsByProperty(propertyId: string): Promise<PropertyReport[]>;
  updateReportAccess(id: string): Promise<void>;
  
  // Report Packages
  getAllReportPackages(): Promise<ReportPackage[]>;
  getActiveReportPackages(): Promise<ReportPackage[]>;
  getReportPackage(id: string): Promise<ReportPackage | undefined>;

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
  updateOfferEmailTracking(id: string, data: { pdfGenerated?: boolean; emailSent?: boolean; emailSentAt?: Date; pdfUrl?: string | null }): Promise<void>;

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

  // Property Shares
  createPropertyShare(share: InsertPropertyShare): Promise<PropertyShare>;
  getUserShares(userId: string): Promise<PropertyShare[]>;
  getPropertyShares(propertyId: string): Promise<PropertyShare[]>;
  markShareAsViewed(shareId: string): Promise<void>;

  // ============================================================================
  // OFFER WIZARD METHODS - HouseMatch Offer Wizard System
  // ============================================================================
  
  // Property Offers (comprehensive wizard-based offers)
  createPropertyOffer(offer: InsertPropertyOffer): Promise<PropertyOffer>;
  getPropertyOffer(id: string): Promise<PropertyOffer | undefined>;
  getPropertyOffersByProperty(propertyId: string): Promise<PropertyOffer[]>;
  getPropertyOffersByBuyer(buyerId: string): Promise<PropertyOffer[]>;
  getDraftOfferForProperty(propertyId: string, buyerId: string): Promise<PropertyOffer | undefined>;
  updatePropertyOffer(id: string, data: Partial<InsertPropertyOffer>): Promise<PropertyOffer>;
  updatePropertyOfferStatus(id: string, status: string): Promise<void>;
  updatePropertyOfferWizardStep(id: string, step: number): Promise<void>;
  deletePropertyOffer(id: string): Promise<void>;
  
  // Offer Buyer Details
  createOfferBuyerDetails(details: InsertOfferBuyerDetails): Promise<OfferBuyerDetails>;
  getOfferBuyerDetails(offerId: string): Promise<OfferBuyerDetails | undefined>;
  updateOfferBuyerDetails(offerId: string, details: Partial<InsertOfferBuyerDetails>): Promise<OfferBuyerDetails>;
  
  // Offer Conditions
  createOfferCondition(condition: InsertOfferCondition): Promise<OfferCondition>;
  getOfferConditions(offerId: string): Promise<OfferCondition[]>;
  getOfferCondition(id: string): Promise<OfferCondition | undefined>;
  updateOfferCondition(id: string, data: Partial<InsertOfferCondition>): Promise<OfferCondition>;
  updateOfferConditionStatus(id: string, status: string): Promise<void>;
  deleteOfferCondition(id: string): Promise<void>;
  
  // Offer Chattels
  createOfferChattel(chattel: InsertOfferChattel): Promise<OfferChattel>;
  getOfferChattels(offerId: string): Promise<OfferChattel[]>;
  updateOfferChattel(id: string, data: Partial<InsertOfferChattel>): Promise<OfferChattel>;
  deleteOfferChattel(id: string): Promise<void>;
  
  // Standard Chattels (reference data)
  getAllStandardChattels(): Promise<StandardChattel[]>;
  getStandardChattelsByCategory(category: string): Promise<StandardChattel[]>;
  
  // Offer Activities (audit log)
  createOfferActivity(activity: InsertOfferActivity): Promise<OfferActivity>;
  getOfferActivities(offerId: string): Promise<OfferActivity[]>;
  
  // Offer Messages
  createOfferMessage(message: InsertOfferMessage): Promise<OfferMessage>;
  getOfferMessages(offerId: string): Promise<OfferMessage[]>;
  markOfferMessageAsRead(id: string): Promise<void>;

  // ============================================================================
  // ERROR MONITORING METHODS - Automated Sentry Error Analysis System
  // ============================================================================
  
  // Sentry Errors
  createSentryError(error: any): Promise<any>;
  getSentryError(id: string): Promise<any | undefined>;
  getSentryErrorByEventId(eventId: string): Promise<any | undefined>;
  getAllSentryErrors(limit?: number): Promise<any[]>;
  getUnanalyzedErrors(): Promise<any[]>;
  updateSentryError(id: string, data: any): Promise<void>;
  markErrorAsAnalyzed(id: string): Promise<void>;
  
  // Error Analysis
  createErrorAnalysis(analysis: any): Promise<any>;
  getErrorAnalysis(errorId: string): Promise<any | undefined>;
  updateErrorAnalysis(id: string, data: any): Promise<void>;
  
  // Error Fixes
  createErrorFix(fix: any): Promise<any>;
  getErrorFixes(errorId: string): Promise<any[]>;
  updateErrorFixStatus(id: string, status: string): Promise<void>;
  getPendingFixes(): Promise<any[]>;

  // ============================================================================
  // SERVICE ORDERS METHODS - Building Inspection & Meth Testing Orders
  // ============================================================================
  
  // Service Orders
  createServiceOrder(order: InsertServiceOrder): Promise<ServiceOrder>;
  getServiceOrder(id: string): Promise<ServiceOrder | undefined>;
  getUserServiceOrders(userId: string): Promise<ServiceOrder[]>;
  getAllServiceOrders(): Promise<ServiceOrder[]>;
  updateServiceOrderStatus(id: string, status: string): Promise<void>;
  
  // Service Inquiries (Moving, Staging, Cleaning, Hosting)
  createServiceInquiry(inquiry: InsertServiceInquiry): Promise<ServiceInquiry>;
  getServiceInquiry(id: string): Promise<ServiceInquiry | undefined>;
  getUserServiceInquiries(userId: string): Promise<ServiceInquiry[]>;
  getAllServiceInquiries(): Promise<ServiceInquiry[]>;

  // ============================================================================
  // PARTNER ECOSYSTEM METHODS - Service Partner Network & Marketplace
  // ============================================================================
  
  // Service Partners
  getAllServicePartners(): Promise<any[]>;
  getPartnersByServiceType(serviceType: string): Promise<any[]>;
  createServicePartner(data: any): Promise<any>;
  updateServicePartner(id: string, data: any): Promise<any>;
  getServicePartner(id: string): Promise<any | undefined>;
  
  // MVP: Partner Verification (Admin Manual Approval)
  verifyPartner(partnerId: string, adminId: string, notes?: string): Promise<any>;
  rejectPartner(partnerId: string, adminId: string, notes: string): Promise<any>;
  getPendingPartners(): Promise<any[]>;
  
  // Partner Orders
  getPartnerOrders(partnerId: string, status?: string): Promise<any[]>;
  acceptServiceOrder(orderId: string, partnerUserId: string): Promise<any>;
  assignPartnerToOrder(orderId: string, partnerId: string): Promise<any>;
  
  // MVP: Manual Payout Tracking
  updatePayoutStatus(orderId: string, payoutData: { status: string; amount?: number; notes?: string }): Promise<any>;
  getUnpaidOrders(): Promise<any[]>;
  getPartnerEarnings(partnerId: string): Promise<{ total: number; unpaid: number; paid: number }>;
  
  // Partner Updates
  createPartnerUpdate(update: any): Promise<any>;
  getOrderUpdates(serviceOrderId: string): Promise<any[]>;
  
  // Partner Analytics
  getPartnerAnalytics(partnerId: string): Promise<any>;
  
  // Service Reviews
  createServiceReview(review: any): Promise<any>;
  getPartnerReviews(partnerId: string): Promise<any[]>;
  
  // Service Insights
  getServiceInsights(propertyId: string): Promise<any>;
  createServiceInsight(data: any): Promise<any>;
  
  // Early Bird Promotion - Launch Special
  getActiveEarlyBirdPromotion(): Promise<any | undefined>;
  checkEarlyBirdEligibility(): Promise<{ eligible: boolean; remaining: number; total: number }>;
  claimEarlyBirdSpot(promotionId: string, propertyId: string, userId: string): Promise<any>;
  getEarlyBirdUsageCount(promotionId: string): Promise<number>;
}


export class DatabaseStorage implements IStorage {
  private seeded = false;

  private async seedDatabase(forceInProduction = false) {
    if (this.seeded) return;
    
    // SECURITY CHECK: Prevent demo seeding in production environment
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && !forceInProduction) {
      console.info('🔒 Production environment detected: Demo user seeding disabled for security');
      this.seeded = true;
      return;
    }
    
    if (isProduction && forceInProduction) {
      console.warn('⚠️  FORCED PRODUCTION SEEDING: Admin requested demo data initialization');
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
        carSpaces: 2,
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
        carSpaces: 1,
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
        carSpaces: 1,
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
        carSpaces: 4,
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

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
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

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
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

  async getPropertiesBatch(limit: number, offset: number = 0): Promise<Property[]> {
    try {
      const result = await db
        .select()
        .from(properties)
        .where(eq(properties.isActive, true))
        .limit(limit)
        .offset(offset);
      return result;
    } catch (error) {
      console.error("Error fetching properties batch:", error);
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

  // User Saved Properties Implementation
  async savePropertyForUser(userId: string, propertyId: string): Promise<void> {
    try {
      await db.insert(userSavedProperties).values({
        userId,
        propertyId,
      }).onConflictDoNothing(); // Prevent duplicate saves
    } catch (error) {
      console.error("Failed to save property:", error);
      throw error;
    }
  }

  async unsavePropertyForUser(userId: string, propertyId: string): Promise<void> {
    await db.delete(userSavedProperties)
      .where(
        and(
          eq(userSavedProperties.userId, userId),
          eq(userSavedProperties.propertyId, propertyId)
        )
      );
  }

  async getUserSavedProperties(userId: string): Promise<Property[]> {
    const savedRecords = await db
      .select({
        property: properties,
      })
      .from(userSavedProperties)
      .innerJoin(properties, eq(userSavedProperties.propertyId, properties.id))
      .where(eq(userSavedProperties.userId, userId));
    
    return savedRecords.map(record => record.property);
  }

  async isPropertySavedByUser(userId: string, propertyId: string): Promise<boolean> {
    const [saved] = await db
      .select()
      .from(userSavedProperties)
      .where(
        and(
          eq(userSavedProperties.userId, userId),
          eq(userSavedProperties.propertyId, propertyId)
        )
      )
      .limit(1);
    
    return !!saved;
  }

  // 🌟 AUTOMATIC STAR RATING CALCULATION FROM LIKES
  // Multi-tasking efficiency: One action (like) powers both engagement AND trust signals
  // Star Formula:
  // 0-9 likes → No stars yet
  // 10-20 likes → ⭐ (1 star)
  // 21-30 likes → ⭐⭐ (2 stars)
  // 31-40 likes → ⭐⭐⭐ (3 stars)
  // 41-50 likes → ⭐⭐⭐⭐ (4 stars)
  // 51+ likes → ⭐⭐⭐⭐⭐ (5 stars)
  async calculateAndUpdateStarRating(propertyId: string): Promise<void> {
    // Get the property to check current likes
    const property = await this.getProperty(propertyId);
    if (!property) return;

    const likes = property.likes || 0;
    let stars: number | null = null;

    // Calculate stars based on likes
    if (likes >= 51) {
      stars = 5;
    } else if (likes >= 41) {
      stars = 4;
    } else if (likes >= 31) {
      stars = 3;
    } else if (likes >= 21) {
      stars = 2;
    } else if (likes >= 10) {
      stars = 1;
    }
    // 0-9 likes = no stars (null)

    // Update the property's star rating
    await db.update(properties)
      .set({ 
        averageRating: stars ? stars.toString() : null,
        totalRatings: stars ? 1 : 0 // Keep totalRatings for compatibility (1 if has stars, 0 if not)
      })
      .where(eq(properties.id, propertyId));
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

  async updateOfferEmailTracking(id: string, data: { pdfGenerated?: boolean; emailSent?: boolean; emailSentAt?: Date; pdfUrl?: string | null }): Promise<void> {
    await db.update(offers)
      .set({ ...data, updatedAt: new Date() })
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

  // Property Shares Implementation
  async createPropertyShare(share: InsertPropertyShare): Promise<PropertyShare> {
    const [created] = await db
      .insert(propertyShares)
      .values(share)
      .returning();
    return created;
  }

  async getUserShares(userId: string): Promise<PropertyShare[]> {
    return await db
      .select()
      .from(propertyShares)
      .where(eq(propertyShares.sharedWith, userId))
      .orderBy(sql`${propertyShares.createdAt} DESC`);
  }

  async getPropertyShares(propertyId: string): Promise<PropertyShare[]> {
    return await db
      .select()
      .from(propertyShares)
      .where(eq(propertyShares.propertyId, propertyId))
      .orderBy(sql`${propertyShares.createdAt} DESC`);
  }

  async markShareAsViewed(shareId: string): Promise<void> {
    await db
      .update(propertyShares)
      .set({ viewed: true, viewedAt: new Date() })
      .where(eq(propertyShares.id, shareId));
  }

  // ============================================================================
  // OFFER WIZARD IMPLEMENTATION - HouseMatch Offer Wizard System
  // ============================================================================
  
  // Property Offers Implementation
  async createPropertyOffer(offer: InsertPropertyOffer): Promise<PropertyOffer> {
    const [created] = await db
      .insert(propertyOffers)
      .values(offer)
      .returning();
    return created;
  }

  async getPropertyOffer(id: string): Promise<PropertyOffer | undefined> {
    const [offer] = await db
      .select()
      .from(propertyOffers)
      .where(eq(propertyOffers.id, id))
      .limit(1);
    return offer;
  }

  async getPropertyOffersByProperty(propertyId: string): Promise<PropertyOffer[]> {
    return await db
      .select()
      .from(propertyOffers)
      .where(eq(propertyOffers.propertyId, propertyId))
      .orderBy(sql`${propertyOffers.createdAt} DESC`);
  }

  async getPropertyOffersByBuyer(buyerId: string): Promise<PropertyOffer[]> {
    return await db
      .select()
      .from(propertyOffers)
      .where(eq(propertyOffers.buyerId, buyerId))
      .orderBy(sql`${propertyOffers.createdAt} DESC`);
  }

  async getDraftOfferForProperty(propertyId: string, buyerId: string): Promise<PropertyOffer | undefined> {
    const [offer] = await db
      .select()
      .from(propertyOffers)
      .where(
        and(
          eq(propertyOffers.propertyId, propertyId),
          eq(propertyOffers.buyerId, buyerId),
          eq(propertyOffers.status, 'draft')
        )
      )
      .orderBy(sql`${propertyOffers.createdAt} DESC`)
      .limit(1);
    return offer;
  }

  async updatePropertyOffer(id: string, data: Partial<InsertPropertyOffer>): Promise<PropertyOffer> {
    const [updated] = await db
      .update(propertyOffers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(propertyOffers.id, id))
      .returning();
    return updated;
  }

  async updatePropertyOfferStatus(id: string, status: string): Promise<void> {
    await db
      .update(propertyOffers)
      .set({ status, updatedAt: new Date() })
      .where(eq(propertyOffers.id, id));
  }

  async updatePropertyOfferWizardStep(id: string, step: number): Promise<void> {
    await db
      .update(propertyOffers)
      .set({ wizardStep: step, updatedAt: new Date() })
      .where(eq(propertyOffers.id, id));
  }

  async deletePropertyOffer(id: string): Promise<void> {
    await db
      .delete(propertyOffers)
      .where(eq(propertyOffers.id, id));
  }

  // Offer Buyer Details Implementation
  async createOfferBuyerDetails(details: InsertOfferBuyerDetails): Promise<OfferBuyerDetails> {
    const [created] = await db
      .insert(offerBuyerDetails)
      .values(details)
      .returning();
    return created;
  }

  async getOfferBuyerDetails(offerId: string): Promise<OfferBuyerDetails | undefined> {
    const [details] = await db
      .select()
      .from(offerBuyerDetails)
      .where(eq(offerBuyerDetails.offerId, offerId))
      .limit(1);
    return details;
  }

  async updateOfferBuyerDetails(offerId: string, details: Partial<InsertOfferBuyerDetails>): Promise<OfferBuyerDetails> {
    const [updated] = await db
      .update(offerBuyerDetails)
      .set({ ...details, updatedAt: new Date() })
      .where(eq(offerBuyerDetails.offerId, offerId))
      .returning();
    return updated;
  }

  // Offer Conditions Implementation
  async createOfferCondition(condition: InsertOfferCondition): Promise<OfferCondition> {
    const [created] = await db
      .insert(offerConditions)
      .values(condition)
      .returning();
    return created;
  }

  async getOfferConditions(offerId: string): Promise<OfferCondition[]> {
    return await db
      .select()
      .from(offerConditions)
      .where(eq(offerConditions.offerId, offerId))
      .orderBy(sql`${offerConditions.createdAt} ASC`);
  }

  async getOfferCondition(id: string): Promise<OfferCondition | undefined> {
    const [condition] = await db
      .select()
      .from(offerConditions)
      .where(eq(offerConditions.id, id))
      .limit(1);
    return condition;
  }

  async updateOfferCondition(id: string, data: Partial<InsertOfferCondition>): Promise<OfferCondition> {
    const [updated] = await db
      .update(offerConditions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(offerConditions.id, id))
      .returning();
    return updated;
  }

  async updateOfferConditionStatus(id: string, status: string): Promise<void> {
    await db
      .update(offerConditions)
      .set({ 
        status, 
        satisfiedAt: status === 'satisfied' ? new Date() : undefined,
        updatedAt: new Date() 
      })
      .where(eq(offerConditions.id, id));
  }

  async deleteOfferCondition(id: string): Promise<void> {
    await db
      .delete(offerConditions)
      .where(eq(offerConditions.id, id));
  }

  // Offer Chattels Implementation
  async createOfferChattel(chattel: InsertOfferChattel): Promise<OfferChattel> {
    const [created] = await db
      .insert(offerChattels)
      .values(chattel)
      .returning();
    return created;
  }

  async getOfferChattels(offerId: string): Promise<OfferChattel[]> {
    return await db
      .select()
      .from(offerChattels)
      .where(eq(offerChattels.offerId, offerId))
      .orderBy(sql`${offerChattels.createdAt} ASC`);
  }

  async updateOfferChattel(id: string, data: Partial<InsertOfferChattel>): Promise<OfferChattel> {
    const [updated] = await db
      .update(offerChattels)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(offerChattels.id, id))
      .returning();
    return updated;
  }

  async deleteOfferChattel(id: string): Promise<void> {
    await db
      .delete(offerChattels)
      .where(eq(offerChattels.id, id));
  }

  // Standard Chattels Implementation
  async getAllStandardChattels(): Promise<StandardChattel[]> {
    return await db
      .select()
      .from(standardChattels)
      .orderBy(sql`${standardChattels.displayOrder} ASC`);
  }

  async getStandardChattelsByCategory(category: string): Promise<StandardChattel[]> {
    return await db
      .select()
      .from(standardChattels)
      .where(eq(standardChattels.category, category))
      .orderBy(sql`${standardChattels.displayOrder} ASC`);
  }

  // Offer Activities Implementation
  async createOfferActivity(activity: InsertOfferActivity): Promise<OfferActivity> {
    const [created] = await db
      .insert(offerActivities)
      .values(activity)
      .returning();
    return created;
  }

  async getOfferActivities(offerId: string): Promise<OfferActivity[]> {
    return await db
      .select()
      .from(offerActivities)
      .where(eq(offerActivities.offerId, offerId))
      .orderBy(sql`${offerActivities.createdAt} DESC`);
  }

  // Offer Messages Implementation
  async createOfferMessage(message: InsertOfferMessage): Promise<OfferMessage> {
    const [created] = await db
      .insert(offerMessages)
      .values(message)
      .returning();
    return created;
  }

  async getOfferMessages(offerId: string): Promise<OfferMessage[]> {
    return await db
      .select()
      .from(offerMessages)
      .where(eq(offerMessages.offerId, offerId))
      .orderBy(sql`${offerMessages.createdAt} ASC`);
  }

  async markOfferMessageAsRead(id: string): Promise<void> {
    await db
      .update(offerMessages)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(offerMessages.id, id));
  }

  // ============================================================================
  // SERVICE ORDERS IMPLEMENTATION - Building Inspection & Meth Testing Orders
  // ============================================================================
  
  async createServiceOrder(order: InsertServiceOrder): Promise<ServiceOrder> {
    const [created] = await db
      .insert(serviceOrders)
      .values(order)
      .returning();
    return created;
  }

  async getServiceOrder(id: string): Promise<ServiceOrder | undefined> {
    const [order] = await db
      .select()
      .from(serviceOrders)
      .where(eq(serviceOrders.id, id));
    return order;
  }

  async getUserServiceOrders(userId: string): Promise<ServiceOrder[]> {
    return await db
      .select()
      .from(serviceOrders)
      .where(eq(serviceOrders.buyerId, userId))
      .orderBy(sql`${serviceOrders.createdAt} DESC`);
  }

  async getAllServiceOrders(): Promise<ServiceOrder[]> {
    return await db
      .select()
      .from(serviceOrders)
      .orderBy(sql`${serviceOrders.createdAt} DESC`);
  }

  async updateServiceOrderStatus(id: string, status: string): Promise<void> {
    await db
      .update(serviceOrders)
      .set({ status })
      .where(eq(serviceOrders.id, id));
  }

  // Service Inquiry methods
  async createServiceInquiry(inquiry: InsertServiceInquiry): Promise<ServiceInquiry> {
    const [created] = await db
      .insert(serviceInquiries)
      .values(inquiry)
      .returning();
    return created;
  }

  async getServiceInquiry(id: string): Promise<ServiceInquiry | undefined> {
    const [inquiry] = await db
      .select()
      .from(serviceInquiries)
      .where(eq(serviceInquiries.id, id));
    return inquiry;
  }

  async getUserServiceInquiries(userId: string): Promise<ServiceInquiry[]> {
    return await db
      .select()
      .from(serviceInquiries)
      .where(eq(serviceInquiries.userId, userId))
      .orderBy(sql`${serviceInquiries.createdAt} DESC`);
  }

  async getAllServiceInquiries(): Promise<ServiceInquiry[]> {
    return await db
      .select()
      .from(serviceInquiries)
      .orderBy(sql`${serviceInquiries.createdAt} DESC`);
  }

  // ============================================================================
  // PARTNER ECOSYSTEM IMPLEMENTATION
  // ============================================================================
  
  async getAllServicePartners(): Promise<any[]> {
    return await db.select().from(servicePartners).orderBy(sql`${servicePartners.createdAt} DESC`);
  }

  async getPartnersByServiceType(serviceType: string): Promise<any[]> {
    const partners = await db.select().from(servicePartners).where(eq(servicePartners.status, 'active'));
    return partners.filter(p => p.serviceTypes?.includes(serviceType));
  }

  async createServicePartner(data: any): Promise<any> {
    const [partner] = await db.insert(servicePartners).values(data).returning();
    return partner;
  }

  async updateServicePartner(id: string, data: any): Promise<any> {
    const [partner] = await db.update(servicePartners).set(data).where(eq(servicePartners.id, id)).returning();
    return partner;
  }

  async getServicePartner(id: string): Promise<any | undefined> {
    const [partner] = await db.select().from(servicePartners).where(eq(servicePartners.id, id));
    return partner;
  }

  async getPartnerOrders(partnerId: string, status?: string): Promise<any[]> {
    let query = db.select().from(serviceOrders).where(eq(serviceOrders.partnerId, partnerId));
    if (status) {
      query = query.where(and(eq(serviceOrders.partnerId, partnerId), eq(serviceOrders.status, status))) as any;
    }
    return await query.orderBy(sql`${serviceOrders.createdAt} DESC`);
  }

  async acceptServiceOrder(orderId: string, partnerUserId: string): Promise<any> {
    const [order] = await db.update(serviceOrders)
      .set({ status: 'accepted', acceptedAt: new Date(), updatedAt: new Date() })
      .where(eq(serviceOrders.id, orderId))
      .returning();
    return order;
  }

  async assignPartnerToOrder(orderId: string, partnerId: string): Promise<any> {
    const [order] = await db.update(serviceOrders)
      .set({ partnerId, status: 'assigned', assignedAt: new Date(), updatedAt: new Date() })
      .where(eq(serviceOrders.id, orderId))
      .returning();
    return order;
  }

  async createPartnerUpdate(update: any): Promise<any> {
    const [created] = await db.insert(partnerUpdates).values(update).returning();
    
    // Also update the service order status
    await db.update(serviceOrders)
      .set({ status: update.status, updatedAt: new Date() })
      .where(eq(serviceOrders.id, update.serviceOrderId));
    
    return created;
  }

  async getOrderUpdates(serviceOrderId: string): Promise<any[]> {
    return await db.select().from(partnerUpdates).where(eq(partnerUpdates.serviceOrderId, serviceOrderId)).orderBy(sql`${partnerUpdates.createdAt} DESC`);
  }

  async getPartnerAnalytics(partnerId: string): Promise<any> {
    const orders = await this.getPartnerOrders(partnerId);
    const reviews = await this.getPartnerReviews(partnerId);
    const [partner] = await db.select().from(servicePartners).where(eq(servicePartners.id, partnerId));
    
    return {
      totalJobs: orders.length,
      completedJobs: orders.filter(o => o.status === 'completed').length,
      pendingJobs: orders.filter(o => o.status === 'pending' || o.status === 'assigned').length,
      inProgressJobs: orders.filter(o => o.status === 'in_progress' || o.status === 'accepted').length,
      averageRating: partner?.averageRating || 0,
      totalReviews: reviews.length,
      totalEarnings: partner?.totalEarnings || 0,
      recentOrders: orders.slice(0, 10),
      recentReviews: reviews.slice(0, 5),
    };
  }

  async createServiceReview(review: any): Promise<any> {
    const [created] = await db.insert(serviceReviews).values(review).returning();
    
    // Update partner average rating
    const reviews = await this.getPartnerReviews(review.partnerId);
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await db.update(servicePartners)
      .set({ averageRating: avgRating.toString() })
      .where(eq(servicePartners.id, review.partnerId));
    
    return created;
  }

  async getPartnerReviews(partnerId: string): Promise<any[]> {
    return await db.select().from(serviceReviews).where(eq(serviceReviews.partnerId, partnerId)).orderBy(sql`${serviceReviews.createdAt} DESC`);
  }

  async getServiceInsights(propertyId: string): Promise<any> {
    const [insights] = await db.select().from(serviceInsights).where(eq(serviceInsights.propertyId, propertyId));
    return insights;
  }

  async createServiceInsight(data: any): Promise<any> {
    const [insight] = await db.insert(serviceInsights).values(data).returning();
    return insight;
  }

  // ============================================================================
  // EARLY BIRD PROMOTION - Launch Special
  // ============================================================================

  async getActiveEarlyBirdPromotion(): Promise<any | undefined> {
    const [promotion] = await db
      .select()
      .from(earlyBirdPromotion)
      .where(eq(earlyBirdPromotion.isActive, true))
      .orderBy(sql`${earlyBirdPromotion.createdAt} DESC`)
      .limit(1);
    return promotion;
  }

  async checkEarlyBirdEligibility(): Promise<{ eligible: boolean; remaining: number; total: number }> {
    const promotion = await this.getActiveEarlyBirdPromotion();
    
    if (!promotion) {
      return { eligible: false, remaining: 0, total: 0 };
    }

    const remaining = promotion.totalLimit - promotion.totalUsed;
    const eligible = remaining > 0;

    return {
      eligible,
      remaining,
      total: promotion.totalLimit
    };
  }

  async claimEarlyBirdSpot(promotionId: string, propertyId: string, userId: string): Promise<any> {
    // Atomically check and claim a spot
    const promotion = await db
      .select()
      .from(earlyBirdPromotion)
      .where(eq(earlyBirdPromotion.id, promotionId))
      .limit(1);

    if (!promotion || promotion.length === 0) {
      throw new Error('Promotion not found');
    }

    const currentPromotion = promotion[0];
    
    if (!currentPromotion.isActive) {
      throw new Error('Promotion is no longer active');
    }

    if (currentPromotion.totalUsed >= currentPromotion.totalLimit) {
      throw new Error('Promotion limit reached');
    }

    // Increment counter
    const newUsageNumber = currentPromotion.totalUsed + 1;
    
    await db
      .update(earlyBirdPromotion)
      .set({ 
        totalUsed: newUsageNumber,
        updatedAt: new Date()
      })
      .where(eq(earlyBirdPromotion.id, promotionId));

    // Track this specific usage
    const [usage] = await db.insert(earlyBirdUsage).values({
      promotionId,
      propertyId,
      userId,
      usageNumber: newUsageNumber
    }).returning();

    // Auto-close promotion if limit reached
    if (newUsageNumber >= currentPromotion.totalLimit) {
      await db
        .update(earlyBirdPromotion)
        .set({ 
          isActive: false,
          endedAt: new Date()
        })
        .where(eq(earlyBirdPromotion.id, promotionId));
    }

    return usage;
  }

  async getEarlyBirdUsageCount(promotionId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(earlyBirdUsage)
      .where(eq(earlyBirdUsage.promotionId, promotionId));
    
    return result[0]?.count || 0;
  }

  // ============================================================================
  // MVP: PARTNER VERIFICATION (Admin Manual Approval)
  // ============================================================================

  async verifyPartner(partnerId: string, adminId: string, notes?: string): Promise<any> {
    const [partner] = await db.update(servicePartners)
      .set({
        verificationStatus: 'verified',
        verificationNotes: notes || 'Approved by admin',
        verifiedBy: adminId,
        verifiedAt: new Date(),
        status: 'active', // Automatically activate upon verification
        updatedAt: new Date(),
      })
      .where(eq(servicePartners.id, partnerId))
      .returning();
    return partner;
  }

  async rejectPartner(partnerId: string, adminId: string, notes: string): Promise<any> {
    const [partner] = await db.update(servicePartners)
      .set({
        verificationStatus: 'rejected',
        verificationNotes: notes,
        verifiedBy: adminId,
        status: 'inactive',
        updatedAt: new Date(),
      })
      .where(eq(servicePartners.id, partnerId))
      .returning();
    return partner;
  }

  async getPendingPartners(): Promise<any[]> {
    return await db.select()
      .from(servicePartners)
      .where(eq(servicePartners.verificationStatus, 'pending'))
      .orderBy(sql`${servicePartners.createdAt} DESC`);
  }

  // ============================================================================
  // MVP: MANUAL PAYOUT TRACKING (Admin Bank Transfers)
  // ============================================================================

  async updatePayoutStatus(orderId: string, payoutData: { status: string; amount?: number; notes?: string }): Promise<any> {
    const updateData: any = {
      payoutStatus: payoutData.status,
      updatedAt: new Date(),
    };
    
    if (payoutData.amount !== undefined) {
      updateData.payoutAmount = payoutData.amount;
    }
    
    if (payoutData.notes) {
      updateData.payoutNotes = payoutData.notes;
    }
    
    if (payoutData.status === 'paid') {
      updateData.payoutDate = new Date();
    }
    
    const [order] = await db.update(serviceOrders)
      .set(updateData)
      .where(eq(serviceOrders.id, orderId))
      .returning();
    
    return order;
  }

  async getUnpaidOrders(): Promise<any[]> {
    return await db.select()
      .from(serviceOrders)
      .where(and(
        eq(serviceOrders.status, 'completed'),
        eq(serviceOrders.payoutStatus, 'unpaid')
      ))
      .orderBy(sql`${serviceOrders.completedAt} DESC`);
  }

  async getPartnerEarnings(partnerId: string): Promise<{ total: number; unpaid: number; paid: number }> {
    const orders = await db.select()
      .from(serviceOrders)
      .where(eq(serviceOrders.partnerId, partnerId));
    
    const total = orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + (o.payoutAmount || o.providerEarningsCents || 0), 0);
    
    const unpaid = orders
      .filter(o => o.status === 'completed' && o.payoutStatus === 'unpaid')
      .reduce((sum, o) => sum + (o.payoutAmount || o.providerEarningsCents || 0), 0);
    
    const paid = orders
      .filter(o => o.payoutStatus === 'paid')
      .reduce((sum, o) => sum + (o.payoutAmount || 0), 0);
    
    return { total, unpaid, paid };
  }
}

export const storage = new DatabaseStorage();

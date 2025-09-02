import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),  // Back to auto-generated UUIDs
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  profilePicture: text("profile_picture").default("👤"), // Emoji or standard picture identifier
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(), // Track property owner
  title: text("title").notNull(),
  address: text("address").notNull(),
  suburb: text("suburb").notNull(),
  price: text("price").notNull(),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  floorArea: integer("floor_area"), // in m²
  landArea: integer("land_area"), // in m²
  carSpaces: integer("car_spaces"), // number of parking spaces/garage
  propertyType: text("property_type").notNull(), // residential, rental, commercial, lease
  lotNumber: text("lot_number").notNull(), // e.g., "Lot 15 DP 456789" - MANDATORY for security
  certificateOfTitle: text("certificate_of_title").notNull(), // e.g., "CT 456789/123" - MANDATORY for security
  hideCertificateOfTitle: boolean("hide_certificate_of_title").default(false), // Privacy control for certificate
  zoning: text("zoning"),
  yearBuilt: integer("year_built"),
  imageUrl: text("image_url"),
  additionalImages: json("additional_images").$type<string[]>().default([]),
  description: text("description"),
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  saves: integer("saves").default(0),
  isLinzValidated: boolean("is_linz_validated").notNull().default(false),
  selfDeclaration: boolean("self_declaration").notNull().default(false),
  selectedPlan: text("selected_plan"), // Store the selected pricing plan: day-trader, quick-match, serious-seller, committed-closer
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Prevent duplicate properties with same address and lot number (fraud detection)
  uniqueProperty: sql`UNIQUE(address, "lot_number")`,
  // Also prevent duplicate certificate of titles
  uniqueCertificate: sql`UNIQUE("certificate_of_title")`,
}));

export const userSwipes = pgTable("user_swipes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  propertyId: varchar("property_id").references(() => properties.id),
  action: text("action").notNull(), // 'like', 'dislike', 'super_like'
  createdAt: timestamp("created_at").defaultNow(),
});

// Pricing plans for seller subscriptions
export const pricingPlans = pgTable("pricing_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // "Quick Match", "Serious Seller", "Committed Closer"
  duration: integer("duration").notNull(), // days: 30, 60, 90
  price: integer("price").notNull(), // cents: 48800, 68800, 87800
  dailyRate: integer("daily_rate").notNull(), // cents: 1600, 1100, 900
  savings: integer("savings").notNull(), // cents per day saved vs casual
  description: text("description").notNull(),
  features: json("features").$type<string[]>().notNull(),
  isPopular: boolean("is_popular").default(false),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  preferredPropertyTypes: json("preferred_property_types").$type<string[]>().default([]),
  priceRangeMin: decimal("price_range_min"),
  priceRangeMax: decimal("price_range_max"),
  preferredBedrooms: integer("preferred_bedrooms"),
  preferredSuburbs: json("preferred_suburbs").$type<string[]>().default([]),
  aiInsights: json("ai_insights").$type<any>(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  propertyId: varchar("property_id").references(() => properties.id),
  reportType: text("report_type").notNull(), // 'lim', 'fast_lim', 'building_inspection', 'insurance_quote'
  price: decimal("price").notNull(),
  status: text("status").default('pending'), // pending, processing, completed, failed
  processingDays: integer("processing_days"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Service providers table for professional services marketplace
export const serviceProviders = pgTable("service_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessName: text("business_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  category: text("category").notNull(), // 'photographer', 'lawyer', 'mortgage_broker', 'banker', 'inspector', 'surveyor', 'other'
  description: text("description").notNull(),
  websiteUrl: text("website_url"),
  logoUrl: text("logo_url"),
  certifications: json("certifications").$type<string[]>().default([]),
  servicesOffered: json("services_offered").$type<string[]>().default([]),
  priceRange: text("price_range"), // e.g., "$100-500", "Contact for quote"
  serviceAreas: json("service_areas").$type<string[]>().default([]), // Geographic areas they serve
  businessAddress: text("business_address"),
  licenseNumber: text("license_number"), // For regulated professions
  insuranceDetails: text("insurance_details"),
  
  // Admin approval workflow
  status: text("status").default('pending'), // pending, approved, rejected, suspended
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewNotes: text("review_notes"),
  
  // Display settings
  featured: boolean("featured").default(false),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Offers table - Track property offers from buyers
export const offers = pgTable("offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  buyerId: varchar("buyer_id").references(() => users.id), // Optional - for logged in users
  
  // Buyer Information
  buyerName: text("buyer_name").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  buyerPhone: text("buyer_phone").notNull(),
  
  // Offer Details
  offerPrice: text("offer_price").notNull(),
  settlementPeriod: text("settlement_period").notNull(),
  
  // Conditions
  financeCondition: boolean("finance_condition").default(false),
  buildingInspectionCondition: boolean("building_inspection_condition").default(false),
  limCondition: boolean("lim_condition").default(false),
  
  // Additional Details
  additionalConditions: text("additional_conditions"),
  additionalComments: text("additional_comments"),
  
  // Status tracking
  status: text("status").default('draft'), // draft, submitted, under_review, approved, rejected, withdrawn
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Draft Legal Documents table - Store generated agreements
export const draftDocuments = pgTable("draft_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").references(() => offers.id).notNull(),
  
  // Document Details
  documentType: text("document_type").notNull(), // 'purchase_sale_agreement', 'lease_agreement'
  documentContent: text("document_content"), // HTML/Markdown content of the document
  pdfUrl: text("pdf_url"), // URL to generated PDF
  docxUrl: text("docx_url"), // URL to generated DOCX
  
  // Version tracking
  version: integer("version").default(1),
  isLatestVersion: boolean("is_latest_version").default(true),
  
  // Status tracking
  status: text("status").default('generated'), // generated, reviewed, approved, signed
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Lawyer Reviews table - Track lawyer feedback and revisions
export const lawyerReviews = pgTable("lawyer_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  draftDocumentId: varchar("draft_document_id").references(() => draftDocuments.id).notNull(),
  
  // Lawyer Information
  lawyerName: text("lawyer_name"),
  lawyerEmail: text("lawyer_email"),
  lawyerFirm: text("lawyer_firm"),
  
  // Review Details
  reviewType: text("review_type").notNull(), // 'cribsy_partner', 'external_lawyer'
  reviewStatus: text("review_status").default('pending'), // pending, in_progress, completed
  reviewNotes: text("review_notes"), // Lawyer's feedback and recommendations
  
  // Fee tracking
  reviewFee: integer("review_fee"), // Fee in cents
  paymentStatus: text("payment_status").default('pending'), // pending, paid, refunded
  
  // Timing
  reviewRequestedAt: timestamp("review_requested_at").defaultNow(),
  reviewCompletedAt: timestamp("review_completed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  userId: true,  // Added - server adds this after auth
  views: true,
  likes: true,
  saves: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  selectedPlan: z.string().optional(), // Optional because it might not be selected yet
});

export const insertUserSwipeSchema = createInsertSchema(userSwipes).omit({
  id: true,
  createdAt: true,
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  updatedAt: true,
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertServiceProviderSchema = createInsertSchema(serviceProviders).omit({
  id: true,
  status: true, // Defaults to pending
  submittedAt: true,
  reviewedAt: true,
  reviewedBy: true,
  reviewNotes: true,
  featured: true,
  displayOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPricingPlanSchema = createInsertSchema(pricingPlans).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;
export type InsertUserSwipe = z.infer<typeof insertUserSwipeSchema>;
export type UserSwipe = typeof userSwipes.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertServiceProvider = z.infer<typeof insertServiceProviderSchema>;
export type ServiceProvider = typeof serviceProviders.$inferSelect;
export type InsertPricingPlan = z.infer<typeof insertPricingPlanSchema>;
export type PricingPlan = typeof pricingPlans.$inferSelect;

// Insert schemas for offer system
export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDraftDocumentSchema = createInsertSchema(draftDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLawyerReviewSchema = createInsertSchema(lawyerReviews).omit({
  id: true,
  reviewRequestedAt: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports for offer system
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Offer = typeof offers.$inferSelect;
export type InsertDraftDocument = z.infer<typeof insertDraftDocumentSchema>;
export type DraftDocument = typeof draftDocuments.$inferSelect;
export type InsertLawyerReview = z.infer<typeof insertLawyerReviewSchema>;
export type LawyerReview = typeof lawyerReviews.$inferSelect;

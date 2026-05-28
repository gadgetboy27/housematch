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
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpiry: timestamp("email_verification_expiry"),
  isAdmin: boolean("is_admin").default(false), // Admin role for dashboard access
  
  // Premium Subscription Tracking
  subscriptionTier: text("subscription_tier").default('free'), // 'free', 'premium'
  stripeCustomerId: text("stripe_customer_id"), // Stripe customer ID
  stripeSubscriptionId: text("stripe_subscription_id"), // Stripe subscription ID
  subscriptionStatus: text("subscription_status").default('inactive'), // 'inactive', 'active', 'cancelled', 'past_due'
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  totalAiSpending: decimal("total_ai_spending", { precision: 10, scale: 4 }).default('0'), // Track lifetime AI cost
  isHighValueUser: boolean("is_high_value_user").default(false), // Auto-flagged when AI spending > $2
  
  // Premium Storage Tracking
  videoStorageUsed: integer("video_storage_used").default(0), // in bytes
  audioStorageUsed: integer("audio_storage_used").default(0), // in bytes
  videoStorageLimit: integer("video_storage_limit").default(157286400), // 150MB in bytes
  audioStorageLimit: integer("audio_storage_limit").default(20971520), // 20MB in bytes
  hasVideoStorageUpgrade: boolean("has_video_storage_upgrade").default(false),
  hasAudioStorageUpgrade: boolean("has_audio_storage_upgrade").default(false),
  
  // Adaptive AI Persona System (for personalized property recommendations)
  persona: text("persona").default('first_home_buyer'), // 'family', 'investor', 'professional', 'retiree', 'first_home_buyer'
  personaConfidence: decimal("persona_confidence", { precision: 3, scale: 2 }).default('0.3'), // 0-1 confidence score
  personaSource: text("persona_source").default('default'), // 'signup', 'detected', 'manual', 'default'
  personaLastUpdated: timestamp("persona_last_updated").defaultNow(),
  personaSwipeCount: integer("persona_swipe_count").default(0), // Tracks swipes since last persona update
  
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
  city: text("city"), // City/Region for location-based report filtering (Auckland, Wellington, Christchurch, etc.)
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
  
  // LINZ Title Data (auto-fetched from LINZ API when address is entered)
  linzTitleNumber: text("linz_title_number"), // Official LINZ title number
  linzLandDistrict: text("linz_land_district"), // Land district (e.g., "North Auckland")
  linzLegalDescription: text("linz_legal_description"), // Legal description from LINZ
  linzTitleType: text("linz_title_type"), // Title type (e.g., "Freehold", "Leasehold")
  linzTitleStatus: text("linz_title_status"), // Title status (e.g., "Current", "Cancelled")
  linzIssueDate: text("linz_issue_date"), // Title issue date
  linzArea: decimal("linz_area", { precision: 10, scale: 2 }), // Land area from LINZ in m²
  linzLastFetched: timestamp("linz_last_fetched"), // When LINZ data was last fetched
  
  zoning: text("zoning"),
  yearBuilt: integer("year_built"),
  imageUrl: text("image_url"),
  additionalImages: json("additional_images").$type<string[]>().default([]),
  videoUrl: text("video_url"), // Video tour (MP4, MOV, WebM, AVI)
  videoThumbnail: text("video_thumbnail"), // Thumbnail for video preview
  videoFileSize: integer("video_file_size"), // Video file size in bytes
  audioUrl: text("audio_url"), // Audio description (MP3, AAC, WAV, M4A)
  audioDuration: integer("audio_duration"), // Duration in seconds
  audioFileSize: integer("audio_file_size"), // Audio file size in bytes
  description: text("description"),
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  saves: integer("saves").default(0),
  
  // 🌟 AUTOMATIC STAR RATINGS - Calculated from Likes (Multi-tasking Efficiency)
  // Stars auto-calculate based on like count:
  // 10-20 likes → ⭐ (1 star)
  // 21-30 likes → ⭐⭐ (2 stars)
  // 31-40 likes → ⭐⭐⭐ (3 stars)
  // 41-50 likes → ⭐⭐⭐⭐ (4 stars)
  // 51+ likes → ⭐⭐⭐⭐⭐ (5 stars)
  // Benefits: Single action (like) powers both engagement metrics AND trust signals
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }), // Auto-calculated from likes
  totalRatings: integer("total_ratings").default(0), // Mirrors like count for compatibility
  
  isLinzValidated: boolean("is_linz_validated").notNull().default(false),
  selfDeclaration: boolean("self_declaration").notNull().default(false),
  selectedPlan: text("selected_plan"), // Store the selected pricing plan: day-trader, quick-match, serious-seller, committed-closer
  paymentStatus: text("payment_status").default('pending'), // pending, paid, failed, refunded
  stripeSessionId: text("stripe_session_id"), // Stripe checkout session ID
  isActive: boolean("is_active").default(false), // FALSE by default - only TRUE after payment
  activatedAt: timestamp("activated_at"), // When payment was completed and listing went live
  expiresAt: timestamp("expires_at"), // When listing expires based on plan duration
  
  // Delay Listing Feature
  publishStatus: text("publish_status").default('draft'), // 'draft', 'scheduled', 'published'
  scheduledPublishDate: timestamp("scheduled_publish_date"), // When to auto-publish
  aiSuggestions: json("ai_suggestions").$type<{ category: string; suggestion: string; priority: string }[]>(), // AI recommendations
  listingQualityScore: integer("listing_quality_score"), // 0-100 quality score from AI
  
  // External Data Source Tracking (for imports from Trade Me, realestate.co.nz, etc.)
  externalListingId: text("external_listing_id"), // ID from external source
  externalSource: text("external_source"), // 'trademe', 'realestate', 'homes', etc.
  
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
  userId: varchar("user_id").references(() => users.id).notNull(), // Must be logged in to swipe
  propertyId: varchar("property_id").references(() => properties.id),
  action: text("action").notNull(), // 'like', 'dislike'
  createdAt: timestamp("created_at").defaultNow(),
});

// User saved properties - Track which properties each user has saved
export const userSavedProperties = pgTable("user_saved_properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(), // User who saved
  propertyId: varchar("property_id").references(() => properties.id).notNull(), // Property that was saved
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Prevent duplicate saves: each user can only save a property once
  uniqueSave: sql`UNIQUE("user_id", "property_id")`,
}));

// Property shares - Track when users share properties with each other
export const propertyShares = pgTable("property_shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  sharedBy: varchar("shared_by").references(() => users.id).notNull(), // User who shared
  sharedWith: varchar("shared_with").references(() => users.id), // User who received (null if shared via link)
  shareMethod: text("share_method").notNull(), // 'internal', 'sms', 'whatsapp', 'link', 'email'
  message: text("message"), // Optional message from sender
  viewed: boolean("viewed").default(false), // Has recipient viewed it?
  viewedAt: timestamp("viewed_at"),
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

// Buyer/User Premium Subscription Plans
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(), // "Premium"
  displayName: text("display_name").notNull(), // "HouseMatch Premium"
  price: integer("price").notNull(), // Price in cents (2900 = $29 NZD)
  priceWithGst: integer("price_with_gst"), // Price with 15% GST (3335 = $33.35 NZD)
  currency: text("currency").notNull().default('nzd'),
  interval: text("interval").notNull().default('month'), // 'month', 'year'
  stripePriceId: text("stripe_price_id"), // Stripe Price ID for subscriptions
  features: json("features").$type<string[]>().notNull(), // List of features
  titleSearchCredits: integer("title_search_credits").default(2), // Free title searches per month
  aiPriority: boolean("ai_priority").default(true), // Priority AI processing
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  
  // Advanced AI learning fields
  lifestyleType: varchar("lifestyle_type", { length: 50 }), // 'family', 'professional', 'retiree', 'student', 'investor'
  priorities: json("priorities").$type<string[]>(), // ['schools', 'commute', 'quiet', 'nightlife', 'parks', 'shopping']
  mustHaves: json("must_haves").$type<string[]>(), // ['garage', 'garden', 'pool', 'view']
  dealBreakers: json("deal_breakers").$type<string[]>(), // ['busy_road', 'no_parking', 'small_sections']
  preferredSuburbScores: json("preferred_suburb_scores").$type<Record<string, number>>(),
  preferredPropertyFeatures: json("preferred_property_features").$type<Record<string, number>>(),
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }).default('0'),
  lastCalculatedAt: timestamp("last_calculated_at"),
  
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Advanced swipe tracking for AI learning system
export const propertySwipes = pgTable("property_swipes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  direction: text("direction").notNull(), // 'right' (like), 'left' (pass), 'super' (super like)
  swipeSpeedMs: integer("swipe_speed_ms"),
  viewDurationSeconds: integer("view_duration_seconds"),
  propertySnapshot: json("property_snapshot").$type<any>(),
  userFilters: json("user_filters").$type<any>(),
  featuresAtSwipe: json("features_at_swipe").$type<any>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI search history for analytics and improvement
export const aiSearchHistory = pgTable("ai_search_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  rawQuery: text("raw_query").notNull(),
  parsedCriteria: json("parsed_criteria").$type<any>(),
  propertiesFound: integer("properties_found").default(0),
  propertiesShown: integer("properties_shown").default(0),
  topPropertyIds: json("top_property_ids").$type<string[]>(),
  clickedPropertyIds: json("clicked_property_ids").$type<string[]>(),
  requestedReports: json("requested_reports").$type<string[]>(),
  searchSatisfactionScore: integer("search_satisfaction_score"),
  searchDurationMs: integer("search_duration_ms"),
  aiParsingDurationMs: integer("ai_parsing_duration_ms"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cache property match scores for performance
export const propertyMatchScores = pgTable("property_match_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  overallScore: decimal("overall_score", { precision: 5, scale: 2 }).notNull(),
  baseMatchScore: decimal("base_match_score", { precision: 5, scale: 2 }),
  lifestyleScore: decimal("lifestyle_score", { precision: 5, scale: 2 }),
  valueScore: decimal("value_score", { precision: 5, scale: 2 }),
  preferenceScore: decimal("preference_score", { precision: 5, scale: 2 }),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  matchReasons: json("match_reasons").$type<string[]>(),
  calculatedAt: timestamp("calculated_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Cache expiry
});

// Track report recommendations for cross-sell optimization
export const reportRecommendations = pgTable("report_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  reportType: text("report_type").notNull(), // 'title_search', 'lim', 'valuation', etc.
  matchScore: decimal("match_score", { precision: 5, scale: 2 }),
  recommendationReason: text("recommendation_reason"),
  priority: text("priority"), // 'high', 'medium', 'low'
  priceInCents: integer("price_in_cents"),
  displayed: boolean("displayed").default(false),
  clicked: boolean("clicked").default(false),
  purchased: boolean("purchased").default(false),
  clickedAt: timestamp("clicked_at"),
  purchasedAt: timestamp("purchased_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  propertyId: varchar("property_id").references(() => properties.id),
  reportType: text("report_type").notNull(), // 'title_search', 'lim', 'fast_lim', 'building_inspection', 'rental_data', 'complete_package'
  price: decimal("price").notNull(),
  status: text("status").default('pending'), // pending, processing, completed, failed, cancelled
  processingDays: integer("processing_days"),
  
  // Scheduled delivery (for automated 2-day delay)
  deliveryScheduledFor: timestamp("delivery_scheduled_for"), // When report should be delivered
  deliveryAttempts: integer("delivery_attempts").default(0), // Track retry attempts
  lastDeliveryAttempt: timestamp("last_delivery_attempt"), // Last attempt timestamp
  
  // Provider tracking
  provider: text("provider").notNull(), // 'linz', 'council', 'hppi', 'red_lbp', 'mbie', 'housematch'
  providerOrderId: text("provider_order_id"), // External order reference
  
  // Property details snapshot (for reference)
  propertyAddress: text("property_address"),
  propertyTitle: text("property_title"),
  
  // Payment tracking
  stripeSessionId: text("stripe_session_id"),
  paidAt: timestamp("paid_at"),
  
  // Sharing tracking (post-purchase sharing with solicitors/colleagues)
  sharedWith: json("shared_with").$type<Array<{email: string, sharedAt: string, sharedBy: string}>>(),
  
  // Additional metadata
  metadata: json("metadata"), // Store custom data like processing preferences
  
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Property reports - Store actual delivered reports
export const propertyReports = pgTable("property_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => purchaseOrders.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  propertyId: varchar("property_id").references(() => properties.id),
  
  // Report details
  reportType: text("report_type").notNull(), // 'title_search', 'lim', 'building_inspection', 'rental_data'
  reportTitle: text("report_title").notNull(),
  
  // Report files (white-labeled PDFs from housematch.nz)
  reportUrl: text("report_url"), // URL to white-labeled PDF
  rawDataUrl: text("raw_data_url"), // URL to original provider data (if applicable)
  reportData: json("report_data"), // Structured data from API (LINZ, MBIE)
  
  // Provider info (for transparency)
  provider: text("provider").notNull(), // 'linz', 'council', 'mbie', etc.
  providerReportId: text("provider_report_id"),
  
  // Delivery tracking
  deliveredAt: timestamp("delivered_at"),
  accessedAt: timestamp("accessed_at"), // When user first viewed the report
  downloadCount: integer("download_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Report packages - Bundle multiple reports together
export const reportPackages = pgTable("report_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // "Complete Property Package", "Buyer's Due Diligence Bundle"
  description: text("description").notNull(),
  includedReports: json("included_reports").$type<string[]>().notNull(), // ['title_search', 'lim', 'building_inspection', 'rental_data']
  
  // Pricing
  regularPriceCents: integer("regular_price_cents").notNull(), // Sum of individual prices
  bundlePriceCents: integer("bundle_price_cents").notNull(), // Discounted bundle price
  savingsCents: integer("savings_cents").notNull(), // How much they save
  
  // Marketing
  isPopular: boolean("is_popular").default(false),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  sellerId: varchar("seller_id").references(() => users.id), // Track seller for notifications
  
  // Property Reference Info (copied at time of offer for legal security)
  propertyAddress: text("property_address").notNull(),
  propertyLotNumber: text("property_lot_number").notNull(),
  propertyCertificateOfTitle: text("property_certificate_of_title").notNull(),
  propertyZoning: text("property_zoning"),
  propertyLandArea: integer("property_land_area"),
  propertyFloorArea: integer("property_floor_area"),
  
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
  
  // Email Tracking
  emailSent: boolean("email_sent").default(false),
  emailSentAt: timestamp("email_sent_at"),
  pdfGenerated: boolean("pdf_generated").default(false),
  pdfUrl: text("pdf_url"), // URL to generated PDF
  
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

// Analytics Tables for Admin Dashboard and Business Intelligence

// Universal transaction ledger for all financial activities
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  propertyId: varchar("property_id").references(() => properties.id),
  providerId: varchar("provider_id").references(() => serviceProviders.id),
  orderId: varchar("order_id").references(() => purchaseOrders.id),
  serviceOrderId: varchar("service_order_id").references(() => serviceOrders.id), // Link to service provider transactions
  
  // Financial details (all amounts in cents for precision)
  amountCents: integer("amount_cents").notNull(),
  feeCents: integer("fee_cents").default(0), // Platform or payment processor fees
  netCents: integer("net_cents").notNull(), // Amount after fees
  taxCents: integer("tax_cents").default(0),
  currency: text("currency").default('NZD'), // New Zealand focused platform
  
  // Transaction details
  type: text("type").notNull(), // 'revenue', 'expense', 'refund', 'payout', 'commission'
  source: text("source").notNull(), // 'stripe', 'manual', 'commission', 'subscription'
  category: text("category").notNull(), // 'property_listing', 'service_fee', 'marketing', 'refund'
  description: text("description").notNull(),
  
  // External references
  stripeTransactionId: text("stripe_transaction_id"),
  
  occurredAt: timestamp("occurred_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Stripe event audit trail for payment processing
export const stripeEvents = pgTable("stripe_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stripeEventId: text("stripe_event_id").notNull().unique(),
  eventType: text("event_type").notNull(), // 'payment_intent.succeeded', 'charge.refunded', etc.
  payload: json("payload").notNull(), // Full Stripe event payload
  
  // Essential Stripe audit fields
  stripeCreated: timestamp("stripe_created").notNull(), // When Stripe created the event
  livemode: boolean("livemode").notNull(), // Production vs test mode
  account: text("account"), // For Stripe Connect multi-account
  
  processed: boolean("processed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Property listing payment sessions for Stripe checkout
export const propertyPaymentSessions = pgTable("property_payment_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  propertyId: varchar("property_id").references(() => properties.id),
  
  // Stripe session details
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  
  // Payment details
  planId: text("plan_id").notNull(), // day-trader, quick-match, serious-seller, committed-closer, or storage upgrade
  planType: text("plan_type").notNull(), // 'listing' or 'storage'
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").default('nzd'),
  
  // Session status
  status: text("status").default('pending'), // pending, completed, expired, canceled
  
  // Property data stored at payment time (for creating property after payment)
  propertyData: json("property_data"), // Stores the full property form data
  
  // Timestamps
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Service orders connecting buyers, providers, and properties
export const serviceOrders = pgTable("service_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buyerId: varchar("buyer_id").references(() => users.id).notNull(),
  providerId: varchar("provider_id").references(() => serviceProviders.id),
  partnerId: varchar("partner_id").references(() => servicePartners.id), // NEW: Assigned service partner
  propertyId: varchar("property_id").references(() => properties.id),
  
  // Order details
  serviceName: text("service_name").notNull(),
  serviceType: text("service_type").notNull(), // 'home_staging', 'cleaning', 'moving', 'hosting', 'building_inspection', 'meth_testing', etc.
  status: text("status").default('pending'), // 'pending', 'assigned', 'accepted', 'scheduled', 'in_progress', 'completed', 'cancelled'
  
  // Customer contact details (for admin transfer to provider)
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  
  // Property details (denormalized for easy transfer)
  propertyAddress: text("property_address"),
  propertyFloorArea: integer("property_floor_area"), // in m² for pricing tiers
  
  // Additional details
  notes: text("notes"), // Special requests or instructions
  
  // Financial details (in cents)
  priceCents: integer("price_cents").notNull(),
  platformFeeCents: integer("platform_fee_cents").default(0), // Commission from partner
  providerEarningsCents: integer("provider_earnings_cents").default(0),
  
  // MVP: Manual Payment Tracking (Admin processes payouts manually)
  payoutStatus: text("payout_status").default('unpaid'), // 'unpaid', 'pending', 'paid'
  payoutAmount: integer("payout_amount"), // Amount partner receives (in cents)
  payoutDate: timestamp("payout_date"), // When manual payout was processed
  payoutNotes: text("payout_notes"), // Admin notes about payout
  
  // Future: Stripe Connect Integration
  stripePaymentIntentId: varchar("stripe_payment_intent_id"), // For future Stripe payments
  
  // Timing
  assignedAt: timestamp("assigned_at"), // When partner was assigned
  acceptedAt: timestamp("accepted_at"), // When partner accepted job
  scheduledDate: timestamp("scheduled_date"), // When work is scheduled
  paidAt: timestamp("paid_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service inquiries for quote requests (moving, staging, cleaning, hosting)
export const serviceInquiries = pgTable("service_inquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  
  // Service details
  serviceType: text("service_type").notNull(), // 'moving', 'home_staging', 'cleaning', 'hosting'
  serviceName: text("service_name").notNull(),
  
  // Customer contact details
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  
  // Property details (optional - for services like staging/cleaning)
  propertyId: varchar("property_id").references(() => properties.id),
  propertyAddress: text("property_address"),
  
  // Additional details
  message: text("message"), // Customer's specific requirements
  
  // Status tracking
  status: text("status").default('pending'), // 'pending', 'contacted', 'quoted', 'converted', 'declined'
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Property status transitions for sales funnel analytics
export const propertyEvents = pgTable("property_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  
  // Event details
  eventType: text("event_type").notNull(), // 'created', 'listed', 'viewed', 'liked', 'offer_received', 'under_offer', 'sold', 'archived'
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  
  // Actor (user who triggered the event)
  actorId: varchar("actor_id").references(() => users.id),
  actorType: text("actor_type"), // 'user', 'admin', 'system'
  
  metadata: json("metadata"), // Additional event data
  occurredAt: timestamp("occurred_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User engagement tracking for retention and behavior analysis
export const engagementEvents = pgTable("engagement_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  propertyId: varchar("property_id").references(() => properties.id),
  
  // Event details
  eventType: text("event_type").notNull(), // 'page_view', 'property_view', 'swipe_like', 'swipe_dislike', 'save', 'contact', 'offer_sent'
  sessionId: text("session_id"),
  metadata: json("metadata"), // Device info, referrer, etc.
  
  occurredAt: timestamp("occurred_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Operating costs for P&L calculations
export const operatingCosts = pgTable("operating_costs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Cost details
  category: text("category").notNull(), // 'marketing', 'infrastructure', 'support', 'salaries', 'legal'
  description: text("description").notNull(),
  costCents: integer("cost_cents").notNull(),
  currency: text("currency").default('NZD'), // New Zealand focused platform
  
  // Period this cost applies to
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  
  notes: text("notes"),
  addedBy: varchar("added_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pre-aggregated metrics for fast dashboard queries
export const dailyMetrics = pgTable("daily_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull().unique(), // Format: YYYY-MM-DD for proper uniqueness per calendar day
  
  // Revenue metrics (in cents)
  totalRevenueCents: integer("total_revenue_cents").default(0),
  totalExpensesCents: integer("total_expenses_cents").default(0),
  netProfitCents: integer("net_profit_cents").default(0),
  platformFeesCents: integer("platform_fees_cents").default(0),
  
  // User metrics
  dailyActiveUsers: integer("daily_active_users").default(0),
  newSignups: integer("new_signups").default(0),
  
  // Property metrics
  newProperties: integer("new_properties").default(0),
  propertiesSold: integer("properties_sold").default(0),
  totalViews: integer("total_views").default(0),
  totalLikes: integer("total_likes").default(0),
  
  // Service provider metrics
  newProviders: integer("new_providers").default(0),
  approvedProviders: integer("approved_providers").default(0),
  serviceOrdersCompleted: integer("service_orders_completed").default(0),
  
  // Calculated metrics
  averagePropertyPrice: integer("average_property_price").default(0),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 4 }).default('0.0000'),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email notification preferences - control what emails users receive
export const emailNotificationPreferences = pgTable("email_notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  
  // Property alerts
  newMatchingProperties: boolean("new_matching_properties").default(true), // New properties matching saved criteria
  priceDropAlerts: boolean("price_drop_alerts").default(true), // Price drops on liked properties
  propertyStatusUpdates: boolean("property_status_updates").default(true), // Property sold/off market
  
  // Report notifications
  reportReadyAlerts: boolean("report_ready_alerts").default(true), // When ordered reports are ready
  reportExpiringAlerts: boolean("report_expiring_alerts").default(true), // Report access expiring soon
  
  // Account notifications
  accountActivity: boolean("account_activity").default(true), // Login, password changes
  marketingEmails: boolean("marketing_emails").default(false), // Promotional emails
  weeklyDigest: boolean("weekly_digest").default(true), // Weekly summary of activity
  
  // Delivery preferences
  emailFrequency: text("email_frequency").default('instant'), // 'instant', 'daily_digest', 'weekly_digest'
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email queue - pending emails to be sent
export const emailQueue = pgTable("email_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  
  // Email details
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name"),
  subject: text("subject").notNull(),
  htmlContent: text("html_content").notNull(),
  textContent: text("text_content"),
  
  // Notification type
  notificationType: text("notification_type").notNull(), // 'new_match', 'price_drop', 'report_ready', etc.
  
  // Related entities
  propertyId: varchar("property_id").references(() => properties.id),
  orderId: varchar("order_id").references(() => purchaseOrders.id),
  
  // Sending status
  status: text("status").default('pending'), // 'pending', 'sending', 'sent', 'failed'
  attempts: integer("attempts").default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  errorMessage: text("error_message"),
  
  // Scheduling
  scheduledFor: timestamp("scheduled_for").defaultNow(), // When to send (for digest emails)
  
  createdAt: timestamp("created_at").defaultNow(),
  sentAt: timestamp("sent_at"),
});

// Sent emails log - track all sent emails
export const sentEmails = pgTable("sent_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  queueId: varchar("queue_id").references(() => emailQueue.id),
  
  // Email details
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  notificationType: text("notification_type").notNull(),
  
  // Delivery tracking
  sendgridMessageId: text("sendgrid_message_id"), // SendGrid message ID for tracking
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"), // If SendGrid tracking is enabled
  clickedAt: timestamp("clicked_at"),
  
  // Related entities
  propertyId: varchar("property_id").references(() => properties.id),
  orderId: varchar("order_id").references(() => purchaseOrders.id),
  
  sentAt: timestamp("sent_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI Usage Tracking - Monitor AI costs and optimize spending
export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  feature: text("feature").notNull(), // 'preferences', 'recommendations', 'insights', 'search'
  model: text("model").notNull(), // 'gpt-3.5-turbo', 'gpt-4', etc.
  promptTokens: integer("prompt_tokens").notNull(),
  completionTokens: integer("completion_tokens").notNull(),
  totalTokens: integer("total_tokens").notNull(),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 6 }).notNull(), // in USD
  cacheHit: boolean("cache_hit").default(false), // Was this served from cache?
  responseTimeMs: integer("response_time_ms"), // How long did it take?
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  createdAt: true,
  updatedAt: true,
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

export const insertUserSavedPropertySchema = createInsertSchema(userSavedProperties).omit({
  id: true,
  createdAt: true,
});

export const insertPropertyShareSchema = createInsertSchema(propertyShares).omit({
  id: true,
  createdAt: true,
  viewedAt: true,
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

export const insertPropertyReportSchema = createInsertSchema(propertyReports).omit({
  id: true,
  deliveredAt: true,
  accessedAt: true,
  downloadCount: true,
  createdAt: true,
});

export const insertReportPackageSchema = createInsertSchema(reportPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;
export type InsertUserSwipe = z.infer<typeof insertUserSwipeSchema>;
export type UserSwipe = typeof userSwipes.$inferSelect;
export type InsertUserSavedProperty = z.infer<typeof insertUserSavedPropertySchema>;
export type UserSavedProperty = typeof userSavedProperties.$inferSelect;
export type InsertPropertyShare = z.infer<typeof insertPropertyShareSchema>;
export type PropertyShare = typeof propertyShares.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPropertyReport = z.infer<typeof insertPropertyReportSchema>;
export type PropertyReport = typeof propertyReports.$inferSelect;
export type InsertReportPackage = z.infer<typeof insertReportPackageSchema>;
export type ReportPackage = typeof reportPackages.$inferSelect;
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

// Frontend offer schema - only fields that come from the client
export const frontendOfferSchema = createInsertSchema(offers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  // Property details are added by server
  propertyAddress: true,
  propertyLotNumber: true,
  propertyCertificateOfTitle: true,
  propertyZoning: true,
  propertyLandArea: true,
  propertyFloorArea: true,
  // User IDs are added by server
  buyerId: true,
  sellerId: true,
  // Email tracking is managed by server
  emailSent: true,
  emailSentAt: true,
  pdfGenerated: true,
  pdfUrl: true,
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

// Insert schemas for analytics tables
export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertStripeEventSchema = createInsertSchema(stripeEvents).omit({
  id: true,
  processed: true,
  createdAt: true,
});

export const insertPropertyPaymentSessionSchema = createInsertSchema(propertyPaymentSessions).omit({
  id: true,
  status: true,
  completedAt: true,
  createdAt: true,
});

export const insertServiceOrderSchema = createInsertSchema(serviceOrders).omit({
  id: true,
  status: true,
  paidAt: true,
  completedAt: true,
  createdAt: true,
});

export const insertServiceInquirySchema = createInsertSchema(serviceInquiries).omit({
  id: true,
  status: true,
  createdAt: true,
});

export const insertPropertyEventSchema = createInsertSchema(propertyEvents).omit({
  id: true,
  occurredAt: true,
  createdAt: true,
});

export const insertEngagementEventSchema = createInsertSchema(engagementEvents).omit({
  id: true,
  occurredAt: true,
  createdAt: true,
});

export const insertOperatingCostSchema = createInsertSchema(operatingCosts).omit({
  id: true,
  addedBy: true, // Server adds this after auth
  createdAt: true,
});

export const insertDailyMetricsSchema = createInsertSchema(dailyMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAIUsageLogSchema = createInsertSchema(aiUsageLogs).omit({
  id: true,
  createdAt: true,
});

// Type exports for analytics tables
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertStripeEvent = z.infer<typeof insertStripeEventSchema>;
export type StripeEvent = typeof stripeEvents.$inferSelect;
export type InsertPropertyPaymentSession = z.infer<typeof insertPropertyPaymentSessionSchema>;
export type PropertyPaymentSession = typeof propertyPaymentSessions.$inferSelect;
export type InsertServiceOrder = z.infer<typeof insertServiceOrderSchema>;
export type ServiceOrder = typeof serviceOrders.$inferSelect;
export type InsertServiceInquiry = z.infer<typeof insertServiceInquirySchema>;
export type ServiceInquiry = typeof serviceInquiries.$inferSelect;
export type InsertPropertyEvent = z.infer<typeof insertPropertyEventSchema>;
export type PropertyEvent = typeof propertyEvents.$inferSelect;
export type InsertEngagementEvent = z.infer<typeof insertEngagementEventSchema>;
export type EngagementEvent = typeof engagementEvents.$inferSelect;
export type InsertOperatingCost = z.infer<typeof insertOperatingCostSchema>;
export type OperatingCost = typeof operatingCosts.$inferSelect;
export type InsertDailyMetrics = z.infer<typeof insertDailyMetricsSchema>;
export type DailyMetrics = typeof dailyMetrics.$inferSelect;
export type InsertAIUsageLog = z.infer<typeof insertAIUsageLogSchema>;
export type AIUsageLog = typeof aiUsageLogs.$inferSelect;

// ============================================================================
// OFFER WIZARD TABLES - Property Purchase Offers with ADLS Integration
// ============================================================================

// Main property offers table (HouseMatch Offer Wizard - comprehensive ADLS-integrated system)
export const propertyOffers = pgTable("property_offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // References
  propertyId: varchar("property_id").references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  buyerId: varchar("buyer_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // PHASE 1 ESSENTIAL: Buyer Contact Information (Step 0: Your Details)
  buyerFullName: text("buyer_full_name"),
  buyerPhone: text("buyer_phone"),
  buyerEmail: text("buyer_email"),
  buyerAddress: text("buyer_address"),
  buyingEntityType: text("buying_entity_type"), // 'individual', 'trust', 'company'
  trustOrCompanyName: text("trust_or_company_name"),
  
  // PHASE 1 ESSENTIAL: Property Confirmation (Step 1)
  propertyLegalDescription: text("property_legal_description"),
  propertyTitleReference: text("property_title_reference"),
  propertyType: text("property_type"), // 'freehold', 'leasehold', 'cross-lease', 'unit-title', 'stratum', 'other'
  
  // Offer details
  offerPrice: decimal("offer_price", { precision: 12, scale: 2 }).notNull(),
  depositAmount: decimal("deposit_amount", { precision: 12, scale: 2 }).notNull(),
  depositPaymentDate: timestamp("deposit_payment_date").notNull(),
  balancePayable: decimal("balance_payable", { precision: 12, scale: 2 }), // Calculated: offerPrice - depositAmount
  balancePayableDate: timestamp("balance_payable_date"), // Typically same as settlementDate
  settlementDate: timestamp("settlement_date").notNull(),
  
  // PHASE 1 ESSENTIAL: Required Yes/No Toggles (Step 1) with deadlines
  financeRequired: boolean("finance_required"),
  financeAmount: decimal("finance_amount", { precision: 12, scale: 2 }),
  financeDeadline: timestamp("finance_deadline"),
  limRequired: boolean("lim_required"),
  limDeadline: timestamp("lim_deadline"),
  buildingInspectionRequired: boolean("building_inspection_required"),
  buildingInspectionDeadline: timestamp("building_inspection_deadline"),
  methTestRequired: boolean("meth_test_required"),
  methTestDeadline: timestamp("meth_test_deadline"),
  
  // Status tracking
  status: text("status").notNull().default('draft'), // draft, pending, accepted, rejected, conditional, unconditional, withdrawn, cancelled, settled
  
  // Wizard completion tracking
  wizardStep: integer("wizard_step").default(0), // Changed to 0 to account for new Step 0
  wizardCompleted: boolean("wizard_completed").default(false),
  
  // Document generation
  adlsFormPurchased: boolean("adls_form_purchased").default(false),
  adlsFormPurchaseDate: timestamp("adls_form_purchase_date"),
  adlsFormCost: decimal("adls_form_cost", { precision: 10, scale: 2 }).default('136.85'),
  pdfGenerated: boolean("pdf_generated").default(false),
  pdfUrl: text("pdf_url"),
  
  // Digital signing
  docusignEnvelopeId: text("docusign_envelope_id"),
  docusignStatus: text("docusign_status"),
  signedByBuyerAt: timestamp("signed_by_buyer_at"),
  signedByVendorAt: timestamp("signed_by_vendor_at"),
  
  // Timestamps
  submittedAt: timestamp("submitted_at"),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// PHASE 1: Simplified Lawyer/Solicitor Information (Step 4)
export const offerBuyerDetails = pgTable("offer_buyer_details", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").references(() => propertyOffers.id, { onDelete: 'cascade' }).notNull(),
  
  // Simplified lawyer section (3 fields max)
  haveLawyer: boolean("have_lawyer").default(false), // Yes/No/Need recommendation
  lawyerStatus: text("lawyer_status"), // 'have_one', 'need_one', 'need_recommendation'
  lawyerName: text("lawyer_name"), // Combined law firm or lawyer name
  lawyerEmail: text("lawyer_email"),
  
  // Removed fields: buyerOccupation, solicitorPhone, solicitorAddress
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// PHASE 1 NEW: Tenancy Information (Step 3)
export const offerTenancy = pgTable("offer_tenancy", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").references(() => propertyOffers.id, { onDelete: 'cascade' }).notNull(),
  
  // Tenancy status
  isCurrentlyTenanted: boolean("is_currently_tenanted").notNull(),
  
  // Tenant details (conditional - only if tenanted)
  tenantName: text("tenant_name"),
  weeklyRent: decimal("weekly_rent", { precision: 10, scale: 2 }),
  leaseEndDate: timestamp("lease_end_date"),
  bondAmount: decimal("bond_amount", { precision: 10, scale: 2 }),
  keepTenant: boolean("keep_tenant"), // true = subject to tenancy, false = vacant possession
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Conditions attached to the offer
export const offerConditions = pgTable("offer_conditions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").references(() => propertyOffers.id, { onDelete: 'cascade' }).notNull(),
  
  // Condition type: finance, lim_report, building_inspection, title_search, valuation, insurance, sale_of_buyers_property, custom
  conditionType: text("condition_type").notNull(),
  
  // Condition details
  description: text("description").notNull(),
  daysToSatisfy: integer("days_to_satisfy").notNull().default(10),
  dueDate: timestamp("due_date").notNull(),
  
  // Status: pending, satisfied, waived, failed
  status: text("status").notNull().default('pending'),
  
  // Supporting documents
  documents: json("documents").$type<Array<{ name: string; url: string; uploaded_at: string }>>().default([]),
  
  // Notes
  notes: text("notes"),
  
  satisfiedAt: timestamp("satisfied_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chattels (items included/excluded in the sale)
export const offerChattels = pgTable("offer_chattels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").references(() => propertyOffers.id, { onDelete: 'cascade' }).notNull(),
  
  chattelType: text("chattel_type").notNull(), // 'included' or 'excluded'
  itemDescription: text("item_description").notNull(),
  quantity: integer("quantity").default(1),
  
  // Common chattels reference
  isStandard: boolean("is_standard").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Standard chattels reference table (pre-populated)
export const standardChattels = pgTable("standard_chattels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  description: text("description").notNull(),
  typicallyIncluded: boolean("typically_included").default(true),
  displayOrder: integer("display_order").default(0),
});

// Timeline/activity log for offers
export const offerActivities = pgTable("offer_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").references(() => propertyOffers.id, { onDelete: 'cascade' }).notNull(),
  
  activityType: text("activity_type").notNull(),
  description: text("description").notNull(),
  metadata: json("metadata").$type<Record<string, any>>().default({}),
  
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages between buyer and vendor
export const offerMessages = pgTable("offer_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").references(() => propertyOffers.id, { onDelete: 'cascade' }).notNull(),
  
  senderId: varchar("sender_id").references(() => users.id).notNull(),
  messageText: text("message_text").notNull(),
  
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas with Zod validation
export const insertPropertyOfferSchema = createInsertSchema(propertyOffers).omit({
  id: true,
  wizardStep: true,
  wizardCompleted: true,
  adlsFormPurchased: true,
  adlsFormPurchaseDate: true,
  adlsFormCost: true,
  pdfGenerated: true,
  pdfUrl: true,
  docusignEnvelopeId: true,
  docusignStatus: true,
  signedByBuyerAt: true,
  signedByVendorAt: true,
  submittedAt: true,
  acceptedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOfferBuyerDetailsSchema = createInsertSchema(offerBuyerDetails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOfferConditionSchema = createInsertSchema(offerConditions).omit({
  id: true,
  satisfiedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOfferChattelSchema = createInsertSchema(offerChattels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStandardChattelSchema = createInsertSchema(standardChattels).omit({
  id: true,
});

export const insertOfferActivitySchema = createInsertSchema(offerActivities).omit({
  id: true,
  createdAt: true,
});

export const insertOfferMessageSchema = createInsertSchema(offerMessages).omit({
  id: true,
  isRead: true,
  readAt: true,
  createdAt: true,
});

export const insertOfferTenancySchema = createInsertSchema(offerTenancy).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ===== SENTRY ERROR MONITORING SYSTEM =====

// Service Partners - Companies in the partner network (Two-Tier System)
// Tier 1: Preferred Clients (monthly subscription for referral listings)
// Tier 2: Service Partners (commission-based full transaction management)
export const servicePartners = pgTable("service_partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Account Type - TWO-TIER SYSTEM
  accountType: text("account_type").notNull().default('service_partner'), // 'preferred_client' or 'service_partner' or 'dual'
  
  // Company details
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  
  // Services they offer (can offer multiple)
  serviceTypes: json("service_types").$type<string[]>().notNull(), // ['home_staging', 'cleaning', 'moving', 'legal', 'mortgage_broker']
  regions: json("regions").$type<string[]>().notNull(), // ['Auckland', 'Wellington', 'Christchurch']
  
  // Business details
  businessAddress: text("business_address"),
  gstNumber: text("gst_number").notNull(), // NZ GST number (required for all NZ businesses)
  website: text("website"),
  description: text("description"),
  logo: text("logo"),
  
  // TIER 1: Preferred Client Subscription (Monthly Fee Model)
  stripeCustomerId: varchar("stripe_customer_id"), // Stripe customer ID
  stripeSubscriptionId: varchar("stripe_subscription_id"), // Active subscription ID
  subscriptionStatus: text("subscription_status"), // 'active', 'past_due', 'canceled', 'incomplete'
  subscriptionPlan: text("subscription_plan").default('preferred_monthly'), // 'preferred_monthly', 'preferred_annual'
  currentPeriodEnd: timestamp("current_period_end"), // When subscription renews/expires
  monthlyFee: decimal("monthly_fee", { precision: 10, scale: 2 }).default('99.00'), // Monthly subscription fee (NZD)
  
  // TIER 2: Service Partner Commission (Commission-Based Model)
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default('10.00'), // Percentage (e.g., 10.00 = 10%)
  stripeAccountId: varchar("stripe_account_id"), // For Stripe Connect payouts
  stripeConnectOnboarded: boolean("stripe_connect_onboarded").default(false), // Has completed Stripe Connect onboarding
  
  // Status and verification (applies to both tiers)
  status: text("status").default('pending'), // 'pending', 'active', 'inactive', 'suspended'
  verifiedAt: timestamp("verified_at"),
  
  // MVP: Manual Verification (Admin approval before activation)
  verificationStatus: text("verification_status").default('pending'), // 'pending', 'approved_pending_payment', 'verified', 'rejected'
  verificationNotes: text("verification_notes"), // Admin notes during manual review
  verifiedBy: varchar("verified_by").references(() => users.id), // Which admin verified this partner
  
  // MVP: Payment Tracking (Manual payouts via bank transfer for service partners)
  bankAccountName: text("bank_account_name"), // For manual bank transfers (service partners)
  bankAccountNumber: text("bank_account_number"), // For manual bank transfers (service partners)
  
  // Performance metrics (primarily for service partners)
  totalJobsCompleted: integer("total_jobs_completed").default(0),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }), // 0-5 star average
  totalEarnings: integer("total_earnings").default(0), // in cents
  totalReferrals: integer("total_referrals").default(0), // Count of referrals (preferred clients)
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Partner Users - Login credentials for partner portal
export const partnerUsers = pgTable("partner_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").references(() => servicePartners.id).notNull(),
  
  // Login credentials
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // Hashed with scrypt
  name: text("name").notNull(),
  
  // Role and permissions
  role: text("role").default('staff'), // 'admin', 'staff' (admin can manage multiple staff)
  
  // Status
  status: text("status").default('active'), // 'active', 'inactive'
  lastLogin: timestamp("last_login"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Partner Updates - Status updates from partners on service orders
export const partnerUpdates = pgTable("partner_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceOrderId: varchar("service_order_id").references(() => serviceOrders.id).notNull(),
  partnerId: varchar("partner_id").references(() => servicePartners.id).notNull(),
  partnerUserId: varchar("partner_user_id").references(() => partnerUsers.id), // Who made the update
  
  // Update details
  status: text("status").notNull(), // 'accepted', 'scheduled', 'in_progress', 'completed', 'cancelled'
  message: text("message"), // Partner's notes
  photos: json("photos").$type<string[]>(), // Before/after photos
  
  // Scheduling
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Service Reviews - Customer reviews of partner work
export const serviceReviews = pgTable("service_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceOrderId: varchar("service_order_id").references(() => serviceOrders.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  partnerId: varchar("partner_id").references(() => servicePartners.id).notNull(),
  
  // Review content
  rating: integer("rating").notNull(), // 1-5 stars
  review: text("review"),
  
  // Partner response
  response: text("response"),
  respondedAt: timestamp("responded_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Service Insights - Track service impact on property sales for data-driven recommendations
export const serviceInsights = pgTable("service_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  
  // Services used
  servicesUsed: json("services_used").$type<string[]>().notNull(), // ['home_staging', 'building_inspection']
  totalServiceCost: integer("total_service_cost").default(0), // in cents
  
  // Sale outcome
  salePrice: integer("sale_price"), // in cents (null if not sold yet)
  daysToSale: integer("days_to_sale"), // Days from listing to sale
  priceChange: integer("price_change"), // Difference from asking price (positive or negative)
  
  // Engagement metrics
  viewsBeforeService: integer("views_before_service").default(0),
  viewsAfterService: integer("views_after_service").default(0),
  likesBeforeService: integer("likes_before_service").default(0),
  likesAfterService: integer("likes_after_service").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sentryErrors = pgTable("sentry_errors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Sentry event data
  sentryEventId: text("sentry_event_id").notNull().unique(), // Unique event ID from Sentry
  issueId: text("issue_id"), // Sentry issue ID (groups similar errors)
  level: text("level").notNull(), // error, warning, info, fatal
  message: text("message").notNull(), // Error message
  culprit: text("culprit"), // File/function where error occurred
  platform: text("platform"), // javascript, python, etc.
  environment: text("environment"), // development, production
  
  // Error details
  stackTrace: json("stack_trace").$type<any>(), // Full stack trace
  tags: json("tags").$type<Record<string, string>>(), // Custom tags
  context: json("context").$type<any>(), // Additional context
  user: json("user").$type<{ id?: string; email?: string; name?: string }>(), // User info
  request: json("request").$type<{ url?: string; method?: string; headers?: Record<string, string> }>(), // Request details
  
  // Metadata
  eventCount: integer("event_count").default(1), // How many times this error occurred
  firstSeen: timestamp("first_seen").notNull(),
  lastSeen: timestamp("last_seen").notNull(),
  url: text("url"), // Link to Sentry issue
  
  // Processing status
  analyzed: boolean("analyzed").default(false), // Has AI analyzed this?
  severity: text("severity").default('medium'), // low, medium, high, critical
  category: text("category"), // auto-fixable, needs-review, informational, infrastructure
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const errorAnalysis = pgTable("error_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  errorId: varchar("error_id").references(() => sentryErrors.id).notNull(),
  
  // AI Analysis
  aiModel: text("ai_model").notNull(), // claude-sonnet-4-20250514, gpt-3.5-turbo, etc.
  analysis: text("analysis").notNull(), // AI's detailed analysis of the error
  rootCause: text("root_cause"), // Identified root cause
  affectedUsers: integer("affected_users"), // Estimated number of affected users
  businessImpact: text("business_impact"), // critical, high, medium, low
  
  // Fix suggestions
  suggestedFix: text("suggested_fix"), // AI's suggested fix
  fixConfidence: decimal("fix_confidence", { precision: 3, scale: 2 }), // 0-1 confidence score
  fixType: text("fix_type"), // simple, moderate, complex
  estimatedFixTime: integer("estimated_fix_time"), // Estimated time in minutes
  
  // Related information
  similarErrors: json("similar_errors").$type<string[]>(), // IDs of similar errors
  relatedFiles: json("related_files").$type<string[]>(), // Files that need changes
  testSuggestions: text("test_suggestions"), // How to test the fix
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const errorFixes = pgTable("error_fixes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  errorId: varchar("error_id").references(() => sentryErrors.id).notNull(),
  analysisId: varchar("analysis_id").references(() => errorAnalysis.id),
  
  // Fix details
  fixDescription: text("fix_description").notNull(),
  fixCode: text("fix_code"), // Actual code changes
  filesChanged: json("files_changed").$type<string[]>(), // List of files modified
  
  // Status tracking
  status: text("status").default('pending'), // pending, approved, rejected, applied, failed
  appliedBy: varchar("applied_by").references(() => users.id), // Who applied the fix
  appliedAt: timestamp("applied_at"),
  
  // Testing
  tested: boolean("tested").default(false),
  testResults: text("test_results"),
  
  // Verification
  resolved: boolean("resolved").default(false), // Did this fix resolve the error?
  verifiedAt: timestamp("verified_at"),
  notes: text("notes"), // Admin notes
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Early Bird Promotion - Launch Special: First 100 Listings FREE!
export const earlyBirdPromotion = pgTable("early_bird_promotion", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Promotion Configuration
  name: text("name").notNull().default('Launch Special: First 100 Listings FREE!'),
  description: text("description").default('Be one of the first 100 property owners to list for FREE! Limited time only.'),
  totalLimit: integer("total_limit").notNull().default(100), // Total number of free listings
  totalUsed: integer("total_used").notNull().default(0), // How many have been used
  isActive: boolean("is_active").notNull().default(true), // Can be turned on/off
  
  // Tracking
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"), // When promotion ended (manually or when limit reached)
  
  // Metadata
  createdBy: varchar("created_by").references(() => users.id), // Admin who created it
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Early Bird Usage Tracking - Individual listing records
export const earlyBirdUsage = pgTable("early_bird_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  promotionId: varchar("promotion_id").references(() => earlyBirdPromotion.id).notNull(),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  
  // Tracking
  usageNumber: integer("usage_number").notNull(), // Which number they were (1-100)
  appliedAt: timestamp("applied_at").defaultNow(),
});

// Insert schemas for partner ecosystem
export const insertServicePartnerSchema = createInsertSchema(servicePartners).omit({
  id: true,
  status: true,
  verifiedAt: true,
  totalJobsCompleted: true,
  averageRating: true,
  totalEarnings: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPartnerUserSchema = createInsertSchema(partnerUsers).omit({
  id: true,
  status: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPartnerUpdateSchema = createInsertSchema(partnerUpdates).omit({
  id: true,
  createdAt: true,
});

export const insertServiceReviewSchema = createInsertSchema(serviceReviews).omit({
  id: true,
  response: true,
  respondedAt: true,
  createdAt: true,
});

export const insertServiceInsightSchema = createInsertSchema(serviceInsights).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports for partner ecosystem
export type InsertServicePartner = z.infer<typeof insertServicePartnerSchema>;
export type ServicePartner = typeof servicePartners.$inferSelect;
export type InsertPartnerUser = z.infer<typeof insertPartnerUserSchema>;
export type PartnerUser = typeof partnerUsers.$inferSelect;
export type InsertPartnerUpdate = z.infer<typeof insertPartnerUpdateSchema>;
export type PartnerUpdate = typeof partnerUpdates.$inferSelect;
export type InsertServiceReview = z.infer<typeof insertServiceReviewSchema>;
export type ServiceReview = typeof serviceReviews.$inferSelect;
export type InsertServiceInsight = z.infer<typeof insertServiceInsightSchema>;
export type ServiceInsight = typeof serviceInsights.$inferSelect;

// Insert schemas for error monitoring
export const insertSentryErrorSchema = createInsertSchema(sentryErrors).omit({
  id: true,
  analyzed: true,
  createdAt: true,
  updatedAt: true,
});

export const insertErrorAnalysisSchema = createInsertSchema(errorAnalysis).omit({
  id: true,
  createdAt: true,
});

export const insertErrorFixSchema = createInsertSchema(errorFixes).omit({
  id: true,
  appliedAt: true,
  verifiedAt: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports for error monitoring
export type InsertSentryError = z.infer<typeof insertSentryErrorSchema>;
export type SentryError = typeof sentryErrors.$inferSelect;
export type InsertErrorAnalysis = z.infer<typeof insertErrorAnalysisSchema>;
export type ErrorAnalysis = typeof errorAnalysis.$inferSelect;
export type InsertErrorFix = z.infer<typeof insertErrorFixSchema>;
export type ErrorFix = typeof errorFixes.$inferSelect;

// Type exports for offer wizard tables
export type InsertPropertyOffer = z.infer<typeof insertPropertyOfferSchema>;
export type PropertyOffer = typeof propertyOffers.$inferSelect;
export type InsertOfferBuyerDetails = z.infer<typeof insertOfferBuyerDetailsSchema>;
export type OfferBuyerDetails = typeof offerBuyerDetails.$inferSelect;
export type InsertOfferCondition = z.infer<typeof insertOfferConditionSchema>;
export type OfferCondition = typeof offerConditions.$inferSelect;
export type InsertOfferChattel = z.infer<typeof insertOfferChattelSchema>;
export type OfferChattel = typeof offerChattels.$inferSelect;
export type InsertStandardChattel = z.infer<typeof insertStandardChattelSchema>;
export type StandardChattel = typeof standardChattels.$inferSelect;
export type InsertOfferActivity = z.infer<typeof insertOfferActivitySchema>;
export type OfferActivity = typeof offerActivities.$inferSelect;
export type InsertOfferMessage = z.infer<typeof insertOfferMessageSchema>;
export type OfferMessage = typeof offerMessages.$inferSelect;
export type InsertOfferTenancy = z.infer<typeof insertOfferTenancySchema>;
export type OfferTenancy = typeof offerTenancy.$inferSelect;

// Insert schemas for early bird promotion
export const insertEarlyBirdPromotionSchema = createInsertSchema(earlyBirdPromotion).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEarlyBirdUsageSchema = createInsertSchema(earlyBirdUsage).omit({
  id: true,
  appliedAt: true,
});

// Type exports for early bird promotion
export type InsertEarlyBirdPromotion = z.infer<typeof insertEarlyBirdPromotionSchema>;
export type EarlyBirdPromotion = typeof earlyBirdPromotion.$inferSelect;
export type InsertEarlyBirdUsage = z.infer<typeof insertEarlyBirdUsageSchema>;

// ===== AI SCOUT / LIFESTYLE SWAP TABLES =====

export const lifestyleScouts = pgTable("lifestyle_scouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("active"), // active, paused, matched, completed
  // Current property (the "Have")
  currentSuburb: text("current_suburb").notNull(),
  currentCity: text("current_city").notNull(),
  currentPropertyType: text("current_property_type").notNull(), // residential, lifestyle, rural, apartment
  currentBedrooms: integer("current_bedrooms"),
  estimatedValue: text("estimated_value"), // e.g. "$850,000"
  // Target property (the "Want")
  targetSuburb: text("target_suburb").notNull(),
  targetCity: text("target_city").notNull(),
  targetPropertyType: text("target_property_type").notNull(),
  targetBedrooms: integer("target_bedrooms"),
  maxTopUp: text("max_top_up"), // maximum extra cash willing to spend
  moveByDate: text("move_by_date"),
  // Lifestyle transition type
  transitionType: text("transition_type").notNull(), // city_to_rural, rural_to_city, upsizing, downsizing, coastal, lifestyle_change
  additionalNotes: text("additional_notes"),
  // Notification preferences
  notifyEmail: boolean("notify_email").default(true),
  lastScannedAt: timestamp("last_scanned_at"),
  matchCount: integer("match_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const scoutMatches = pgTable("scout_matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scoutId: varchar("scout_id").notNull().references(() => lifestyleScouts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  matchedScoutId: varchar("matched_scout_id").references(() => lifestyleScouts.id),
  matchedPropertyId: varchar("matched_property_id").references(() => properties.id),
  matchScore: integer("match_score").notNull(), // 0-100
  matchReason: text("match_reason"),
  matchType: text("match_type").notNull(), // direct_swap, lifestyle_match, partial_match
  status: text("status").notNull().default("new"), // new, viewed, contacted, rejected
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLifestyleScoutSchema = createInsertSchema(lifestyleScouts).omit({
  id: true,
  status: true,
  lastScannedAt: true,
  matchCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScoutMatchSchema = createInsertSchema(scoutMatches).omit({
  id: true,
  createdAt: true,
});

export type InsertLifestyleScout = z.infer<typeof insertLifestyleScoutSchema>;
export type LifestyleScout = typeof lifestyleScouts.$inferSelect;
export type InsertScoutMatch = z.infer<typeof insertScoutMatchSchema>;
export type ScoutMatch = typeof scoutMatches.$inferSelect;

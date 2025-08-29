import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),  // Back to auto-generated UUIDs
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  userId: true,  // Added - server adds this after auth
  views: true,
  likes: true,
  saves: true,
  createdAt: true,
  updatedAt: true,
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

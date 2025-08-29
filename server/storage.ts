import { type User, type InsertUser, type Property, type InsertProperty, type UserSwipe, type InsertUserSwipe, type UserPreferences, type InsertUserPreferences, type PurchaseOrder, type InsertPurchaseOrder, users, properties, userSwipes, userPreferences, purchaseOrders } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Properties
  getProperty(id: string): Promise<Property | undefined>;
  getAllProperties(): Promise<Property[]>;
  getPropertiesByType(type: string): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  updatePropertyMetrics(id: string, views?: number, likes?: number, saves?: number): Promise<void>;
  searchProperties(query: { suburb?: string; propertyType?: string; minPrice?: number; maxPrice?: number }): Promise<Property[]>;

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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private properties: Map<string, Property>;
  private userSwipes: Map<string, UserSwipe>;
  private userPreferences: Map<string, UserPreferences>;
  private purchaseOrders: Map<string, PurchaseOrder>;

  constructor() {
    this.users = new Map();
    this.properties = new Map();
    this.userSwipes = new Map();
    this.userPreferences = new Map();
    this.purchaseOrders = new Map();
    this.seedProperties();
  }

  private seedProperties() {
    const mockProperties = [
      {
        userId: "demo-user",
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
        userId: "demo-user",
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
        selfDeclaration: true
      },
      {
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
        description: "Charming villa with character features",
        additionalImages: [
          "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1571055107559-3e67626fa8be?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        views: 203,
        likes: 31,
        saves: 12,
        isLinzValidated: false,
        selfDeclaration: true
      },
      {
        title: "Modern Rental",
        address: "78 Manukau Road, Auckland",
        suburb: "Epsom",
        price: "$650/week",
        bedrooms: 3,
        bathrooms: 2,
        floorArea: 120,
        landArea: 300,
        propertyType: "rental",
        lotNumber: "Lot 12 DP 890123",
        certificateOfTitle: "CT 890123/012",
        zoning: "Residential",
        yearBuilt: 2015,
        imageUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        description: "Modern rental property near good schools",
        additionalImages: [
          "https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1586105251261-72a756497a11?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1554995207-c18c203602cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        views: 134,
        likes: 19,
        saves: 7,
        isLinzValidated: true,
        selfDeclaration: true
      },
      {
        title: "Office Building",
        address: "67 High Street, Auckland Central",
        suburb: "Auckland Central",
        price: "$2,500,000",
        bedrooms: 0,
        bathrooms: 4,
        floorArea: 450,
        landArea: 0,
        propertyType: "commercial",
        lotNumber: "Lot 1 DP 789012",
        certificateOfTitle: "CT 789012/345",
        zoning: "Commercial",
        yearBuilt: 2010,
        imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        description: "Prime commercial office space",
        additionalImages: [
          "https://images.unsplash.com/photo-1497366811353-6870744d04b2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        views: 67,
        likes: 8,
        saves: 3,
        isLinzValidated: false,
        selfDeclaration: true
      },
      {
        title: "Waterfront Apartment",
        address: "234 Oriental Parade, Wellington",
        suburb: "Oriental Bay",
        price: "$1,450,000",
        bedrooms: 3,
        bathrooms: 2,
        floorArea: 140,
        landArea: 0,
        propertyType: "residential",
        lotNumber: "Lot 5 DP 123456",
        certificateOfTitle: "CT 123456/789",
        zoning: "Residential",
        yearBuilt: 2019,
        imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        description: "Stunning waterfront views",
        additionalImages: [
          "https://images.unsplash.com/photo-1505843513577-22bb7d21e455?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1549517045-bc93de075e53?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1523755231516-e43fd2e8dca5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        views: 312,
        likes: 45,
        saves: 18
      },
      {
        title: "Contemporary Townhouse",
        address: "156 Remuera Road, Auckland",
        suburb: "Remuera",
        price: "$1,180,000",
        bedrooms: 4,
        bathrooms: 3,
        floorArea: 200,
        landArea: 250,
        propertyType: "residential",
        lotNumber: "Lot 7 DP 234567",
        certificateOfTitle: "CT 234567/890",
        zoning: "Residential",
        yearBuilt: 2021,
        imageUrl: "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        description: "Brand new contemporary design",
        additionalImages: [
          "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1560440021-33f9b867899d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        views: 98,
        likes: 27,
        saves: 11
      },
      {
        title: "Character Bungalow",
        address: "45 Fendalton Road, Christchurch",
        suburb: "Fendalton",
        price: "$890,000",
        bedrooms: 3,
        bathrooms: 1,
        floorArea: 130,
        landArea: 800,
        propertyType: "residential",
        lotNumber: "Lot 9 DP 345678",
        certificateOfTitle: "CT 345678/901",
        zoning: "Residential",
        yearBuilt: 1925,
        imageUrl: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        description: "Beautiful character home",
        additionalImages: [
          "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        views: 156,
        likes: 22,
        saves: 9
      },
      {
        title: "Executive Apartment",
        address: "12 Princes Street, Auckland",
        suburb: "Auckland Central",
        price: "$1,100,000",
        bedrooms: 2,
        bathrooms: 2,
        floorArea: 110,
        landArea: 0,
        propertyType: "residential",
        lotNumber: "Lot 11 DP 456789",
        certificateOfTitle: "CT 456789/012",
        zoning: "Residential",
        yearBuilt: 2017,
        imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        description: "Executive apartment in prime location",
        additionalImages: [
          "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1549517045-bc93de075e53?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1540932239986-30128078f3c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        views: 89,
        likes: 16,
        saves: 6
      },
      {
        title: "Student Accommodation",
        address: "67 Hillsborough Road, Auckland",
        suburb: "Hillsborough",
        price: "$480/week",
        bedrooms: 4,
        bathrooms: 2,
        floorArea: 140,
        landArea: 400,
        propertyType: "rental",
        lotNumber: "Lot 13 DP 567890",
        certificateOfTitle: "CT 567890/123",
        zoning: "Residential",
        yearBuilt: 2005,
        imageUrl: "https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        description: "Perfect for students or young professionals",
        additionalImages: [
          "https://images.unsplash.com/photo-1560448075-bb485b067938?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1554995207-c18c203602cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        views: 234,
        likes: 38,
        saves: 14
      },
      {
        title: "Retail Space",
        address: "89 Cuba Street, Wellington",
        suburb: "Te Aro",
        price: "$550,000",
        bedrooms: 0,
        bathrooms: 1,
        floorArea: 80,
        landArea: 0,
        propertyType: "commercial",
        lotNumber: "Lot 2 DP 678901",
        certificateOfTitle: "CT 678901/234",
        zoning: "Commercial",
        yearBuilt: 1980,
        imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        description: "Prime retail space on Cuba Street",
        additionalImages: [
          "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        views: 145,
        likes: 12,
        saves: 4
      },
      {
        title: "Warehouse Conversion",
        address: "123 Karangahape Road, Auckland",
        suburb: "Auckland Central",
        price: "$850,000",
        bedrooms: 2,
        bathrooms: 1,
        floorArea: 160,
        landArea: 0,
        propertyType: "residential",
        lotNumber: "Lot 6 DP 789012",
        certificateOfTitle: "CT 789012/456",
        zoning: "Mixed Use",
        yearBuilt: 1990,
        imageUrl: "https://images.unsplash.com/photo-1560448075-bb485b067938?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        description: "Unique warehouse conversion",
        additionalImages: [
          "https://images.unsplash.com/photo-1586105251261-72a756497a11?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        views: 178,
        likes: 29,
        saves: 13
      },
      {
        title: "Family Home",
        address: "34 Riccarton Road, Christchurch",
        suburb: "Riccarton",
        price: "$650,000",
        bedrooms: 4,
        bathrooms: 2,
        floorArea: 170,
        landArea: 650,
        propertyType: "residential",
        lotNumber: "Lot 10 DP 890123",
        certificateOfTitle: "CT 890123/567",
        zoning: "Residential",
        yearBuilt: 2000,
        imageUrl: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        description: "Spacious family home near university",
        additionalImages: [
          "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        views: 201,
        likes: 33,
        saves: 15
      },
      {
        title: "Penthouse Suite",
        address: "56 Albert Street, Auckland",
        suburb: "Auckland Central",
        price: "$2,200,000",
        bedrooms: 3,
        bathrooms: 3,
        floorArea: 220,
        landArea: 0,
        propertyType: "residential",
        lotNumber: "Lot 14 DP 012345",
        certificateOfTitle: "CT 012345/678",
        zoning: "Residential",
        yearBuilt: 2022,
        imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        description: "Luxury penthouse with city views",
        additionalImages: [
          "https://images.unsplash.com/photo-1560448075-bb485b067938?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1523755231516-e43fd2e8dca5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        views: 87,
        likes: 41,
        saves: 19
      },
      {
        title: "Beachfront Rental",
        address: "78 Marine Parade, Napier",
        suburb: "Napier South",
        price: "$750/week",
        bedrooms: 3,
        bathrooms: 2,
        floorArea: 150,
        landArea: 0,
        propertyType: "rental",
        lotNumber: "Lot 15 DP 123456",
        certificateOfTitle: "CT 123456/890",
        zoning: "Residential",
        yearBuilt: 2016,
        imageUrl: "https://images.unsplash.com/photo-1520637836862-4d197d17c46a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        description: "Beachfront holiday rental",
        additionalImages: [
          "https://images.unsplash.com/photo-1505843513577-22bb7d21e455?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1549517045-bc93de075e53?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1540932239986-30128078f3c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        views: 289,
        likes: 52,
        saves: 22
      },
      {
        title: "Industrial Warehouse",
        address: "123 Carbine Road, Auckland",
        suburb: "Mount Wellington",
        price: "$1,800,000",
        bedrooms: 0,
        bathrooms: 2,
        floorArea: 800,
        landArea: 2000,
        propertyType: "commercial",
        lotNumber: "Lot 3 DP 234567",
        certificateOfTitle: "CT 234567/012",
        zoning: "Industrial",
        yearBuilt: 2008,
        imageUrl: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        description: "Large industrial warehouse facility",
        additionalImages: [
          "https://images.unsplash.com/photo-1565444563072-6c8065ade936?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        views: 56,
        likes: 7,
        saves: 2
      },
      {
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
          "https://images.unsplash.com/photo-1560448075-bb485b067938?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1505843513577-22bb7d21e455?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        views: 156,
        likes: 67,
        saves: 28
      },
      {
        title: "City Apartment",
        address: "23 Willis Street, Wellington",
        suburb: "Wellington Central",
        price: "$580,000",
        bedrooms: 1,
        bathrooms: 1,
        floorArea: 55,
        landArea: 0,
        propertyType: "residential",
        lotNumber: "Lot 4 DP 456789",
        certificateOfTitle: "CT 456789/234",
        zoning: "Residential",
        yearBuilt: 2012,
        imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        description: "Compact city apartment",
        additionalImages: [
          "https://images.unsplash.com/photo-1586105251261-72a756497a11?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1540932239986-30128078f3c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        views: 123,
        likes: 18,
        saves: 6
      },
      {
        title: "Suburban House",
        address: "67 Lincoln Road, Christchurch",
        suburb: "Addington",
        price: "$520,000",
        bedrooms: 3,
        bathrooms: 1,
        floorArea: 120,
        landArea: 700,
        propertyType: "residential",
        lotNumber: "Lot 8 DP 567890",
        certificateOfTitle: "CT 567890/345",
        zoning: "Residential",
        yearBuilt: 1985,
        imageUrl: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        description: "Classic suburban family home",
        additionalImages: [
          "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        views: 167,
        likes: 24,
        saves: 10
      },
      {
        title: "Office Lease",
        address: "12 Customs Street, Auckland",
        suburb: "Auckland Central",
        price: "$8,500/month",
        bedrooms: 0,
        bathrooms: 2,
        floorArea: 200,
        landArea: 0,
        propertyType: "lease",
        lotNumber: "Lot 7 DP 678901",
        certificateOfTitle: "CT 678901/456",
        zoning: "Commercial",
        yearBuilt: 2015,
        imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        description: "Premium office space for lease",
        additionalImages: [
          "https://images.unsplash.com/photo-1497366811353-6870744d04b2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        views: 78,
        likes: 9,
        saves: 3
      }
    ];

    mockProperties.forEach(property => {
      this.createProperty(property);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async getProperty(id: string): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async getAllProperties(): Promise<Property[]> {
    return Array.from(this.properties.values()).filter(p => p.isActive);
  }

  async getPropertiesByType(type: string): Promise<Property[]> {
    return Array.from(this.properties.values()).filter(p => p.propertyType === type && p.isActive);
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const id = randomUUID();
    const property: Property = {
      ...insertProperty,
      id,
      views: insertProperty.views || 0,
      likes: insertProperty.likes || 0,
      saves: insertProperty.saves || 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.properties.set(id, property);
    return property;
  }

  async updatePropertyMetrics(id: string, views?: number, likes?: number, saves?: number): Promise<void> {
    const property = this.properties.get(id);
    if (property) {
      if (views !== undefined) property.views = views;
      if (likes !== undefined) property.likes = likes;
      if (saves !== undefined) property.saves = saves;
      property.updatedAt = new Date();
      this.properties.set(id, property);
    }
  }

  async searchProperties(query: { suburb?: string; propertyType?: string; minPrice?: number; maxPrice?: number }): Promise<Property[]> {
    return Array.from(this.properties.values()).filter(property => {
      if (!property.isActive) return false;
      if (query.suburb && !property.suburb.toLowerCase().includes(query.suburb.toLowerCase())) return false;
      if (query.propertyType && property.propertyType !== query.propertyType) return false;
      // Add price filtering logic if needed
      return true;
    });
  }

  async createUserSwipe(insertSwipe: InsertUserSwipe): Promise<UserSwipe> {
    const id = randomUUID();
    const swipe: UserSwipe = {
      ...insertSwipe,
      id,
      createdAt: new Date(),
    };
    this.userSwipes.set(id, swipe);
    return swipe;
  }

  async getUserSwipes(userId: string): Promise<UserSwipe[]> {
    return Array.from(this.userSwipes.values()).filter(swipe => swipe.userId === userId);
  }

  async getUserSwipeCount(userId: string): Promise<number> {
    return Array.from(this.userSwipes.values()).filter(swipe => swipe.userId === userId).length;
  }

  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    return Array.from(this.userPreferences.values()).find(pref => pref.userId === userId);
  }

  async createOrUpdateUserPreferences(insertPreferences: InsertUserPreferences): Promise<UserPreferences> {
    const existing = Array.from(this.userPreferences.values()).find(pref => pref.userId === insertPreferences.userId);
    
    if (existing) {
      const updated: UserPreferences = {
        ...existing,
        ...insertPreferences,
        updatedAt: new Date(),
      };
      this.userPreferences.set(existing.id, updated);
      return updated;
    } else {
      const id = randomUUID();
      const preferences: UserPreferences = {
        ...insertPreferences,
        id,
        updatedAt: new Date(),
      };
      this.userPreferences.set(id, preferences);
      return preferences;
    }
  }

  async createPurchaseOrder(insertOrder: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const id = randomUUID();
    const order: PurchaseOrder = {
      ...insertOrder,
      id,
      createdAt: new Date(),
      completedAt: null,
    };
    this.purchaseOrders.set(id, order);
    return order;
  }

  async getUserPurchaseOrders(userId: string): Promise<PurchaseOrder[]> {
    return Array.from(this.purchaseOrders.values()).filter(order => order.userId === userId);
  }

  async updatePurchaseOrderStatus(id: string, status: string): Promise<void> {
    const order = this.purchaseOrders.get(id);
    if (order) {
      order.status = status;
      if (status === 'completed') {
        order.completedAt = new Date();
      }
      this.purchaseOrders.set(id, order);
    }
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property || undefined;
  }

  async getAllProperties(): Promise<Property[]> {
    return await db.select().from(properties).where(eq(properties.isActive, true));
  }

  async getPropertiesByType(type: string): Promise<Property[]> {
    return await db.select().from(properties).where(and(eq(properties.propertyType, type), eq(properties.isActive, true)));
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const [property] = await db.insert(properties).values([insertProperty]).returning();
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
}

export const storage = new DatabaseStorage();

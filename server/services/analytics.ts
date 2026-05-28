import { UserSwipe, Property } from "@shared/schema";
import { IStorage } from "../storage";

interface UserPreferences {
  preferredPropertyTypes: string[];
  preferredPriceRange: { min: number; max: number };
  preferredBedrooms: number[];
  preferredBathrooms: number[];
  preferredSuburbs: string[];
  likeRatio: number;
  totalSwipes: number;
}

interface PropertyScore {
  property: Property;
  score: number;
  reasons: string[];
}

export class AnalyticsService {
  constructor(private storage: IStorage) {}

  async analyzeUserPreferences(userId: string): Promise<UserPreferences> {
    const swipes = await this.storage.getUserSwipes(userId);
    const likedSwipes = swipes.filter(s => s.action === 'like' || s.action === 'super_like');
    const dislikedSwipes = swipes.filter(s => s.action === 'dislike');

    // Get properties for analysis
    const likedPropertyIds = likedSwipes.map(s => s.propertyId).filter(Boolean) as string[];
    const dislikedPropertyIds = dislikedSwipes.map(s => s.propertyId).filter(Boolean) as string[];
    
    const likedProperties: Property[] = [];
    const dislikedProperties: Property[] = [];

    // Fetch liked properties
    for (const id of likedPropertyIds) {
      try {
        const property = await this.storage.getProperty(id);
        if (property) likedProperties.push(property);
      } catch (error) {
        console.warn(`Could not fetch property ${id}:`, error);
      }
    }

    // Fetch disliked properties
    for (const id of dislikedPropertyIds) {
      try {
        const property = await this.storage.getProperty(id);
        if (property) dislikedProperties.push(property);
      } catch (error) {
        console.warn(`Could not fetch property ${id}:`, error);
      }
    }

    const preferences: UserPreferences = {
      preferredPropertyTypes: this.extractPreferredPropertyTypes(likedProperties, dislikedProperties),
      preferredPriceRange: this.extractPreferredPriceRange(likedProperties),
      preferredBedrooms: this.extractPreferredBedrooms(likedProperties),
      preferredBathrooms: this.extractPreferredBathrooms(likedProperties),
      preferredSuburbs: this.extractPreferredSuburbs(likedProperties),
      likeRatio: swipes.length > 0 ? likedSwipes.length / swipes.length : 0,
      totalSwipes: swipes.length
    };

    return preferences;
  }

  async getPersonalizedProperties(userId: string, limit = 20): Promise<PropertyScore[]> {
    // FIXED: Memory bomb - use batched queries instead of loading all properties
    const userSwipes = await this.storage.getUserSwipes(userId);
    const swipedPropertyIds = new Set(userSwipes.map(s => s.propertyId));
    
    // Fetch properties in batches until we have enough unswiped ones
    // This prevents loading entire property table into memory
    const unswipedProperties: Property[] = [];
    const batchSize = 50;
    let offset = 0;
    
    // Continue until we have enough unswiped properties OR no more exist in DB
    // No arbitrary limit - ensures heavy users still get recommendations
    while (unswipedProperties.length < limit) {
      const batchProperties = await this.storage.getPropertiesBatch(batchSize, offset);
      
      if (batchProperties.length === 0) {
        break; // No more properties in database
      }
      
      // Filter out already swiped properties from this batch
      const batchUnswipedProperties = batchProperties.filter(p => !swipedPropertyIds.has(p.id));
      unswipedProperties.push(...batchUnswipedProperties);
      
      offset += batchSize;
    }

    if (userSwipes.length < 3) {
      // Not enough data for personalization, return random selection
      return unswipedProperties.slice(0, limit).map(property => ({
        property,
        score: 0.5,
        reasons: ['New user - showing diverse properties']
      }));
    }

    const preferences = await this.analyzeUserPreferences(userId);
    const scoredProperties = unswipedProperties.map(property => 
      this.scoreProperty(property, preferences)
    );

    // Sort by score and return top results
    return scoredProperties
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private scoreProperty(property: Property, preferences: UserPreferences): PropertyScore {
    let score = 0.5; // Base score
    const reasons: string[] = [];

    // Property type preference (high weight)
    if (preferences.preferredPropertyTypes.includes(property.propertyType)) {
      score += 0.25;
      reasons.push(`Matches preferred ${property.propertyType} type`);
    }

    // Price range preference
    const price = this.extractNumericPrice(property.price);
    if (price >= preferences.preferredPriceRange.min && price <= preferences.preferredPriceRange.max) {
      score += 0.15;
      reasons.push('Within preferred price range');
    }

    // Bedroom preference
    if (property.bedrooms !== null && preferences.preferredBedrooms.includes(property.bedrooms)) {
      score += 0.1;
      reasons.push(`${property.bedrooms} bedrooms match preference`);
    }

    // Bathroom preference
    if (property.bathrooms !== null && preferences.preferredBathrooms.includes(property.bathrooms)) {
      score += 0.1;
      reasons.push(`${property.bathrooms} bathrooms match preference`);
    }

    // Suburb preference
    if (preferences.preferredSuburbs.includes(property.suburb)) {
      score += 0.2;
      reasons.push(`Located in preferred ${property.suburb}`);
    }

    // Boost popular properties for users with high like ratio
    if (preferences.likeRatio > 0.6) {
      const popularityBoost = (property.likes || 0) * 0.001;
      score += popularityBoost;
      if (popularityBoost > 0.01) {
        reasons.push('Popular property');
      }
    }

    // Normalize score between 0 and 1
    score = Math.min(1, Math.max(0, score));

    return { property, score, reasons };
  }

  private extractPreferredPropertyTypes(liked: Property[], disliked: Property[]): string[] {
    const likedTypes = liked.map(p => p.propertyType);
    const dislikedTypes = disliked.map(p => p.propertyType);
    
    // Count occurrences
    const typeCounts: Record<string, number> = {};
    likedTypes.forEach(type => typeCounts[type] = (typeCounts[type] || 0) + 1);
    dislikedTypes.forEach(type => typeCounts[type] = (typeCounts[type] || 0) - 0.5);

    // Return types with positive scores
    return Object.entries(typeCounts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type);
  }

  private extractPreferredPriceRange(liked: Property[]): { min: number; max: number } {
    if (liked.length === 0) {
      return { min: 0, max: 10000000 }; // Default wide range
    }

    const prices = liked.map(p => this.extractNumericPrice(p.price)).filter(p => p > 0);
    if (prices.length === 0) {
      return { min: 0, max: 10000000 };
    }

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // Add some buffer around the range
    const buffer = (maxPrice - minPrice) * 0.2;
    return {
      min: Math.max(0, minPrice - buffer),
      max: maxPrice + buffer
    };
  }

  private extractPreferredBedrooms(liked: Property[]): number[] {
    const bedroomCounts: Record<number, number> = {};
    liked.forEach(p => {
      if (p.bedrooms !== null) {
        bedroomCounts[p.bedrooms] = (bedroomCounts[p.bedrooms] || 0) + 1;
      }
    });

    return Object.entries(bedroomCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3) // Top 3 preferred bedroom counts
      .map(([bedrooms]) => parseInt(bedrooms));
  }

  private extractPreferredBathrooms(liked: Property[]): number[] {
    const bathroomCounts: Record<number, number> = {};
    liked.forEach(p => {
      if (p.bathrooms !== null) {
        bathroomCounts[p.bathrooms] = (bathroomCounts[p.bathrooms] || 0) + 1;
      }
    });

    return Object.entries(bathroomCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3) // Top 3 preferred bathroom counts
      .map(([bathrooms]) => parseInt(bathrooms));
  }

  private extractPreferredSuburbs(liked: Property[]): string[] {
    const suburbCounts: Record<string, number> = {};
    liked.forEach(p => {
      suburbCounts[p.suburb] = (suburbCounts[p.suburb] || 0) + 1;
    });

    return Object.entries(suburbCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // Top 5 preferred suburbs
      .map(([suburb]) => suburb);
  }

  private extractNumericPrice(price: string): number {
    // Extract numbers from price string (handles $500,000, $500K, etc.)
    const numbers = price.match(/[\d,]+/g);
    if (!numbers) return 0;
    
    const numStr = numbers[0].replace(/,/g, '');
    let num = parseInt(numStr);
    
    // Handle K and M suffixes
    if (price.toLowerCase().includes('k')) {
      num *= 1000;
    } else if (price.toLowerCase().includes('m')) {
      num *= 1000000;
    }
    
    return num;
  }
}
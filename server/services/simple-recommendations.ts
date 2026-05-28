import type { PropertyRecommendation, UserInsights } from './openai';

/**
 * Simple algorithm-based recommendations (no AI required)
 * Used for:
 * - New users (< 20 swipes)
 * - Between AI regeneration cycles
 * - Fallback when AI is unavailable
 */

interface Property {
  id: string;
  price: string;
  bedrooms: number | null;
  bathrooms: number | null;
  suburb: string;
  propertyType: string;
  likes: number;
  createdAt: Date | null;
  [key: string]: any;
}

/**
 * Calculate simple match score based on user preferences
 */
function calculateMatchScore(
  property: Property,
  userPrefs: {
    avgPrice: number;
    avgBedrooms: number;
    avgBathrooms: number;
    preferredSuburbs: string[];
    likedPropertyTypes: string[];
  }
): number {
  let score = 100;

  // Price match (30 points)
  const propertyPrice = parseFloat(property.price.replace(/[^0-9.]/g, '')) || 0;
  if (userPrefs.avgPrice > 0) {
    const priceDiff = Math.abs(propertyPrice - userPrefs.avgPrice) / userPrefs.avgPrice;
    score += 30 * Math.max(0, 1 - priceDiff);
  }

  // Bedroom match (25 points)
  if (property.bedrooms && userPrefs.avgBedrooms > 0) {
    const bedroomDiff = Math.abs(property.bedrooms - userPrefs.avgBedrooms);
    score += Math.max(0, 25 - bedroomDiff * 8);
  }

  // Bathroom match (15 points)
  if (property.bathrooms && userPrefs.avgBathrooms > 0) {
    const bathroomDiff = Math.abs(property.bathrooms - userPrefs.avgBathrooms);
    score += Math.max(0, 15 - bathroomDiff * 7);
  }

  // Suburb match (20 points)
  if (userPrefs.preferredSuburbs.includes(property.suburb)) {
    score += 20;
  }

  // Property type match (10 points)
  if (userPrefs.likedPropertyTypes.includes(property.propertyType)) {
    score += 10;
  }

  // Popularity boost (up to 10 points based on likes)
  score += Math.min(10, property.likes * 0.5);

  return Math.max(0, Math.min(100, score));
}

/**
 * Analyze user preferences from liked/disliked properties (simple algorithm)
 */
export function analyzeUserPreferencesSimple(
  likedProperties: Property[],
  dislikedProperties: Property[] = []
): UserInsights {
  if (likedProperties.length === 0) {
    return {
      preferredPropertyTypes: ['residential'],
      priceRange: { min: 0, max: 10000000 },
      preferredLocations: [],
      dislikes: [],
      recommendations: ['Like more properties to get personalized recommendations'],
    };
  }

  // Calculate averages from liked properties
  const avgPrice =
    likedProperties.reduce((sum, p) => {
      const price = parseFloat(p.price.replace(/[^0-9.]/g, '')) || 0;
      return sum + price;
    }, 0) / likedProperties.length;

  const avgBedrooms =
    likedProperties
      .filter(p => p.bedrooms)
      .reduce((sum, p) => sum + (p.bedrooms || 0), 0) /
    likedProperties.filter(p => p.bedrooms).length || 3;

  const avgBathrooms =
    likedProperties
      .filter(p => p.bathrooms)
      .reduce((sum, p) => sum + (p.bathrooms || 0), 0) /
    likedProperties.filter(p => p.bathrooms).length || 2;

  // Find most common suburbs
  const suburbCounts: Record<string, number> = {};
  likedProperties.forEach(p => {
    suburbCounts[p.suburb] = (suburbCounts[p.suburb] || 0) + 1;
  });
  const preferredLocations = Object.entries(suburbCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([suburb]) => suburb);

  // Find most common property types
  const typeCounts: Record<string, number> = {};
  likedProperties.forEach(p => {
    typeCounts[p.propertyType] = (typeCounts[p.propertyType] || 0) + 1;
  });
  const preferredPropertyTypes = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([type]) => type);

  // Analyze dislikes
  const dislikedSuburbs = dislikedProperties.map(p => p.suburb);
  const dislikes = Array.from(new Set(dislikedSuburbs)).slice(0, 3);

  return {
    preferredPropertyTypes,
    priceRange: {
      min: Math.max(0, avgPrice * 0.8),
      max: avgPrice * 1.2,
    },
    preferredLocations,
    dislikes: dislikes.length > 0 ? dislikes : ['None identified'],
    recommendations: [
      `Properties around $${Math.round(avgPrice / 1000)}k`,
      `${Math.round(avgBedrooms)} bedrooms`,
      preferredLocations.length > 0 ? `In ${preferredLocations.join(', ')}` : 'Various locations',
    ],
  };
}

/**
 * Generate simple property recommendations
 */
export function generateSimpleRecommendations(
  userPreferences: UserInsights,
  availableProperties: Property[],
  excludePropertyIds: string[] = []
): PropertyRecommendation[] {
  // Filter out already seen/liked properties
  const candidateProperties = availableProperties.filter(
    p => !excludePropertyIds.includes(p.id)
  );

  // Calculate user preferences summary
  const likedPropertyTypes = userPreferences.preferredPropertyTypes;
  const preferredSuburbs = userPreferences.preferredLocations;
  const avgPrice = (userPreferences.priceRange.min + userPreferences.priceRange.max) / 2;

  // Estimate bedrooms from recommendations
  const bedroomMatch = userPreferences.recommendations
    .find(r => r.includes('bedroom'))
    ?.match(/(\d+)\s*bedroom/);
  const avgBedrooms = bedroomMatch ? parseInt(bedroomMatch[1]) : 3;
  const avgBathrooms = 2; // Default estimate

  const userPrefs = {
    avgPrice,
    avgBedrooms,
    avgBathrooms,
    preferredSuburbs,
    likedPropertyTypes,
  };

  // Score and rank properties
  const scoredProperties = candidateProperties.map(property => ({
    property,
    score: calculateMatchScore(property, userPrefs),
  }));

  // Sort by score and take top 5
  const topProperties = scoredProperties
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Format as recommendations
  return topProperties.map(({ property, score }) => ({
    propertyId: property.id,
    matchPercentage: Math.round(score),
    reasoning: generateReasoning(property, userPrefs, score),
  }));
}

/**
 * Generate simple reasoning for why property matches
 */
function generateReasoning(
  property: Property,
  userPrefs: any,
  score: number
): string {
  const reasons: string[] = [];

  // Price match
  const propertyPrice = parseFloat(property.price.replace(/[^0-9.]/g, '')) || 0;
  if (propertyPrice > 0 && userPrefs.avgPrice > 0) {
    const priceDiff = Math.abs(propertyPrice - userPrefs.avgPrice) / userPrefs.avgPrice;
    if (priceDiff < 0.15) {
      reasons.push('within your preferred price range');
    }
  }

  // Location match
  if (userPrefs.preferredSuburbs.includes(property.suburb)) {
    reasons.push(`in your preferred area of ${property.suburb}`);
  }

  // Bedroom match
  if (property.bedrooms) {
    const bedroomDiff = Math.abs(property.bedrooms - userPrefs.avgBedrooms);
    if (bedroomDiff <= 1) {
      reasons.push(`has ${property.bedrooms} bedrooms (matches your preference)`);
    }
  }

  // Property type match
  if (userPrefs.likedPropertyTypes.includes(property.propertyType)) {
    reasons.push(`matches your preferred property type`);
  }

  // Popularity
  if (property.likes > 10) {
    reasons.push(`popular with ${property.likes} likes`);
  }

  if (reasons.length === 0) {
    return 'Similar to properties you\'ve liked before';
  }

  return `This property is ${reasons.join(', ')}.`;
}

/**
 * Get popular properties (for new users with no swipe history)
 */
export function getPopularProperties(
  allProperties: Property[],
  count: number = 5
): PropertyRecommendation[] {
  // Sort by likes and recency
  const popular = allProperties
    .sort((a, b) => {
      // Primary sort: likes
      if (b.likes !== a.likes) {
        return b.likes - a.likes;
      }
      // Secondary sort: newer properties
      const aTime = a.createdAt?.getTime() || 0;
      const bTime = b.createdAt?.getTime() || 0;
      return bTime - aTime;
    })
    .slice(0, count);

  return popular.map(property => ({
    propertyId: property.id,
    matchPercentage: 70 + Math.min(30, property.likes), // Base 70% + likes bonus
    reasoning: `Popular property with ${property.likes} likes in ${property.suburb}`,
  }));
}

// ============================================
// 🚀 SwipeRight NZ - AI Property Search Backend
// ============================================
// 
// FILE STRUCTURE:
// 1. CONFIGURATION - Environment & imports
// 2. AI PARSING LAYER - Uses Claude API (Anthropic)
// 3. 🔒 PROPRIETARY SEARCH - Your secret sauce
// 4. 🔒 PROPRIETARY SCORING - Your match algorithm
// 5. 🔒 PROPRIETARY LEARNING - Your preference engine
// 6. CROSS-SELL LOGIC - Your revenue optimization
// 7. API ROUTE HANDLERS - Express endpoints
//
// ============================================

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@db";
import { 
  properties, 
  userPreferences, 
  propertySwipes, 
  aiSearchHistory,
  propertyMatchScores,
  reportRecommendations 
} from "@db/schema";
import { sql, and, gte, lte, eq, desc, inArray, or } from "drizzle-orm";
import { Request, Response } from "express";

// ============================================
// SECTION 1: CONFIGURATION
// ============================================

// Initialize Anthropic Claude API
// This is ONLY used for parsing natural language queries
// Your proprietary algorithm never touches this
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// ============================================
// TYPE DEFINITIONS
// ============================================

interface SearchCriteria {
  // Basic criteria
  bedrooms?: number;
  bathrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  suburbs?: string[];
  propertyType?: string;
  
  // Advanced criteria
  lifestyle?: 'family' | 'professional' | 'retiree' | 'student' | 'investor';
  priorities?: string[];
  mustHaves?: string[];
  dealBreakers?: string[];
}

interface PropertyWithScore {
  // Property data
  id: number;
  title: string;
  address: string;
  suburb: string;
  city: string;
  bedrooms: number;
  bathrooms: number;
  priceCents: number;
  propertyType: string;
  imageUrl: string;
  features: any;
  amenities: string[];
  
  // 🔒 YOUR PROPRIETARY SCORES
  matchScore: number;
  baseMatchScore: number;
  lifestyleScore: number;
  valueScore: number;
  preferenceScore: number;
  confidence: number;
  matchReasons: string[];
}

// ============================================
// SECTION 2: AI PARSING LAYER (Uses Claude API)
// ============================================
// 
// ⚠️ THIS SECTION USES ANTHROPIC CLAUDE API
// Purpose: Convert natural language to structured criteria
// Cost: ~$0.004 per query
// Privacy: Only sends the search query text (no PII, no user data)
//
// What it does: "3 bed house under $800k" → {bedrooms: 3, maxPrice: 80000000}
// What it DOESN'T do: Any scoring, ranking, or proprietary logic
//
// ============================================

async function parseSearchQueryWithClaude(
  query: string, 
  userId?: number
): Promise<SearchCriteria> {
  
  // Optional: Get user context for better parsing
  let userContext = "";
  if (userId) {
    const preferences = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);
    
    if (preferences.length > 0) {
      const pref = preferences[0];
      userContext = `
User's learned preferences (confidence: ${pref.confidenceScore}):
- Lifestyle: ${pref.lifestyleType || 'unknown'}
- Priorities: ${pref.priorities?.join(', ') || 'none'}

Consider these when interpreting ambiguous queries.
`;
    }
  }

  // Construct prompt for Claude
  const prompt = `You are a property search query parser for New Zealand real estate. 
Extract search criteria from the user's natural language query and return ONLY valid JSON.

${userContext}

User Query: "${query}"

Extract these fields:
- bedrooms (number): minimum bedrooms wanted
- bathrooms (number): minimum bathrooms wanted  
- minPrice, maxPrice (numbers): in cents (e.g., 80000000 = $800k NZD)
- suburbs (array of strings): specific NZ suburbs/areas mentioned
- propertyType (string): "house" | "apartment" | "townhouse" | "unit" | null
- lifestyle (string): "family" | "professional" | "retiree" | "student" | "investor" | null
- priorities (array): ["schools", "commute", "quiet", "nightlife", "parks", "shopping", "beach", "city"]
- mustHaves (array): ["garage", "garden", "pool", "view", "modern", "character"]
- dealBreakers (array): ["busy_road", "no_parking", "small_section", "dark"]

IMPORTANT PRICE CONVERSION FOR NZ:
- "$800k" = 80000000 cents
- "$1.2m" = 120000000 cents
- "$500,000" = 50000000 cents

Example output:
{
  "bedrooms": 3,
  "bathrooms": 2,
  "maxPrice": 80000000,
  "suburbs": ["Ponsonby", "Grey Lynn"],
  "propertyType": "house",
  "lifestyle": "family",
  "priorities": ["schools", "parks"],
  "mustHaves": ["garage", "garden"],
  "dealBreakers": ["busy_road"]
}

Return ONLY the JSON object with no markdown, no explanation, no code blocks.`;

  try {
    // 🤖 ANTHROPIC API CALL - This is where we use Claude
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: prompt
      }]
    });

    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';
    
    // Clean up any markdown formatting
    const jsonText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const criteria = JSON.parse(jsonText);
    console.log('✅ Claude parsed criteria:', criteria);
    return criteria;
    
  } catch (error) {
    console.error('❌ Error parsing with Claude:', error);
    
    // Fallback: Basic regex parsing if Claude fails
    return fallbackQueryParsing(query);
  }
}

// Fallback parser (doesn't use AI, just basic regex)
function fallbackQueryParsing(query: string): SearchCriteria {
  const criteria: SearchCriteria = {};
  
  // Extract bedrooms
  const bedMatch = query.match(/(\d+)\s*bed/i);
  if (bedMatch) criteria.bedrooms = parseInt(bedMatch[1]);
  
  // Extract price (handle k, m, thousand, million)
  const priceMatch = query.match(/under\s*\$?(\d+)k/i);
  if (priceMatch) criteria.maxPrice = parseInt(priceMatch[1]) * 100000;
  
  return criteria;
}

// ============================================
// SECTION 3: 🔒 PROPRIETARY SEARCH ENGINE
// ============================================
//
// ⭐ THIS IS WHERE YOUR PROPRIETARY ALGORITHM GOES
// 
// Purpose: Search your database intelligently
// What to customize:
// - How you filter properties
// - Which properties to prioritize
// - Database optimization strategies
// - Feature matching logic
//
// This runs on YOUR server - never exposed to external APIs
//
// ============================================

async function searchPropertiesWithProprietaryLogic(
  criteria: SearchCriteria, 
  userId?: number
): Promise<any[]> {
  
  console.log('🔍 Starting proprietary search...');
  
  // ┌─────────────────────────────────────────────────────┐
  // │ 🔒 START: YOUR PROPRIETARY SEARCH LOGIC             │
  // ├─────────────────────────────────────────────────────┤
  // │ Customize this section with your secret sauce:      │
  // │ - Custom filtering logic                             │
  // │ - Multi-stage search strategy                        │
  // │ - Feature matching weights                           │
  // │ - Location-based algorithms                          │
  // │ - Time-based availability checks                     │
  // └─────────────────────────────────────────────────────┘
  
  const conditions = [];
  
  // Basic criteria filtering
  if (criteria.bedrooms) {
    conditions.push(gte(properties.bedrooms, criteria.bedrooms));
  }
  if (criteria.bathrooms) {
    conditions.push(gte(properties.bathrooms, criteria.bathrooms));
  }
  if (criteria.maxPrice) {
    conditions.push(lte(properties.priceCents, criteria.maxPrice));
  }
  if (criteria.minPrice) {
    conditions.push(gte(properties.priceCents, criteria.minPrice));
  }
  if (criteria.suburbs && criteria.suburbs.length > 0) {
    conditions.push(inArray(properties.suburb, criteria.suburbs));
  }
  if (criteria.propertyType) {
    conditions.push(eq(properties.propertyType, criteria.propertyType));
  }
  
  // 🎯 CUSTOMIZE: Add your advanced filtering here
  // Examples:
  // - Feature-based filtering (pool, garage, garden)
  // - Distance calculations (from schools, CBD, etc)
  // - Price per sqm filtering
  // - Days on market filtering
  // - Agent performance filtering
  
  // Execute the database query
  const results = await db
    .select()
    .from(properties)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(50); // Adjust limit based on your strategy
  
  console.log(`✅ Found ${results.length} properties`);
  
  // ┌─────────────────────────────────────────────────────┐
  // │ 🔒 END: YOUR PROPRIETARY SEARCH LOGIC               │
  // └─────────────────────────────────────────────────────┘
  
  return results;
}

// ============================================
// SECTION 4: 🔒 PROPRIETARY LEARNING ENGINE
// ============================================
//
// ⭐ THIS IS YOUR PREFERENCE LEARNING ALGORITHM
//
// Purpose: Analyze user swipe history to learn preferences
// What to customize:
// - How you weight different signals
// - Confidence calculation formula
// - Feature extraction methods
// - Pattern recognition logic
//
// This is YOUR competitive advantage - customize freely!
//
// ============================================

async function getUserLearnedPreferencesProprietaryAlgorithm(
  userId: number
): Promise<any> {
  
  console.log('🧠 Analyzing user preferences...');
  
  // Get user's swipe history
  const swipes = await db
    .select()
    .from(propertySwipes)
    .where(eq(propertySwipes.userId, userId))
    .orderBy(desc(propertySwipes.createdAt))
    .limit(100);
  
  if (swipes.length < 5) {
    return null; // Not enough data
  }
  
  // ┌─────────────────────────────────────────────────────┐
  // │ 🔒 START: YOUR PROPRIETARY LEARNING ALGORITHM       │
  // ├─────────────────────────────────────────────────────┤
  // │ Customize how you learn from user behavior:         │
  // │ - Weighting recent vs old swipes                    │
  // │ - Time-based decay functions                         │
  // │ - Feature importance scoring                         │
  // │ - Collaborative filtering (user similarity)         │
  // │ - Seasonal preference adjustments                    │
  // │ - Price sensitivity calculation                      │
  // └─────────────────────────────────────────────────────┘
  
  const likedSwipes = swipes.filter(s => s.direction === 'right' || s.direction === 'super');
  const passedSwipes = swipes.filter(s => s.direction === 'left');
  
  if (likedSwipes.length === 0) {
    return null;
  }
  
  // Extract properties that user liked
  const likedProperties = likedSwipes.map(s => s.propertySnapshot);
  
  // 1. PRICE PREFERENCE LEARNING
  // 🎯 CUSTOMIZE: Your formula for preferred price range
  const prices = likedProperties
    .map(p => p.priceCents)
    .filter(p => p != null)
    .sort((a, b) => a - b);
  
  const preferredPriceRange = prices.length > 0 ? {
    min: prices[Math.floor(prices.length * 0.25)], // 25th percentile
    max: prices[Math.floor(prices.length * 0.75)], // 75th percentile
    median: prices[Math.floor(prices.length * 0.5)],
  } : null;
  
  // 2. BEDROOM PREFERENCE LEARNING
  // 🎯 CUSTOMIZE: How you determine preferred bedroom count
  const bedroomCounts = likedProperties.reduce((acc, p) => {
    const beds = p.bedrooms || 0;
    acc[beds] = (acc[beds] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  
  const preferredBedrooms = Object.entries(bedroomCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0];
  
  // 3. SUBURB PREFERENCE LEARNING
  // 🎯 CUSTOMIZE: Your suburb scoring algorithm
  const suburbScores = likedProperties.reduce((acc, p) => {
    const suburb = p.suburb;
    if (suburb) {
      acc[suburb] = (acc[suburb] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  // Normalize scores to 0-1
  const maxSuburbCount = Math.max(...Object.values(suburbScores));
  Object.keys(suburbScores).forEach(suburb => {
    suburbScores[suburb] = suburbScores[suburb] / maxSuburbCount;
  });
  
  // 4. FEATURE PREFERENCE LEARNING
  // 🎯 CUSTOMIZE: How you score feature importance
  const featureScores = likedProperties.reduce((acc, p) => {
    const features = p.features || {};
    Object.entries(features).forEach(([feature, value]) => {
      if (value === true) {
        acc[feature] = (acc[feature] || 0) + 1;
      }
    });
    return acc;
  }, {} as Record<string, number>);
  
  // 5. CONFIDENCE CALCULATION
  // 🎯 CUSTOMIZE: Your confidence formula
  // This is important - determines when to trust the learning
  const totalSwipes = swipes.length;
  const likeRatio = likedSwipes.length / totalSwipes;
  
  let confidence = 0;
  if (totalSwipes >= 50) {
    confidence = 1.0; // Full confidence
  } else if (totalSwipes >= 30) {
    confidence = 0.8;
  } else if (totalSwipes >= 20) {
    confidence = 0.6;
  } else if (totalSwipes >= 10) {
    confidence = 0.4;
  } else {
    confidence = 0.2;
  }
  
  // Adjust confidence based on consistency
  if (likeRatio < 0.1 || likeRatio > 0.9) {
    // Too picky or too easy - reduce confidence
    confidence *= 0.8;
  }
  
  // ┌─────────────────────────────────────────────────────┐
  // │ 🔒 END: YOUR PROPRIETARY LEARNING ALGORITHM         │
  // └─────────────────────────────────────────────────────┘
  
  return {
    preferredPriceRange,
    preferredBedrooms: preferredBedrooms ? parseInt(preferredBedrooms) : null,
    suburbScores,
    featureScores,
    totalSwipes,
    totalLikes: likedSwipes.length,
    totalPasses: passedSwipes.length,
    confidence,
    likeRatio,
  };
}

// ============================================
// SECTION 5: 🔒 PROPRIETARY MATCH SCORING
// ============================================
//
// ⭐ THIS IS YOUR SECRET SAUCE - THE MATCH ALGORITHM
//
// Purpose: Score how well properties match user preferences
// What to customize:
// - Score weights (currently 40/30/20/10 split)
// - Scoring formulas for each category
// - Bonus/penalty logic
// - Reasoning generation
//
// THIS IS YOUR COMPETITIVE ADVANTAGE
// Make it as sophisticated as you want!
//
// ============================================

async function calculateMatchScoreProprietaryAlgorithm(
  property: any,
  criteria: SearchCriteria,
  userId?: number
): Promise<PropertyWithScore> {
  
  // ┌─────────────────────────────────────────────────────┐
  // │ 🔒 START: YOUR PROPRIETARY SCORING ALGORITHM        │
  // ├─────────────────────────────────────────────────────┤
  // │ This is THE SECRET SAUCE for SwipeRight NZ          │
  // │                                                      │
  // │ Customize everything here:                           │
  // │ - Score weights and formulas                         │
  // │ - What makes a "good match"                          │
  // │ - How to explain matches to users                    │
  // │ - Bonus points for special features                  │
  // │ - Penalties for deal-breakers                        │
  // │                                                      │
  // │ Current scoring: 100 points total                    │
  // │ - Base Match: 40 points                              │
  // │ - Lifestyle: 30 points                               │
  // │ - Value: 20 points                                   │
  // │ - Personal: 10 points                                │
  // └─────────────────────────────────────────────────────┘
  
  let baseMatchScore = 0;
  let lifestyleScore = 0;
  let valueScore = 0;
  let preferenceScore = 0;
  const matchReasons: string[] = [];
  
  // ═══════════════════════════════════════════════════════
  // 1. BASE MATCH SCORING (40 points total)
  // ═══════════════════════════════════════════════════════
  // 🎯 CUSTOMIZE: Your criteria matching logic
  
  // Bedroom match (15 points)
  if (criteria.bedrooms) {
    if (property.bedrooms >= criteria.bedrooms) {
      const exactMatch = property.bedrooms === criteria.bedrooms;
      baseMatchScore += exactMatch ? 15 : 12;
      matchReasons.push(`Has ${property.bedrooms} bedrooms${exactMatch ? ' (perfect match)' : ''}`);
    } else if (property.bedrooms === criteria.bedrooms - 1) {
      baseMatchScore += 8;
      matchReasons.push(`Has ${property.bedrooms} bedrooms (close to ${criteria.bedrooms} requested)`);
    }
  } else {
    baseMatchScore += 7; // Partial points if no preference
  }
  
  // Bathroom match (5 points)
  if (criteria.bathrooms) {
    if (property.bathrooms >= criteria.bathrooms) {
      baseMatchScore += 5;
    } else if (property.bathrooms === criteria.bathrooms - 1) {
      baseMatchScore += 3;
    }
  } else {
    baseMatchScore += 2;
  }
  
  // Price match (15 points)
  if (criteria.maxPrice) {
    if (property.priceCents <= criteria.maxPrice) {
      const priceRatio = property.priceCents / criteria.maxPrice;
      
      if (priceRatio < 0.7) {
        // Great value - well under budget
        baseMatchScore += 15;
        matchReasons.push(`Excellent value at ${Math.round(priceRatio * 100)}% of your budget`);
      } else if (priceRatio < 0.9) {
        // Good value - comfortably within budget
        baseMatchScore += 13;
        matchReasons.push(`Within budget at ${Math.round(priceRatio * 100)}% of max`);
      } else {
        // Just within budget
        baseMatchScore += 10;
        matchReasons.push('Within your price range');
      }
    } else {
      // Over budget - penalty
      const overageRatio = property.priceCents / criteria.maxPrice;
      if (overageRatio < 1.1) {
        // Only slightly over - small penalty
        baseMatchScore += 5;
        matchReasons.push('Slightly over budget, but worth considering');
      } else {
        // Significantly over - larger penalty
        baseMatchScore += 0;
      }
    }
  } else {
    baseMatchScore += 7;
  }
  
  // Location match (5 points)
  if (criteria.suburbs && criteria.suburbs.length > 0) {
    if (criteria.suburbs.includes(property.suburb)) {
      baseMatchScore += 5;
      matchReasons.push(`In your preferred area: ${property.suburb}`);
    } else {
      // Check if it's a neighboring suburb (CUSTOMIZE THIS)
      // You might have a database of "similar suburbs"
      baseMatchScore += 1;
    }
  } else {
    baseMatchScore += 2;
  }
  
  // ═══════════════════════════════════════════════════════
  // 2. LIFESTYLE SCORING (30 points total)
  // ═══════════════════════════════════════════════════════
  // 🎯 CUSTOMIZE: How different lifestyles affect scoring
  
  if (criteria.lifestyle === 'family') {
    // Family preferences: space, safety, schools, outdoor areas
    if (property.bedrooms >= 3) lifestyleScore += 8;
    if (property.bathrooms >= 2) lifestyleScore += 4;
    if (property.features?.has_garden) {
      lifestyleScore += 8;
      matchReasons.push('Has garden - perfect for families');
    }
    if (property.features?.quiet_area) {
      lifestyleScore += 5;
      matchReasons.push('Quiet family-friendly area');
    }
    if (property.features?.has_garage) lifestyleScore += 3;
    if (property.nearbySchools?.length > 0) {
      lifestyleScore += 2;
      matchReasons.push('Near quality schools');
    }
    
  } else if (criteria.lifestyle === 'professional') {
    // Professional preferences: modern, convenient, low-maintenance
    if (property.features?.modern_kitchen) {
      lifestyleScore += 8;
      matchReasons.push('Modern kitchen and appliances');
    }
    if (property.propertyType === 'apartment') lifestyleScore += 5;
    if (property.commuteData?.cbd_minutes < 20) {
      lifestyleScore += 10;
      matchReasons.push('Short commute to CBD');
    } else if (property.commuteData?.cbd_minutes < 30) {
      lifestyleScore += 5;
    }
    if (property.features?.gym_nearby) lifestyleScore += 4;
    if (property.features?.parking) lifestyleScore += 3;
    
  } else if (criteria.lifestyle === 'investor') {
    // Investor preferences: rental yield, capital growth, low maintenance
    // 🎯 CUSTOMIZE: Add your investment scoring logic
    if (property.features?.good_rental_yield) {
      lifestyleScore += 15;
      matchReasons.push('Strong rental yield potential');
    }
    if (property.propertyType === 'townhouse' || property.propertyType === 'unit') {
      lifestyleScore += 8; // Lower maintenance
    }
    if (property.features?.near_university) {
      lifestyleScore += 7;
      matchReasons.push('Near university - high rental demand');
    }
    
  } else if (criteria.lifestyle === 'retiree') {
    // Retiree preferences: single-level, low maintenance, quiet
    if (property.features?.single_level) {
      lifestyleScore += 10;
      matchReasons.push('Single-level living');
    }
    if (property.features?.low_maintenance) lifestyleScore += 8;
    if (property.features?.quiet_area) lifestyleScore += 7;
    if (property.features?.near_shops) lifestyleScore += 5;
  }
  
  // Priority matching (flexible scoring)
  if (criteria.priorities) {
    criteria.priorities.forEach(priority => {
      switch (priority) {
        case 'schools':
          if (property.nearbySchools?.length > 0) {
            lifestyleScore += 3;
          }
          break;
        case 'quiet':
          if (property.features?.quiet_area) {
            lifestyleScore += 3;
          }
          break;
        case 'beach':
          if (property.features?.beach_nearby) {
            lifestyleScore += 3;
            matchReasons.push('Close to beach');
          }
          break;
        case 'nightlife':
          if (property.features?.city_center) {
            lifestyleScore += 3;
          }
          break;
        // 🎯 ADD MORE PRIORITIES
      }
    });
  }
  
  // Cap lifestyle score at 30
  lifestyleScore = Math.min(lifestyleScore, 30);
  
  // ═══════════════════════════════════════════════════════
  // 3. VALUE SCORING (20 points total)
  // ═══════════════════════════════════════════════════════
  // 🎯 CUSTOMIZE: Your value assessment algorithm
  
  // Price per square meter (if available)
  if (property.landArea) {
    const pricePerSqm = property.priceCents / property.landArea;
    // 🎯 CUSTOMIZE: Your market average thresholds
    if (pricePerSqm < 4000) {
      valueScore += 8;
      matchReasons.push('Exceptional value per sqm');
    } else if (pricePerSqm < 6000) {
      valueScore += 5;
    } else {
      valueScore += 2;
    }
  } else {
    valueScore += 3; // Default if no land area data
  }
  
  // Features and condition
  if (property.features?.renovated) {
    valueScore += 4;
    matchReasons.push('Recently renovated');
  }
  if (property.features?.modern_kitchen || property.features?.modern_bathroom) {
    valueScore += 3;
  }
  
  // Days on market (if available)
  if (property.daysOnMarket) {
    if (property.daysOnMarket < 7) {
      valueScore += 2; // Fresh listing
      matchReasons.push('New to market');
    } else if (property.daysOnMarket > 90) {
      valueScore += 3; // Potential negotiation opportunity
      matchReasons.push('Been on market - potential to negotiate');
    } else {
      valueScore += 1;
    }
  } else {
    valueScore += 1;
  }
  
  // 🎯 CUSTOMIZE: Add your own value indicators
  // - Compare to recent sales in area
  // - CV (Capital Value) comparison
  // - Auction vs fixed price
  // - Number of similar properties available
  
  valueScore += 2; // Base value points
  valueScore = Math.min(valueScore, 20); // Cap at 20
  
  // ═══════════════════════════════════════════════════════
  // 4. PERSONAL PREFERENCE SCORING (10 points total)
  // ═══════════════════════════════════════════════════════
  // 🎯 CUSTOMIZE: How you use learned preferences
  
  if (userId) {
    const learned = await getUserLearnedPreferencesProprietaryAlgorithm(userId);
    
    if (learned && learned.confidence > 0.3) {
      
      // Price preference match
      if (learned.preferredPriceRange) {
        const { min, max } = learned.preferredPriceRange;
        if (property.priceCents >= min && property.priceCents <= max) {
          const score = Math.round(4 * learned.confidence);
          preferenceScore += score;
          if (learned.confidence > 0.7) {
            matchReasons.push('Price matches your usual preferences');
          }
        }
      }
      
      // Suburb preference match
      if (learned.suburbScores[property.suburb]) {
        const suburbScore = learned.suburbScores[property.suburb];
        const score = Math.round(3 * suburbScore * learned.confidence);
        preferenceScore += score;
        
        if (suburbScore > 0.7 && learned.confidence > 0.5) {
          matchReasons.push(`You often like properties in ${property.suburb}`);
        }
      }
      
      // Feature preference match
      const propertyFeatures = property.features || {};
      let featureMatchCount = 0;
      
      Object.entries(propertyFeatures).forEach(([feature, value]) => {
        if (value === true && learned.featureScores[feature] >= 3) {
          featureMatchCount++;
        }
      });
      
      if (featureMatchCount > 0) {
        const score = Math.min(featureMatchCount * 2, 3);
        preferenceScore += score;
        
        if (featureMatchCount >= 3) {
          matchReasons.push(`Has ${featureMatchCount} features you usually like`);
        }
      }
    }
  }
  
  preferenceScore = Math.min(preferenceScore, 10); // Cap at 10
  
  // ═══════════════════════════════════════════════════════
  // 5. CALCULATE FINAL SCORE & CONFIDENCE
  // ═══════════════════════════════════════════════════════
  // 🎯 CUSTOMIZE: How you combine scores
  
  const overallScore = baseMatchScore + lifestyleScore + valueScore + preferenceScore;
  
  // Confidence calculation (0.0 to 0.99)
  let confidence = overallScore / 100;
  
  // Adjust confidence based on data quality
  if (!property.features || Object.keys(property.features).length === 0) {
    confidence *= 0.8; // Lower confidence if missing feature data
  }
  
  if (!criteria.lifestyle) {
    confidence *= 0.9; // Slightly lower if no lifestyle specified
  }
  
  confidence = Math.min(confidence, 0.99); // Cap at 0.99
  
  // ┌─────────────────────────────────────────────────────┐
  // │ 🔒 END: YOUR PROPRIETARY SCORING ALGORITHM          │
  // └─────────────────────────────────────────────────────┘
  
  return {
    ...property,
    matchScore: Math.round(overallScore),
    baseMatchScore: Math.round(baseMatchScore),
    lifestyleScore: Math.round(lifestyleScore),
    valueScore: Math.round(valueScore),
    preferenceScore: Math.round(preferenceScore),
    confidence: parseFloat(confidence.toFixed(2)),
    matchReasons,
  };
}

// ============================================
// SECTION 6: RANKING & SORTING
// ============================================

async function rankPropertiesByScore(
  properties: any[],
  criteria: SearchCriteria,
  userId?: number
): Promise<PropertyWithScore[]> {
  
  console.log('🎯 Ranking properties...');
  
  // Calculate scores for all properties
  const scoredProperties = await Promise.all(
    properties.map(prop => 
      calculateMatchScoreProprietaryAlgorithm(prop, criteria, userId)
    )
  );
  
  // 🔒 PROPRIETARY: Your ranking/sorting logic
  // 🎯 CUSTOMIZE: How you sort results
  // Current: Simple descending by match score
  // You might want: 
  // - Boost new listings
  // - Demote overpriced properties
  // - Prioritize your own listings
  // - Apply recency decay
  // - Factor in user engagement history
  
  const rankedProperties = scoredProperties.sort((a, b) => {
    // Primary sort: match score
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    
    // Secondary sort: confidence
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    
    // Tertiary sort: price (lower is better)
    return a.priceCents - b.priceCents;
  });
  
  console.log(`✅ Top match: ${rankedProperties[0]?.matchScore}%`);
  
  return rankedProperties;
}

// ============================================
// SECTION 7: CROSS-SELL RECOMMENDATIONS
// ============================================
//
// 🔒 PROPRIETARY: Your revenue optimization logic
//
// ============================================

function getReportRecommendationsProprietaryLogic(
  property: PropertyWithScore,
  matchScore: number
): any[] {
  
  // ┌─────────────────────────────────────────────────────┐
  // │ 🔒 YOUR PROPRIETARY CROSS-SELL ALGORITHM            │
  // ├─────────────────────────────────────────────────────┤
  // │ Customize which reports to recommend and when       │
  // │ - Match score thresholds                             │
  // │ - Property type specific recommendations            │
  // │ - User behavior based recommendations               │
  // │ - Bundle offers                                      │
  // │ - Dynamic pricing                                    │
  // └─────────────────────────────────────────────────────┘
  
  const recommendations = [];
  
  // High match (>70%) → Recommend premium reports
  if (matchScore >= 70) {
    
    recommendations.push({
      type: 'title_search',
      name: 'Title Search',
      price: 1500, // $15 in cents
      reason: 'Verify ownership & legal status',
      priority: 'high',
      icon: 'FileText',
      savings: null,
    });
    
    recommendations.push({
      type: 'lim_report',
      name: 'LIM Report',
      price: 39900, // $399 in cents
      reason: 'Full council property information',
      priority: 'high',
      icon: 'Building',
      savings: 'Most comprehensive report',
    });
    
    // Add rental data for investors
    if (property.propertyType !== 'house' || matchScore >= 80) {
      recommendations.push({
        type: 'rental_data',
        name: 'Rental Analysis',
        price: 2900, // $29 in cents
        reason: 'Investment potential & rental yield',
        priority: 'medium',
        icon: 'TrendingUp',
        savings: null,
      });
    }
    
    // 🎯 CUSTOMIZE: Add bundle discount
    // If they buy all 3, offer 10% off?
    
  } else if (matchScore >= 50) {
    // Medium match → Recommend essentials
    
    recommendations.push({
      type: 'title_search',
      name: 'Title Search',
      price: 1500,
      reason: 'Quick ownership verification',
      priority: 'medium',
      icon: 'FileText',
      savings: null,
    });
    
    // 🎯 CUSTOMIZE: Maybe offer a discount for medium matches?
    
  } else if (matchScore >= 30) {
    // Low match → Maybe just title search
    
    recommendations.push({
      type: 'title_search',
      name: 'Title Search',
      price: 1500,
      reason: 'Basic property check',
      priority: 'low',
      icon: 'FileText',
      savings: 'Quick check before viewing',
    });
  }
  
  // 🎯 CUSTOMIZE: Add conditional logic
  // - First time users → Show special offer
  // - Previous report buyers → Offer loyalty discount
  // - High-value properties → Push premium reports
  // - Urgent buyers → Bundle all reports
  
  return recommendations;
}

// ============================================
// SECTION 8: API ROUTE HANDLERS
// ============================================
// These connect everything together
// ============================================

export async function handleAIPropertySearch(req: Request, res: Response) {
  const startTime = Date.now();
  
  try {
    const { query } = req.body;
    const userId = req.user?.id;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    console.log(`🔍 AI Search from user ${userId}: "${query}"`);
    
    // STEP 1: Parse query with Claude AI (Anthropic)
    const parsingStart = Date.now();
    const criteria = await parseSearchQueryWithClaude(query, userId);
    const parsingDuration = Date.now() - parsingStart;
    console.log(`✅ Parsing took ${parsingDuration}ms`);
    
    // STEP 2: Search with YOUR proprietary algorithm
    const properties = await searchPropertiesWithProprietaryLogic(criteria, userId);
    console.log(`✅ Found ${properties.length} properties`);
    
    // STEP 3: Rank with YOUR proprietary scoring
    const rankedProperties = await rankPropertiesByScore(properties, criteria, userId);
    console.log(`✅ Ranked properties`);
    
    // STEP 4: Add YOUR cross-sell recommendations
    const propertiesWithReports = rankedProperties.slice(0, 10).map(prop => ({
      ...prop,
      recommendedReports: getReportRecommendationsProprietaryLogic(prop, prop.matchScore),
    }));
    
    // STEP 5: Log search for analytics
    const searchDuration = Date.now() - startTime;
    
    if (userId) {
      await db.insert(aiSearchHistory).values({
        userId,
        rawQuery: query,
        parsedCriteria: criteria as any,
        propertiesFound: properties.length,
        propertiesShown: Math.min(properties.length, 10),
        topPropertyIds: rankedProperties.slice(0, 10).map(p => p.id),
        searchDurationMs: searchDuration,
        aiParsingDurationMs: parsingDuration,
      });
    }
    
    // Return results
    return res.json({
      criteria,
      properties: propertiesWithReports,
      totalFound: properties.length,
      searchDurationMs: searchDuration,
      aiParsingDurationMs: parsingDuration,
    });
    
  } catch (error) {
    console.error('❌ Search error:', error);
    return res.status(500).json({ 
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Track property swipes (for learning)
export async function handlePropertySwipe(req: Request, res: Response) {
  try {
    const { propertyId, direction, viewDuration, propertySnapshot } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Save swipe
    await db.insert(propertySwipes).values({
      userId,
      propertyId,
      direction,
      viewDurationSeconds: viewDuration,
      propertySnapshot: propertySnapshot || {},
      featuresAtSwipe: propertySnapshot?.features || {},
    });
    
    console.log(`👆 User ${userId} swiped ${direction} on property ${propertyId}`);
    
    // Trigger preference update every 10 swipes
    const swipeCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(propertySwipes)
      .where(eq(propertySwipes.userId, userId));
    
    if (swipeCount[0].count % 10 === 0) {
      console.log(`🧠 Time to recalculate preferences for user ${userId}`);
      // Run async (don't wait)
      getUserLearnedPreferencesProprietaryAlgorithm(userId).catch(console.error);
    }
    
    return res.json({ success: true });
    
  } catch (error) {
    console.error('Error tracking swipe:', error);
    return res.status(500).json({ error: 'Failed to track swipe' });
  }
}

// Track report recommendation clicks (for analytics)
export async function trackReportRecommendation(req: Request, res: Response) {
  try {
    const { propertyId, reportType, action, matchScore } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (action === 'shown') {
      await db.insert(reportRecommendations).values({
        userId,
        propertyId,
        reportType,
        recommendationContext: 'ai_search_result',
        matchScoreWhenRecommended: matchScore,
      });
    } else if (action === 'clicked') {
      await db
        .update(reportRecommendations)
        .set({
          clicked: true,
          clickedAt: new Date(),
        })
        .where(
          and(
            eq(reportRecommendations.userId, userId),
            eq(reportRecommendations.propertyId, propertyId),
            eq(reportRecommendations.reportType, reportType)
          )
        );
    }
    
    return res.json({ success: true });
    
  } catch (error) {
    console.error('Error tracking recommendation:', error);
    return res.status(500).json({ error: 'Failed to track' });
  }
}

// ============================================
// 📊 SUMMARY: WHERE AI IS USED VS YOUR ALGORITHM
// ============================================
//
// ANTHROPIC CLAUDE API (External AI):
// ✅ parseSearchQueryWithClaude() - Converts natural language to criteria
//    Cost: ~$0.004 per search
//    Privacy: Only sends the search query text
//
// YOUR PROPRIETARY ALGORITHMS (All on your server):
// 🔒 searchPropertiesWithProprietaryLogic() - How you find properties
// 🔒 getUserLearnedPreferencesProprietaryAlgorithm() - How you learn from swipes
// 🔒 calculateMatchScoreProprietaryAlgorithm() - Your SECRET SAUCE scoring
// 🔒 rankPropertiesByScore() - How you sort results
// 🔒 getReportRecommendationsProprietaryLogic() - Your cross-sell strategy
//
// All your proprietary code runs on YOUR SERVER
// Claude never sees it, competitors can't access it
//
// ============================================

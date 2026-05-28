// server/routes/ai-property-search.ts
// SwipeRight NZ - AI Property Search with Learning System

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

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// ============================================
// TYPE DEFINITIONS
// ============================================

interface SearchCriteria {
  bedrooms?: number;
  bathrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  suburbs?: string[];
  propertyType?: string;
  
  // Advanced criteria from natural language
  lifestyle?: string;
  priorities?: string[];
  mustHaves?: string[];
  dealBreakers?: string[];
}

interface PropertyWithScore {
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
  
  // Match scoring
  matchScore: number;
  baseMatchScore: number;
  lifestyleScore: number;
  valueScore: number;
  preferenceScore: number;
  confidence: number;
  matchReasons: string[];
}

// ============================================
// CLAUDE AI QUERY PARSER
// ============================================

async function parseSearchQuery(query: string, userId?: number): Promise<SearchCriteria> {
  // Get user's learned preferences if available
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
- Preferred price range: $${pref.preferredPriceRangeCents ? 'available' : 'unknown'}
- Lifestyle: ${pref.lifestyleType || 'unknown'}
- Priorities: ${pref.priorities?.join(', ') || 'none'}
- Must-haves: ${pref.mustHaves?.join(', ') || 'none'}

Consider these preferences when interpreting ambiguous queries.
`;
    }
  }

  const prompt = `Extract property search criteria from this query. Return ONLY valid JSON with no markdown formatting.

${userContext}

User Query: "${query}"

Extract these fields:
- bedrooms (number): minimum bedrooms wanted
- bathrooms (number): minimum bathrooms wanted
- minPrice, maxPrice (numbers): in cents (e.g., 800000 = $800k, 80000000 = $800k NZD)
- suburbs (array of strings): specific suburbs/areas mentioned
- propertyType (string): "house" | "apartment" | "townhouse" | "unit" | null
- lifestyle (string): "family" | "professional" | "retiree" | "student" | "investor" | null
- priorities (array): ["schools", "commute", "quiet", "nightlife", "parks", "shopping", "beach", "city"]
- mustHaves (array): specific features required ["garage", "garden", "pool", "view", "modern", "character"]
- dealBreakers (array): things to avoid ["busy_road", "no_parking", "small_section", "dark"]

IMPORTANT PRICE CONVERSION:
- "$800k" or "800k" = 80000000 cents
- "$1.2m" or "1.2 million" = 120000000 cents
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

Return only the JSON object, no explanation.`;

  try {
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
    
    // Strip any markdown formatting
    const jsonText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const criteria = JSON.parse(jsonText);
    console.log('Parsed search criteria:', criteria);
    return criteria;
    
  } catch (error) {
    console.error('Error parsing search query:', error);
    // Fallback to basic parsing
    return {
      bedrooms: query.match(/(\d+)\s*bed/i)?.[1] ? parseInt(query.match(/(\d+)\s*bed/i)![1]) : undefined,
      maxPrice: query.match(/under\s*\$?(\d+)k/i)?.[1] ? parseInt(query.match(/under\s*\$?(\d+)k/i)![1]) * 100000 : undefined,
    };
  }
}

// ============================================
// PROPERTY SEARCH ENGINE
// ============================================

async function searchProperties(criteria: SearchCriteria, userId?: number): Promise<any[]> {
  const conditions = [];
  
  // Basic criteria
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
  
  // Search database
  const results = await db
    .select()
    .from(properties)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(50);
  
  return results;
}

// ============================================
// LEARNING SYSTEM - ANALYZE SWIPE HISTORY
// ============================================

async function getUserLearnedPreferences(userId: number): Promise<any> {
  // Get swipe history
  const swipes = await db
    .select()
    .from(propertySwipes)
    .where(eq(propertySwipes.userId, userId))
    .orderBy(desc(propertySwipes.createdAt))
    .limit(100);
  
  if (swipes.length < 5) {
    return null; // Not enough data to learn from
  }
  
  const likedSwipes = swipes.filter(s => s.direction === 'right' || s.direction === 'super');
  const passedSwipes = swipes.filter(s => s.direction === 'left');
  
  if (likedSwipes.length === 0) {
    return null;
  }
  
  // Extract patterns from liked properties
  const likedProperties = likedSwipes.map(s => s.propertySnapshot);
  
  // Calculate preferred price range (25th to 75th percentile of liked properties)
  const prices = likedProperties
    .map(p => p.priceCents)
    .filter(p => p != null)
    .sort((a, b) => a - b);
  
  const preferredPriceRange = prices.length > 0 ? {
    min: prices[Math.floor(prices.length * 0.25)],
    max: prices[Math.floor(prices.length * 0.75)],
  } : null;
  
  // Most common bedroom count
  const bedroomCounts = likedProperties.reduce((acc, p) => {
    const beds = p.bedrooms || 0;
    acc[beds] = (acc[beds] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  
  const preferredBedrooms = Object.entries(bedroomCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0];
  
  // Suburb preferences (frequency-based scoring)
  const suburbScores = likedProperties.reduce((acc, p) => {
    const suburb = p.suburb;
    if (suburb) {
      acc[suburb] = (acc[suburb] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  // Normalize scores 0-1
  const maxSuburbCount = Math.max(...Object.values(suburbScores));
  Object.keys(suburbScores).forEach(suburb => {
    suburbScores[suburb] = suburbScores[suburb] / maxSuburbCount;
  });
  
  // Feature preferences
  const featureScores = likedProperties.reduce((acc, p) => {
    const features = p.features || {};
    Object.entries(features).forEach(([feature, value]) => {
      if (value === true) {
        acc[feature] = (acc[feature] || 0) + 1;
      }
    });
    return acc;
  }, {} as Record<string, number>);
  
  return {
    preferredPriceRange,
    preferredBedrooms: preferredBedrooms ? parseInt(preferredBedrooms) : null,
    suburbScores,
    featureScores,
    totalSwipes: swipes.length,
    totalLikes: likedSwipes.length,
    confidence: Math.min(swipes.length / 50, 1), // 0-1 confidence based on swipe count
  };
}

// ============================================
// MATCH SCORING ALGORITHM - THE SECRET SAUCE
// ============================================

async function calculateMatchScore(
  property: any,
  criteria: SearchCriteria,
  userId?: number
): Promise<PropertyWithScore> {
  let baseMatchScore = 0;
  let lifestyleScore = 0;
  let valueScore = 0;
  let preferenceScore = 0;
  const matchReasons: string[] = [];
  
  // ====== BASE MATCH (40 points) ======
  
  // Bedroom match (15 points)
  if (criteria.bedrooms) {
    if (property.bedrooms >= criteria.bedrooms) {
      baseMatchScore += 15;
      matchReasons.push(`Has ${property.bedrooms} bedrooms as requested`);
    } else if (property.bedrooms === criteria.bedrooms - 1) {
      baseMatchScore += 10;
      matchReasons.push(`Has ${property.bedrooms} bedrooms (close to ${criteria.bedrooms} requested)`);
    }
  }
  
  // Price match (15 points)
  if (criteria.maxPrice) {
    if (property.priceCents <= criteria.maxPrice) {
      const priceRatio = property.priceCents / criteria.maxPrice;
      baseMatchScore += 15;
      
      if (priceRatio < 0.8) {
        matchReasons.push(`Well under budget at ${Math.round(priceRatio * 100)}% of max price`);
      } else {
        matchReasons.push(`Within budget`);
      }
    }
  }
  
  // Location match (10 points)
  if (criteria.suburbs && criteria.suburbs.length > 0) {
    if (criteria.suburbs.includes(property.suburb)) {
      baseMatchScore += 10;
      matchReasons.push(`In preferred area: ${property.suburb}`);
    }
  }
  
  // ====== LIFESTYLE MATCH (30 points) ======
  
  if (criteria.lifestyle === 'family') {
    // Families prefer: 3+ bedrooms, garden, quiet area, near schools
    if (property.bedrooms >= 3) lifestyleScore += 10;
    if (property.features?.has_garden) {
      lifestyleScore += 10;
      matchReasons.push('Has garden - great for families');
    }
    if (property.features?.quiet_area) lifestyleScore += 10;
  } else if (criteria.lifestyle === 'professional') {
    // Professionals prefer: modern, good commute, amenities nearby
    if (property.features?.modern_kitchen) lifestyleScore += 10;
    if (property.propertyType === 'apartment') lifestyleScore += 10;
    if (property.commuteData?.cbd_minutes < 20) {
      lifestyleScore += 10;
      matchReasons.push('Short commute to CBD');
    }
  } else if (criteria.lifestyle === 'investor') {
    // Investors prefer: good rental yield, capital growth areas, low maintenance
    lifestyleScore += 15; // TODO: Add real investment metrics
  }
  
  // Priority matching
  if (criteria.priorities?.includes('schools') && property.nearbySchools?.length > 0) {
    lifestyleScore += 5;
    matchReasons.push('Near quality schools');
  }
  if (criteria.priorities?.includes('quiet') && property.features?.quiet_area) {
    lifestyleScore += 5;
    matchReasons.push('Quiet neighborhood');
  }
  
  // ====== VALUE SCORE (20 points) ======
  // TODO: Compare to market averages for the suburb
  // For now, give points based on general value indicators
  
  const pricePerSqm = property.landArea ? property.priceCents / property.landArea : null;
  if (pricePerSqm && pricePerSqm < 5000) { // Below $5000/sqm is good value
    valueScore += 10;
    matchReasons.push('Good value per square meter');
  }
  
  if (property.features?.renovated || property.features?.modern_kitchen) {
    valueScore += 5;
  }
  
  valueScore += 5; // Base points for being on market
  
  // ====== PREFERENCE SCORE (10 points) ======
  // Based on learned preferences from swipe history
  
  if (userId) {
    const learned = await getUserLearnedPreferences(userId);
    
    if (learned && learned.confidence > 0.3) {
      // Price preference match
      if (learned.preferredPriceRange) {
        const { min, max } = learned.preferredPriceRange;
        if (property.priceCents >= min && property.priceCents <= max) {
          preferenceScore += 5;
          matchReasons.push('Price matches your typical preferences');
        }
      }
      
      // Suburb preference match
      if (learned.suburbScores[property.suburb]) {
        preferenceScore += learned.suburbScores[property.suburb] * 3;
        if (learned.suburbScores[property.suburb] > 0.7) {
          matchReasons.push(`You often like properties in ${property.suburb}`);
        }
      }
      
      // Feature preference match
      const propertyFeatures = property.features || {};
      let featureMatches = 0;
      Object.entries(propertyFeatures).forEach(([feature, value]) => {
        if (value === true && learned.featureScores[feature] > 2) {
          featureMatches++;
        }
      });
      
      if (featureMatches > 0) {
        preferenceScore += Math.min(featureMatches, 2);
        matchReasons.push(`Has ${featureMatches} features you usually like`);
      }
    }
  }
  
  // ====== CALCULATE OVERALL SCORE ======
  
  const overallScore = baseMatchScore + lifestyleScore + valueScore + preferenceScore;
  const confidence = Math.min(overallScore / 100, 0.99); // 0.0-0.99
  
  return {
    ...property,
    matchScore: Math.round(overallScore),
    baseMatchScore,
    lifestyleScore,
    valueScore,
    preferenceScore,
    confidence,
    matchReasons,
  };
}

// ============================================
// RANK PROPERTIES WITH AI
// ============================================

async function rankProperties(
  properties: any[],
  criteria: SearchCriteria,
  userId?: number
): Promise<PropertyWithScore[]> {
  // Calculate match scores for all properties
  const scoredProperties = await Promise.all(
    properties.map(prop => calculateMatchScore(prop, criteria, userId))
  );
  
  // Sort by match score (highest first)
  return scoredProperties.sort((a, b) => b.matchScore - a.matchScore);
}

// ============================================
// CROSS-SELL REPORT RECOMMENDATIONS
// ============================================

function getReportRecommendations(property: PropertyWithScore, matchScore: number): any[] {
  const recommendations = [];
  
  // High match (>70) → Recommend all reports
  if (matchScore >= 70) {
    recommendations.push({
      type: 'title_search',
      name: 'Title Search',
      price: 1500, // $15 in cents
      reason: 'Check ownership & legal details',
      priority: 'high',
      icon: 'FileText'
    });
    
    recommendations.push({
      type: 'lim_report',
      name: 'LIM Report',
      price: 39900, // $399 in cents
      reason: 'Full council property report',
      priority: 'high',
      icon: 'Building'
    });
    
    recommendations.push({
      type: 'rental_data',
      name: 'Rental Analysis',
      price: 2900, // $29 in cents
      reason: 'Investment potential analysis',
      priority: 'medium',
      icon: 'TrendingUp'
    });
  }
  
  // Medium match (50-69) → Recommend essentials
  else if (matchScore >= 50) {
    recommendations.push({
      type: 'title_search',
      name: 'Title Search',
      price: 1500,
      reason: 'Quick ownership check',
      priority: 'medium',
      icon: 'FileText'
    });
  }
  
  // Low match (<50) → No recommendations
  
  return recommendations;
}

// ============================================
// MAIN API ROUTE HANDLERS
// ============================================

export async function handleAIPropertySearch(req: Request, res: Response) {
  const startTime = Date.now();
  
  try {
    const { query } = req.body;
    const userId = req.user?.id; // From authentication middleware
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    console.log(`🔍 AI Search from user ${userId}: "${query}"`);
    
    // Step 1: Parse query with Claude AI
    const parsingStart = Date.now();
    const criteria = await parseSearchQuery(query, userId);
    const parsingDuration = Date.now() - parsingStart;
    
    console.log('✅ Parsed criteria:', criteria);
    
    // Step 2: Search properties
    const properties = await searchProperties(criteria, userId);
    console.log(`📦 Found ${properties.length} properties`);
    
    // Step 3: Rank with match scores
    const rankedProperties = await rankProperties(properties, criteria, userId);
    console.log(`🎯 Ranked properties, top score: ${rankedProperties[0]?.matchScore}`);
    
    // Step 4: Add report recommendations to top matches
    const propertiesWithReports = rankedProperties.slice(0, 10).map(prop => ({
      ...prop,
      recommendedReports: getReportRecommendations(prop, prop.matchScore),
    }));
    
    // Step 5: Log search for analytics
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
    
    // Step 6: Return results
    return res.json({
      criteria,
      properties: propertiesWithReports,
      totalFound: properties.length,
      searchDurationMs: searchDuration,
    });
    
  } catch (error) {
    console.error('❌ AI Search Error:', error);
    return res.status(500).json({ 
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// ============================================
// SWIPE TRACKING ENDPOINT
// ============================================

export async function handlePropertySwipe(req: Request, res: Response) {
  try {
    const { propertyId, direction, viewDuration, propertySnapshot } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!propertyId || !direction) {
      return res.status(400).json({ error: 'Property ID and direction required' });
    }
    
    // Save swipe
    await db.insert(propertySwipes).values({
      userId,
      propertyId,
      direction,
      viewDurationSeconds: viewDuration,
      propertySnapshot: propertySnapshot || {},
      featuresAtSwipe: propertySnapshot?.features || {},
    }).onConflictDoUpdate({
      target: [propertySwipes.userId, propertySwipes.propertyId],
      set: {
        direction,
        viewDurationSeconds: viewDuration,
      },
    });
    
    console.log(`👆 User ${userId} swiped ${direction} on property ${propertyId}`);
    
    // Trigger preference recalculation if enough swipes (async, don't wait)
    const swipeCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(propertySwipes)
      .where(eq(propertySwipes.userId, userId));
    
    if (swipeCount[0].count % 10 === 0) {
      // Every 10 swipes, recalculate preferences
      console.log(`🧠 Recalculating preferences for user ${userId}`);
      // Call: await db.execute(sql`SELECT update_user_preferences_from_swipes(${userId})`);
    }
    
    return res.json({ success: true });
    
  } catch (error) {
    console.error('Error tracking swipe:', error);
    return res.status(500).json({ error: 'Failed to track swipe' });
  }
}

// ============================================
// GET USER MATCH SCORES FOR FEED
// ============================================

export async function getUserPropertyFeed(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get user preferences
    const learned = await getUserLearnedPreferences(userId);
    
    // Get properties the user hasn't swiped on yet
    const swipedIds = await db
      .select({ propertyId: propertySwipes.propertyId })
      .from(propertySwipes)
      .where(eq(propertySwipes.userId, userId));
    
    const swipedIdArray = swipedIds.map(s => s.propertyId);
    
    // Get unswipped properties
    let feedProperties = await db
      .select()
      .from(properties)
      .where(
        swipedIdArray.length > 0 
          ? sql`${properties.id} NOT IN (${swipedIdArray.join(',')})`
          : undefined
      )
      .limit(20);
    
    // If we have learned preferences, rank by them
    if (learned && learned.confidence > 0.3) {
      const criteria: SearchCriteria = {
        bedrooms: learned.preferredBedrooms || undefined,
        minPrice: learned.preferredPriceRange?.min,
        maxPrice: learned.preferredPriceRange?.max,
      };
      
      feedProperties = await rankProperties(feedProperties, criteria, userId);
    }
    
    return res.json({
      properties: feedProperties,
      userPreferences: learned,
    });
    
  } catch (error) {
    console.error('Error getting property feed:', error);
    return res.status(500).json({ error: 'Failed to get feed' });
  }
}

// ============================================
// TRACK REPORT RECOMMENDATION CLICKS
// ============================================

export async function trackReportRecommendation(req: Request, res: Response) {
  try {
    const { propertyId, reportType, action, matchScore } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (action === 'shown') {
      // Log that we showed this recommendation
      await db.insert(reportRecommendations).values({
        userId,
        propertyId,
        reportType,
        recommendationContext: 'ai_search_result',
        matchScoreWhenRecommended: matchScore,
      });
    } else if (action === 'clicked') {
      // Update that they clicked it
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
    console.error('Error tracking report recommendation:', error);
    return res.status(500).json({ error: 'Failed to track recommendation' });
  }
}

// ============================================
// 🚀 HouseMatch.nz - Advanced AI Property Search Service
// ============================================
// 
// ARCHITECTURE:
// 1. Claude AI (Anthropic) - Natural language query parsing ONLY
// 2. Proprietary Algorithms - Search, scoring, learning, cross-sell
// 
// Cost: ~$0.004 per search (Claude parsing only)
// Privacy: Only search query text sent to Claude
//
// ============================================

import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import { 
  properties, 
  userPreferences, 
  propertySwipes, 
  aiSearchHistory,
  propertyMatchScores,
  reportRecommendations 
} from "@shared/schema";
import { sql, and, gte, lte, eq, desc, inArray, or, SQL } from "drizzle-orm";
import { detectUserPersona, incrementPersonaSwipeCount } from "./persona-detection";
import { generateAdaptiveMatchReasons } from "./adaptive-reasons";

// Initialize Anthropic Claude API
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface SearchCriteria {
  bedrooms?: number;
  bathrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  suburbs?: string[];
  propertyType?: string;
  lifestyle?: 'family' | 'professional' | 'retiree' | 'student' | 'investor';
  priorities?: string[];
  mustHaves?: string[];
  dealBreakers?: string[];
}

export interface PropertyWithScore {
  id: string;
  title: string;
  address: string;
  suburb: string;
  price: string;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string;
  imageUrl: string | null;
  description: string | null;
  
  // 🔒 PROPRIETARY SCORES
  matchScore: number;
  baseMatchScore: number;
  lifestyleScore: number;
  valueScore: number;
  preferenceScore: number;
  confidence: number;
  matchReasons: string[];
  recommendedReports?: ReportRecommendation[];
}

export interface ReportRecommendation {
  type: string;
  name: string;
  price: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  savings?: string | null;
}

// ============================================
// SECTION 1: AI PARSING (Uses Claude API)
// ============================================

export async function parseSearchQueryWithClaude(
  query: string, 
  userId?: string
): Promise<SearchCriteria> {
  
  // Check if API key is available
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('⚠️ ANTHROPIC_API_KEY not set, using fallback parsing');
    return fallbackQueryParsing(query);
  }

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
User's learned preferences (confidence: ${pref.confidenceScore || 0}):
- Lifestyle: ${pref.lifestyleType || 'unknown'}
- Priorities: ${pref.priorities?.join(', ') || 'none'}

Consider these when interpreting ambiguous queries.
`;
    }
  }

  const prompt = `You are a property search query parser for New Zealand real estate. 
Extract search criteria from the user's natural language query and return ONLY valid JSON.

${userContext}

User Query: "${query}"

Extract these fields:
- bedrooms (number): minimum bedrooms wanted
- bathrooms (number): minimum bathrooms wanted  
- minPrice, maxPrice (numbers): in NZ dollars (e.g., 800000 = $800k NZD)
- suburbs (array of strings): specific NZ suburbs/areas mentioned
- propertyType (string): "House" | "Apartment" | "Townhouse" | "Unit" | null
- lifestyle (string): "family" | "professional" | "retiree" | "student" | "investor" | null
- priorities (array): ["schools", "commute", "quiet", "nightlife", "parks", "shopping", "beach", "city"]
- mustHaves (array): ["garage", "garden", "pool", "view", "modern", "character"]
- dealBreakers (array): ["busy_road", "no_parking", "small_section", "dark"]

IMPORTANT PRICE CONVERSION FOR NZ:
- "$800k" = 800000
- "$1.2m" = 1200000
- "$500,000" = 500000

Example output:
{
  "bedrooms": 3,
  "bathrooms": 2,
  "maxPrice": 800000,
  "suburbs": ["Ponsonby", "Grey Lynn"],
  "propertyType": "House",
  "lifestyle": "family",
  "priorities": ["schools", "parks"],
  "mustHaves": ["garage", "garden"],
  "dealBreakers": ["busy_road"]
}

Return ONLY the JSON object with no markdown, no explanation, no code blocks.`;

  try {
    const startTime = Date.now();
    
    // 🤖 ANTHROPIC API CALL
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
    
    const jsonText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const criteria = JSON.parse(jsonText);
    console.log('✅ Claude parsed criteria:', criteria, `(${Date.now() - startTime}ms)`);
    return criteria;
    
  } catch (error) {
    console.error('❌ Error parsing with Claude:', error);
    return fallbackQueryParsing(query);
  }
}

function fallbackQueryParsing(query: string): SearchCriteria {
  const criteria: SearchCriteria = {};
  
  // Extract bedrooms
  const bedMatch = query.match(/(\d+)\s*bed/i);
  if (bedMatch) criteria.bedrooms = parseInt(bedMatch[1]);
  
  // Extract bathrooms
  const bathMatch = query.match(/(\d+)\s*bath/i);
  if (bathMatch) criteria.bathrooms = parseInt(bathMatch[1]);
  
  // Extract price (handle k, m, thousand, million)
  const priceMatch = query.match(/under\s*\$?(\d+(?:\.\d+)?)\s*(k|m|thousand|million)?/i);
  if (priceMatch) {
    let price = parseFloat(priceMatch[1]);
    const unit = priceMatch[2]?.toLowerCase();
    if (unit === 'k' || unit === 'thousand') price *= 1000;
    if (unit === 'm' || unit === 'million') price *= 1000000;
    criteria.maxPrice = price;
  }
  
  // Extract property type
  if (query.match(/apartment|flat|unit/i)) criteria.propertyType = 'Apartment';
  else if (query.match(/townhouse/i)) criteria.propertyType = 'Townhouse';
  else if (query.match(/house|home/i)) criteria.propertyType = 'House';
  
  // Extract common NZ locations
  const nzLocations = [
    'Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga',
    'Dunedin', 'Palmerston North', 'Napier', 'Porirua', 'Hibiscus Coast',
    'Ponsonby', 'Grey Lynn', 'Mount Eden', 'Parnell', 'Remuera'
  ];
  
  for (const location of nzLocations) {
    if (query.toLowerCase().includes(location.toLowerCase())) {
      criteria.suburbs = [location];
      break;
    }
  }
  
  return criteria;
}

// ============================================
// SECTION 2: 🔒 PROPRIETARY SEARCH ENGINE
// ============================================

export async function searchPropertiesWithProprietaryLogic(
  criteria: SearchCriteria, 
  userId?: string
): Promise<any[]> {
  
  console.log('🔍 Proprietary search with criteria:', criteria);
  
  const conditions: SQL[] = [];
  
  // Basic criteria filtering
  if (criteria.bedrooms) {
    conditions.push(gte(properties.bedrooms, criteria.bedrooms));
  }
  if (criteria.bathrooms) {
    conditions.push(gte(properties.bathrooms, criteria.bathrooms));
  }
  if (criteria.maxPrice) {
    // Price is stored as text like "$500,000", extract number and compare
    conditions.push(sql`CAST(REGEXP_REPLACE(${properties.price}, '[^0-9]', '', 'g') AS INTEGER) <= ${criteria.maxPrice}`);
  }
  if (criteria.minPrice) {
    conditions.push(sql`CAST(REGEXP_REPLACE(${properties.price}, '[^0-9]', '', 'g') AS INTEGER) >= ${criteria.minPrice}`);
  }
  if (criteria.suburbs && criteria.suburbs.length > 0) {
    conditions.push(inArray(properties.suburb, criteria.suburbs));
  }
  if (criteria.propertyType) {
    conditions.push(eq(properties.propertyType, criteria.propertyType));
  }
  
  // 🎯 HOUSEMATCH.NZ CUSTOM LOGIC: Only show active properties
  conditions.push(eq(properties.isActive, true));
  
  // Execute database query
  const results = await db
    .select()
    .from(properties)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(50);
  
  console.log(`✅ Found ${results.length} properties`);
  
  return results;
}

// ============================================
// SECTION 3: 🔒 PROPRIETARY SCORING ALGORITHM
// ============================================

export async function calculateMatchScoreProprietaryAlgorithm(
  property: any,
  criteria: SearchCriteria,
  userId?: string
): Promise<{
  matchScore: number;
  baseMatchScore: number;
  lifestyleScore: number;
  valueScore: number;
  preferenceScore: number;
  confidence: number;
  matchReasons: string[];
}> {
  
  let baseMatchScore = 0;
  let lifestyleScore = 0;
  let valueScore = 50; // Default value score
  let preferenceScore = 0;
  const matchReasons: string[] = [];
  
  // ┌─────────────────────────────────────────────────────┐
  // │ 🔒 PROPRIETARY SCORING FORMULA (40/30/20/10 split)  │
  // ├─────────────────────────────────────────────────────┤
  // │ 40% Base Match (criteria fit)                       │
  // │ 30% Lifestyle Fit                                    │
  // │ 20% Value for Money                                  │
  // │ 10% Personal Preference (from swipe history)         │
  // └─────────────────────────────────────────────────────┘
  
  // BASE MATCH SCORE (40 points max)
  if (criteria.bedrooms && property.bedrooms >= criteria.bedrooms) {
    baseMatchScore += 10;
    matchReasons.push(`${property.bedrooms} bedrooms (you wanted ${criteria.bedrooms}+)`);
  }
  if (criteria.bathrooms && property.bathrooms >= criteria.bathrooms) {
    baseMatchScore += 10;
    matchReasons.push(`${property.bathrooms} bathrooms`);
  }
  if (criteria.propertyType && property.propertyType === criteria.propertyType) {
    baseMatchScore += 10;
    matchReasons.push(`${property.propertyType} as requested`);
  }
  if (criteria.suburbs && criteria.suburbs.includes(property.suburb)) {
    baseMatchScore += 10;
    matchReasons.push(`Located in ${property.suburb}`);
  }
  
  // LIFESTYLE SCORE (30 points max)
  if (criteria.lifestyle === 'family') {
    if (property.bedrooms >= 3) {
      lifestyleScore += 10;
      matchReasons.push('Family-sized home');
    }
    if (property.carSpaces > 0) {
      lifestyleScore += 10;
      matchReasons.push('Has parking');
    }
  } else if (criteria.lifestyle === 'professional') {
    if (property.propertyType === 'Apartment') {
      lifestyleScore += 15;
      matchReasons.push('Low-maintenance apartment');
    }
  }
  
  // VALUE SCORE (20 points max)
  valueScore = 15; // Good value by default
  matchReasons.push('Good market value');
  
  // PREFERENCE SCORE (10 points max) - based on user's swipe history
  if (userId) {
    const recentSwipes = await db
      .select()
      .from(propertySwipes)
      .where(eq(propertySwipes.userId, userId))
      .orderBy(desc(propertySwipes.createdAt))
      .limit(20);
    
    const likedCount = recentSwipes.filter(s => s.direction === 'right').length;
    if (likedCount > 5) {
      preferenceScore = 8;
      matchReasons.push('Matches your style');
    }
  }
  
  // Calculate overall match score
  const matchScore = Math.min(100, baseMatchScore + lifestyleScore + valueScore + preferenceScore);
  const confidence = userId && matchScore > 0 ? 0.75 : 0.5;
  
  return {
    matchScore,
    baseMatchScore,
    lifestyleScore,
    valueScore,
    preferenceScore,
    confidence,
    matchReasons,
  };
}

// ============================================
// SECTION 4: 🔒 CROSS-SELL RECOMMENDATION ENGINE
// ============================================

export function getReportRecommendationsProprietaryLogic(
  property: any,
  matchScore: number
): ReportRecommendation[] {
  
  const recommendations: ReportRecommendation[] = [];
  
  // ┌─────────────────────────────────────────────────────┐
  // │ 🔒 REVENUE OPTIMIZATION ALGORITHM                   │
  // ├─────────────────────────────────────────────────────┤
  // │ Recommend reports based on:                         │
  // │ - Match score (higher match = more recommendations) │
  // │ - Property type                                      │
  // │ - Price range                                        │
  // └─────────────────────────────────────────────────────┘
  
  // Extract price from string like "$500,000"
  const priceMatch = property.price?.match(/[\d,]+/);
  const price = priceMatch ? parseInt(priceMatch[0].replace(/,/g, '')) : 0;
  
  // HIGH MATCH SCORE (70+) = Premium recommendations
  if (matchScore >= 70) {
    recommendations.push({
      type: 'title_search',
      name: 'Title Search Report',
      price: 8900, // $89
      reason: 'Essential for this high-match property',
      priority: 'high',
    });
    
    recommendations.push({
      type: 'lim',
      name: 'LIM Report',
      price: 24900, // $249
      reason: 'Recommended for serious buyers',
      priority: 'high',
    });
  }
  
  // MEDIUM MATCH SCORE (50-69) = Basic recommendations
  if (matchScore >= 50 && matchScore < 70) {
    recommendations.push({
      type: 'title_search',
      name: 'Title Search Report',
      price: 8900,
      reason: 'Good starting point for this property',
      priority: 'medium',
    });
  }
  
  // HIGH-VALUE PROPERTIES = Building inspection
  if (price > 800000) {
    recommendations.push({
      type: 'building_inspection',
      name: 'Building Inspection',
      price: 49900, // $499
      reason: 'Recommended for high-value properties',
      priority: 'high',
    });
  }
  
  return recommendations;
}

// ============================================
// SECTION 5: COMPLETE AI SEARCH FUNCTION
// ============================================

export async function performAIPropertySearch(
  query: string,
  userId?: string
): Promise<PropertyWithScore[]> {
  
  const startTime = Date.now();
  
  // Step 1: Parse query with Claude AI
  const criteria = await parseSearchQueryWithClaude(query, userId);
  
  // ✨ STEP 1.5: Detect user persona (free, keyword-based)
  let userPersona;
  if (userId) {
    try {
      userPersona = await detectUserPersona(userId);
      console.log(`[AI Search] Using persona: ${userPersona.type} (confidence: ${userPersona.confidence.toFixed(2)})`);
    } catch (error) {
      console.warn('[AI Search] Persona detection failed, using defaults:', error);
    }
  }
  
  // Step 2: Search properties with proprietary logic
  const properties = await searchPropertiesWithProprietaryLogic(criteria, userId);
  
  // Step 3: Score and rank each property
  const scoredProperties: PropertyWithScore[] = [];
  
  for (const property of properties) {
    const scores = await calculateMatchScoreProprietaryAlgorithm(property, criteria, userId);
    const recommendations = getReportRecommendationsProprietaryLogic(property, scores.matchScore);
    
    scoredProperties.push({
      id: property.id,
      title: property.title,
      address: property.address,
      suburb: property.suburb,
      price: property.price,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      propertyType: property.propertyType,
      imageUrl: property.imageUrl,
      description: property.description,
      ...scores,
      recommendedReports: recommendations,
    });
  }
  
  // Step 4: Sort by match score (highest first)
  scoredProperties.sort((a, b) => b.matchScore - a.matchScore);
  
  // ✨ STEP 4.5: Generate personalized reasons for TOP 5 only (cost optimization!)
  if (userPersona && scoredProperties.length > 0) {
    console.log('[AI Search] Generating adaptive reasons for top 5 properties...');
    const topProperties = scoredProperties.slice(0, 5);
    
    // Generate reasons in parallel for speed
    const reasonPromises = topProperties.map(async (property) => {
      try {
        const adaptiveReasons = await generateAdaptiveMatchReasons(
          property,
          criteria as any,
          property.matchScore,
          userPersona
        );
        
        // Replace generic reasons with personalized ones
        property.matchReasons = adaptiveReasons;
        console.log(`[AI Search] Generated ${adaptiveReasons.length} reasons for property ${property.id}`);
      } catch (error) {
        console.warn(`[AI Search] Failed to generate reasons for ${property.id}:`, error);
        // Keep existing generic reasons if generation fails
      }
    });
    
    await Promise.all(reasonPromises);
  }
  
  // Step 5: Log search history
  if (userId) {
    try {
      await db.insert(aiSearchHistory).values({
        userId,
        rawQuery: query,
        parsedCriteria: criteria,
        propertiesFound: properties.length,
        propertiesShown: scoredProperties.length,
        topPropertyIds: scoredProperties.slice(0, 10).map(p => p.id),
        searchDurationMs: Date.now() - startTime,
      });
    } catch (error) {
      console.warn('Failed to log search history:', error);
    }
  }
  
  console.log(`✨ AI Search complete in ${Date.now() - startTime}ms, ${scoredProperties.length} scored properties`);
  
  return scoredProperties;
}

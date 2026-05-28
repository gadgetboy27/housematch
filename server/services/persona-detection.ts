// ============================================
// 🎭 ADAPTIVE AI PERSONA DETECTION SYSTEM
// ============================================
// 
// FREE keyword-based detection - NO AI calls!
// Analyzes user behavior to determine persona type
//
// ============================================

import { db } from "../db";
import { users, aiSearchHistory, propertySwipes } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

// ============================================
// PERSONA TYPE DEFINITIONS
// ============================================

export type PersonaType = 'family' | 'investor' | 'professional' | 'retiree' | 'first_home_buyer';

export interface UserPersona {
  type: PersonaType;
  confidence: number; // 0-1
  traits: {
    emotional: number;    // 0-1 (high = emotional language)
    analytical: number;   // 0-1 (high = numbers/data)
    lifestyle: number;    // 0-1 (high = lifestyle focus)
    financial: number;    // 0-1 (high = ROI focus)
  };
  indicators: string[];   // What told us this persona
  source: 'signup' | 'detected' | 'manual' | 'default';
}

// ============================================
// PERSONA TRAIT CONFIGURATIONS
// ============================================

const PERSONA_TRAITS = {
  family: {
    emotional: 0.9,    // High emotional language
    analytical: 0.2,   // Low numbers focus
    lifestyle: 0.95,   // Very high lifestyle focus
    financial: 0.3,    // Low ROI focus
  },
  investor: {
    emotional: 0.1,    // Low emotional language
    analytical: 0.95,  // Very high numbers focus
    lifestyle: 0.3,    // Low lifestyle focus
    financial: 0.95,   // Very high ROI focus
  },
  professional: {
    emotional: 0.4,
    analytical: 0.6,
    lifestyle: 0.7,
    financial: 0.5,
  },
  retiree: {
    emotional: 0.7,
    analytical: 0.3,
    lifestyle: 0.8,
    financial: 0.4,
  },
  first_home_buyer: {
    emotional: 0.8,
    analytical: 0.5,
    lifestyle: 0.7,
    financial: 0.6,
  },
} as const;

// ============================================
// KEYWORD DETECTION PATTERNS (NO AI - FREE!)
// ============================================

const KEYWORD_PATTERNS = {
  family: {
    high: /family|families|kids|children|school|schools|backyard|garden|playground/gi,
    medium: /bedroom.*[34]|bedroom.*four|large.*room|spacious|safe|quiet.*street/gi,
    indicators: ['family-focused language', 'school mentions', 'child-friendly features'],
  },
  investor: {
    high: /investment|yield|rental|roi|return|capital.*growth|tenant|tenants/gi,
    medium: /cash.*flow|positive.*gearing|depreciation|tax|portfolio|multiple.*properties/gi,
    indicators: ['investment terminology', 'rental yield focus', 'financial metrics'],
  },
  professional: {
    high: /modern|contemporary|apartment|cbd|city|commute|work/gi,
    medium: /gym|parking|security|lock.*leave|low.*maintenance|convenient/gi,
    indicators: ['urban lifestyle', 'convenience focus', 'modern features'],
  },
  retiree: {
    high: /single.*level|no.*stairs|retirement|quiet|peaceful|low.*maintenance/gi,
    medium: /garden.*easy|small.*garden|retirement.*village|accessible|downsiz/gi,
    indicators: ['accessibility needs', 'low maintenance', 'single level preference'],
  },
  first_home_buyer: {
    high: /first.*home|affordable|cheap|under.*[456]00|starter|budget/gi,
    medium: /kiwisaver|first.*buyer|grant|deposit|mortgage|young.*couple/gi,
    indicators: ['first home language', 'budget conscious', 'affordability focus'],
  },
};

// ============================================
// MAIN DETECTION FUNCTION
// ============================================

export async function detectUserPersona(userId: string): Promise<UserPersona> {
  console.log(`[Persona Detection] Starting detection for user ${userId}`);
  
  // Check if user has manual or signup persona
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  if (!user) {
    console.log('[Persona Detection] User not found, using default');
    return getDefaultPersona();
  }
  
  // If persona was set at signup or manually, and we haven't hit the re-detection threshold
  if ((user.personaSource === 'signup' || user.personaSource === 'manual') && 
      (user.personaSwipeCount || 0) < 10) {
    console.log(`[Persona Detection] Using ${user.personaSource} persona: ${user.persona} (swipes: ${user.personaSwipeCount})`);
    return {
      type: user.persona as PersonaType,
      confidence: parseFloat(user.personaConfidence || '0.3'),
      traits: PERSONA_TRAITS[user.persona as PersonaType] || PERSONA_TRAITS.first_home_buyer,
      indicators: [`Set at ${user.personaSource}`],
      source: user.personaSource as any,
    };
  }
  
  // Time to re-detect based on behavior!
  console.log('[Persona Detection] Running behavioral detection...');
  
  // Get user's search history
  const searches = await db
    .select()
    .from(aiSearchHistory)
    .where(eq(aiSearchHistory.userId, userId))
    .orderBy(desc(aiSearchHistory.createdAt))
    .limit(20);
  
  // Get user's swipe patterns
  const swipes = await db
    .select()
    .from(propertySwipes)
    .where(eq(propertySwipes.userId, userId))
    .orderBy(desc(propertySwipes.createdAt))
    .limit(50);
  
  // Combine all query text
  const queryText = searches
    .map(s => s.rawQuery)
    .join(' ')
    .toLowerCase();
  
  console.log(`[Persona Detection] Analyzing ${searches.length} searches, ${swipes.length} swipes`);
  
  // Score each persona type
  const scores = {
    family: 0,
    investor: 0,
    professional: 0,
    retiree: 0,
    first_home_buyer: 0,
  };
  
  const foundIndicators: Record<PersonaType, string[]> = {
    family: [],
    investor: [],
    professional: [],
    retiree: [],
    first_home_buyer: [],
  };
  
  // Analyze keywords for each persona
  for (const [personaType, patterns] of Object.entries(KEYWORD_PATTERNS)) {
    const highMatches = queryText.match(patterns.high) || [];
    const mediumMatches = queryText.match(patterns.medium) || [];
    
    scores[personaType as PersonaType] += highMatches.length * 5;
    scores[personaType as PersonaType] += mediumMatches.length * 2;
    
    if (highMatches.length > 0) {
      foundIndicators[personaType as PersonaType].push(...patterns.indicators);
    }
  }
  
  // Find dominant persona
  const sortedPersonas = Object.entries(scores)
    .sort(([, a], [, b]) => b - a);
  
  const [dominantType, dominantScore] = sortedPersonas[0];
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  
  // Calculate confidence (0-1)
  const confidence = totalScore > 0 
    ? Math.min(dominantScore / totalScore, 1) 
    : 0.3;
  
  const detectedPersona: UserPersona = {
    type: dominantType as PersonaType,
    confidence,
    traits: PERSONA_TRAITS[dominantType as PersonaType] || PERSONA_TRAITS.first_home_buyer,
    indicators: foundIndicators[dominantType as PersonaType],
    source: 'detected',
  };
  
  console.log(`[Persona Detection] Detected: ${detectedPersona.type} (confidence: ${confidence.toFixed(2)})`);
  
  // Update user's persona in database
  await db
    .update(users)
    .set({
      persona: detectedPersona.type,
      personaConfidence: confidence.toString(),
      personaSource: 'detected',
      personaLastUpdated: new Date(),
      personaSwipeCount: 0, // Reset counter
    })
    .where(eq(users.id, userId));
  
  return detectedPersona;
}

// ============================================
// INCREMENT SWIPE COUNTER
// ============================================

export async function incrementPersonaSwipeCount(userId: string): Promise<void> {
  await db
    .update(users)
    .set({
      personaSwipeCount: sql`${users.personaSwipeCount} + 1`,
    })
    .where(eq(users.id, userId));
}

// ============================================
// SET PERSONA AT SIGNUP
// ============================================

export async function setSignupPersona(
  userId: string, 
  personaType: PersonaType
): Promise<void> {
  console.log(`[Persona Detection] Setting signup persona for user ${userId}: ${personaType}`);
  
  await db
    .update(users)
    .set({
      persona: personaType,
      personaConfidence: '0.7', // Higher confidence for explicit choice
      personaSource: 'signup',
      personaLastUpdated: new Date(),
      personaSwipeCount: 0,
    })
    .where(eq(users.id, userId));
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getDefaultPersona(): UserPersona {
  return {
    type: 'first_home_buyer',
    confidence: 0.3,
    traits: PERSONA_TRAITS.first_home_buyer,
    indicators: ['Default for new users'],
    source: 'default',
  };
}

export function getTraitsForPersona(type: PersonaType) {
  return PERSONA_TRAITS[type] || PERSONA_TRAITS.first_home_buyer;
}

// ============================================
// 🎯 ADAPTIVE AI MATCH REASON GENERATION
// ============================================
// 
// Uses Claude to generate personalized match reasons
// based on user persona. Includes Redis caching
// to minimize costs.
//
// Cost: ~$0.004 per property (only for uncached)
// ============================================

import Anthropic from "@anthropic-ai/sdk";
import type { UserPersona, PersonaType } from "./persona-detection";
import { CacheService } from "./redis-cache";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// ============================================
// MAIN GENERATION FUNCTION
// ============================================

interface Property {
  id: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  price: string;
  suburb: string;
  propertyType: string;
  floorArea?: number | null;
  landArea?: number | null;
  carSpaces?: number | null;
  description?: string | null;
}

interface SearchCriteria {
  query: string;
  bedrooms?: number;
  priceMax?: number;
  suburb?: string;
}

export async function generateAdaptiveMatchReasons(
  property: Property,
  criteria: SearchCriteria,
  matchScore: number,
  persona: UserPersona
): Promise<string[]> {
  
  // Try cache first (24 hour TTL)
  const cacheKey = `match-reasons:${property.id}:${persona.type}`;
  
  try {
    const cached = await CacheService.get<string[]>(cacheKey);
    if (cached) {
      console.log(`[Adaptive Reasons] Cache HIT for property ${property.id}, persona ${persona.type}`);
      return cached;
    }
  } catch (error) {
    console.warn('[Adaptive Reasons] Cache read error (proceeding without cache):', error);
  }
  
  console.log(`[Adaptive Reasons] Generating new reasons for property ${property.id}, persona ${persona.type}`);
  
  // Check if Anthropic API key is available
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[Adaptive Reasons] ANTHROPIC_API_KEY not set, using generic reasons');
    return getGenericReasons(property, persona);
  }
  
  // Build persona-specific prompt
  const prompt = buildPersonaPrompt(property, criteria, persona);
  
  try {
    // Call Claude
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: prompt
      }]
    });
    
    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';
    
    // Parse reasons (one per line, remove bullets)
    const reasons = responseText
      .split('\n')
      .map(r => r.replace(/^[-•*]\s*/, '').trim())
      .filter(r => r.length > 0)
      .slice(0, 5); // Top 5 reasons
    
    console.log(`[Adaptive Reasons] Generated ${reasons.length} reasons`);
    
    // Cache for 24 hours (86400 seconds)
    if (reasons.length > 0) {
      try {
        await CacheService.set(cacheKey, reasons, 86400);
        console.log(`[Adaptive Reasons] Cached reasons for ${cacheKey}`);
      } catch (error) {
        console.warn('[Adaptive Reasons] Failed to cache (non-critical):', error);
      }
    }
    
    return reasons;
    
  } catch (error: any) {
    console.error('[Adaptive Reasons] Claude API error:', error.message);
    return getGenericReasons(property, persona);
  }
}

// ============================================
// PERSONA-SPECIFIC PROMPT BUILDING
// ============================================

function buildPersonaPrompt(
  property: Property,
  criteria: SearchCriteria,
  persona: UserPersona
): string {
  
  const price = parsePriceString(property.price);
  
  // Base property context
  const propertyContext = `
Property Details:
- ${property.bedrooms || 'N/A'} bedrooms, ${property.bathrooms || 'N/A'} bathrooms
- ${property.suburb}
- $${price.toLocaleString()} NZD
- ${property.propertyType}
${property.floorArea ? `- Floor area: ${property.floorArea}m²` : ''}
${property.landArea ? `- Land area: ${property.landArea}m²` : ''}
${property.carSpaces ? `- ${property.carSpaces} car spaces` : ''}
${property.description ? `- Description: ${property.description.substring(0, 200)}` : ''}
`.trim();
  
  // ┌─────────────────────────────────────────────────────┐
  // │ 🎭 FAMILY PERSONA - Emotional, Lifestyle Language   │
  // └─────────────────────────────────────────────────────┘
  if (persona.type === 'family') {
    return `You're helping a family find their perfect home. Be warm, emotional, and paint a picture of life there.

${propertyContext}

User's search: "${criteria.query}"

Write 3-5 compelling reasons why this home is perfect for their family.

IMPORTANT RULES:
- NO percentages or match scores (like "92% match")
- NO technical jargon
- USE emotional, human language
- FOCUS ON: Family moments, daily life, kids, comfort, safety
- PAINT A PICTURE: "Imagine Saturday mornings...", "Your kids will love..."
- BE SPECIFIC: "The huge backyard" not "good outdoor space"

Examples of GOOD reasons:
✅ "Imagine your kids running around that massive backyard while you watch from the deck"
✅ "The kitchen opens to the living room - perfect for keeping an eye on little ones while cooking"
✅ "Just a 5-minute walk to excellent schools means no stressful morning drives"
✅ "Four bedrooms means everyone gets their own space as the kids grow"

Examples of BAD reasons:
❌ "92% lifestyle match score"
❌ "Property features optimize for family requirements"
❌ "Exceeds bedroom requirements by 25%"

Write 3-5 compelling, emotional reasons (one per line, no bullets):`;
  }
  
  // ┌─────────────────────────────────────────────────────┐
  // │ 💼 INVESTOR PERSONA - Analytical, Numbers-Focused    │
  // └─────────────────────────────────────────────────────┘
  else if (persona.type === 'investor') {
    return `You're advising a property investor. Be analytical, data-driven, and ROI-focused.

${propertyContext}

User's search: "${criteria.query}"

Write 3-5 investment-focused reasons why this property has strong potential.

IMPORTANT RULES:
- USE numbers, percentages, ROI metrics where possible
- FOCUS ON: Rental yield, capital growth, market trends, tenant demand
- BE ANALYTICAL: "8% annual appreciation", "4.2% rental yield"
- INCLUDE STRATEGY: "Hold 5-7 years for optimal capital gain"

Examples of GOOD reasons:
✅ "Strong rental demand in ${property.suburb} - properties lease within 2 weeks on average"
✅ "Estimated rental yield of 4.5% ($720/week) - above area average of 3.8%"
✅ "${property.suburb} shows 9% annual capital growth over last 3 years"
✅ "Near decile 10 school - attracts premium tenants willing to pay extra"

Examples of BAD reasons:
❌ "Beautiful kitchen perfect for family dinners"
❌ "Kids will love the backyard"
❌ "Cozy and comfortable living spaces"

Write 3-5 analytical, investment-focused reasons (one per line, no bullets):`;
  }
  
  // ┌─────────────────────────────────────────────────────┐
  // │ 👔 PROFESSIONAL PERSONA - Modern, Convenience         │
  // └─────────────────────────────────────────────────────┘
  else if (persona.type === 'professional') {
    return `You're helping a busy professional find a home. Focus on convenience, modern features, and lifestyle.

${propertyContext}

User's search: "${criteria.query}"

Write 3-5 reasons highlighting convenience and modern living.

FOCUS ON: Commute, modern features, low maintenance, amenities, work-life balance

Examples:
✅ "Just 15 minutes to CBD - more time for what matters"
✅ "Modern, low-maintenance design means weekends are yours"
✅ "Secure parking for two cars - no street hunting after work"
✅ "Smart home features let you control everything from your phone"

Write 3-5 reasons (one per line, no bullets):`;
  }
  
  // ┌─────────────────────────────────────────────────────┐
  // │ 🏡 RETIREE PERSONA - Comfort, Accessibility          │
  // └─────────────────────────────────────────────────────┘
  else if (persona.type === 'retiree') {
    return `You're helping retirees find a comfortable, low-maintenance home. Focus on ease, accessibility, and peace.

${propertyContext}

User's search: "${criteria.query}"

Write 3-5 reasons emphasizing comfort and practicality.

FOCUS ON: Single level, low maintenance, quiet, accessible, mature gardens

Examples:
✅ "Single level living - no stairs to worry about"
✅ "Established, easy-care garden - enjoy nature without the hard work"
✅ "Quiet cul-de-sac location away from traffic"
✅ "Walk to shops and medical facilities - everything nearby"

Write 3-5 reasons (one per line, no bullets):`;
  }
  
  // ┌─────────────────────────────────────────────────────┐
  // │ 🏠 FIRST HOME BUYER - Exciting, Value-Focused        │
  // └─────────────────────────────────────────────────────┘
  else {
    return `You're helping first home buyers find their starter home. Be encouraging, value-focused, and exciting.

${propertyContext}

User's search: "${criteria.query}"

Write 3-5 reasons highlighting value and opportunity.

FOCUS ON: Affordability, potential, getting on property ladder, value for money

Examples:
✅ "Perfect starter home at a price that won't break the bank"
✅ "Great bones with potential to add value over time"
✅ "KiwiSaver First Home Grant eligible - could save you thousands"
✅ "Get on the property ladder in a growing suburb"

Write 3-5 reasons (one per line, no bullets):`;
  }
}

// ============================================
// FALLBACK GENERIC REASONS
// ============================================

function getGenericReasons(property: Property, persona: UserPersona): string[] {
  const price = parsePriceString(property.price);
  const reasons: string[] = [];
  
  if (persona.type === 'family') {
    if ((property.bedrooms || 0) >= 3) {
      reasons.push(`${property.bedrooms} bedrooms provide plenty of space for the whole family`);
    }
    if (property.suburb) {
      reasons.push(`Located in family-friendly ${property.suburb}`);
    }
    reasons.push('Perfect home for making lasting memories together');
  } else if (persona.type === 'investor') {
    reasons.push(`Strong investment potential in ${property.suburb}`);
    if ((property.bedrooms || 0) >= 2) {
      reasons.push(`${property.bedrooms} bedroom layout appeals to wide tenant pool`);
    }
    reasons.push('Solid opportunity for capital growth');
  } else if (persona.type === 'professional') {
    if (property.propertyType?.toLowerCase().includes('apartment')) {
      reasons.push('Low-maintenance apartment perfect for busy professionals');
    }
    reasons.push(`Convenient ${property.suburb} location`);
    reasons.push('Modern living with minimal upkeep required');
  } else if (persona.type === 'retiree') {
    reasons.push('Comfortable, easy-care home for peaceful living');
    reasons.push(`Established ${property.suburb} neighborhood`);
    if ((property.bedrooms || 0) <= 3) {
      reasons.push('Right-sized home without excess to maintain');
    }
  } else {
    reasons.push(`Great value at $${price.toLocaleString()}`);
    reasons.push('Excellent starter home opportunity');
    reasons.push(`${property.bedrooms || 2} bedroom layout perfect for getting started`);
  }
  
  return reasons.slice(0, 5);
}

// ============================================
// HELPERS
// ============================================

function parsePriceString(priceStr: string): number {
  // Remove currency symbols and commas, convert to number
  const cleaned = priceStr.replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

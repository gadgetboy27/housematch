import OpenAI from "openai";

// Using GPT-3.5-turbo for cost optimization (60x cheaper than GPT-4)
// Cost: $0.0005/1K input + $0.0015/1K output vs GPT-4's $0.03/1K + $0.06/1K

// CRITICAL: Validate API key exists before initializing
const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
if (!apiKey) {
  throw new Error("OPENAI_API_KEY is required. Please set the OPENAI_API_KEY environment variable.");
}

const openai = new OpenAI({ 
  apiKey 
});

const AI_MODEL = "gpt-3.5-turbo"; // 60x cheaper than GPT-4, perfect for property recommendations

export interface PropertyRecommendation {
  propertyId: string;
  matchPercentage: number;
  reasoning: string;
}

export interface UserInsights {
  preferredPropertyTypes: string[];
  priceRange: { min: number; max: number };
  preferredLocations: string[];
  dislikes: string[];
  recommendations: string[];
}

export async function analyzeUserPreferences(
  likedProperties: any[],
  dislikedProperties: any[]
): Promise<{ result: UserInsights; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> {
  try {
    const prompt = `
    Analyze the following user's property preferences based on their liked and disliked properties.
    
    Liked Properties:
    ${JSON.stringify(likedProperties, null, 2)}
    
    Disliked Properties:
    ${JSON.stringify(dislikedProperties, null, 2)}
    
    Please analyze and provide insights in the following JSON format:
    {
      "preferredPropertyTypes": ["array of property types they like"],
      "priceRange": {"min": number, "max": number},
      "preferredLocations": ["array of suburbs/areas they prefer"],
      "dislikes": ["array of things they tend to avoid"],
      "recommendations": ["array of specific recommendations for future properties"]
    }
    `;

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a real estate expert analyzing user preferences for New Zealand properties. Provide insights based on their swiping behavior."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500, // Cost control: limit response tokens to prevent unbounded costs
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      result: result as UserInsights,
      usage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    console.error("Error analyzing user preferences:", error);
    throw new Error("Failed to analyze user preferences");
  }
}

export async function generatePropertyRecommendations(
  userPreferences: UserInsights,
  availableProperties: any[]
): Promise<{ result: PropertyRecommendation[]; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> {
  try {
    const prompt = `
    Based on these user preferences:
    ${JSON.stringify(userPreferences, null, 2)}
    
    And these available properties:
    ${JSON.stringify(availableProperties, null, 2)}
    
    Recommend the top 5 properties with match percentages and reasoning.
    
    Respond in this JSON format:
    {
      "recommendations": [
        {
          "propertyId": "property-id",
          "matchPercentage": 95,
          "reasoning": "Brief explanation of why this matches"
        }
      ]
    }
    `;

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a real estate matching expert. Analyze properties against user preferences and provide match scores with reasoning."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800, // Cost control: limit response tokens (need more for multiple property recommendations)
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      result: result.recommendations || [],
      usage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    console.error("Error generating recommendations:", error);
    throw new Error("Failed to generate property recommendations");
  }
}

export async function generateMarketInsights(
  userLocation: string,
  propertyType: string
): Promise<{ result: string[]; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> {
  try {
    const prompt = `
    Generate 3-4 relevant market insights for ${propertyType} properties in ${userLocation}, New Zealand.
    Focus on recent trends, pricing, and market dynamics.
    
    Respond in this JSON format:
    {
      "insights": ["insight 1", "insight 2", "insight 3"]
    }
    `;

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a New Zealand real estate market analyst. Provide accurate, helpful market insights."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 400, // Cost control: limit response tokens for market insights
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      result: result.insights || [],
      usage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    console.error("Error generating market insights:", error);
    return {
      result: ["Market data temporarily unavailable"],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }
}

import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

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
): Promise<UserInsights> {
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
      model: "gpt-5",
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
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result as UserInsights;
  } catch (error) {
    console.error("Error analyzing user preferences:", error);
    throw new Error("Failed to analyze user preferences");
  }
}

export async function generatePropertyRecommendations(
  userPreferences: UserInsights,
  availableProperties: any[]
): Promise<PropertyRecommendation[]> {
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
      model: "gpt-5",
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
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.recommendations || [];
  } catch (error) {
    console.error("Error generating recommendations:", error);
    throw new Error("Failed to generate property recommendations");
  }
}

export async function generateMarketInsights(
  userLocation: string,
  propertyType: string
): Promise<string[]> {
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
      model: "gpt-5",
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
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.insights || [];
  } catch (error) {
    console.error("Error generating market insights:", error);
    return ["Market data temporarily unavailable"];
  }
}

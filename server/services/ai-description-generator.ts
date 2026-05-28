import Anthropic from '@anthropic-ai/sdk';

interface PropertyData {
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  address?: string;
  suburb?: string;
  city?: string;
  price?: string;
  floorArea?: number;
  landArea?: number;
  yearBuilt?: number;
  zoning?: string;
  parkingType?: string;
  carSpaces?: number;
}

interface AIGeneratedContent {
  title: string;
  description: string;
}

export class AIDescriptionGenerator {
  private client: Anthropic | null = null;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    } else {
      console.warn('⚠️ ANTHROPIC_API_KEY not found - AI description generation will not work');
    }
  }

  async generatePropertyContent(propertyData: PropertyData): Promise<AIGeneratedContent> {
    if (!this.client) {
      throw new Error('AI service not configured. Please add ANTHROPIC_API_KEY to enable AI features.');
    }

    // Build property context for AI
    const context = this.buildPropertyContext(propertyData);

    const prompt = `You are a professional New Zealand real estate marketing expert. Generate a compelling property listing title and description based on the following property details:

${context}

Instructions:
1. TITLE (max 60 characters):
   - Create a catchy, professional title that highlights key selling points
   - Use NZ real estate marketing language (e.g., "Stunning", "Premium", "Family Haven")
   - Include property type and location
   - Make it attention-grabbing but accurate

2. DESCRIPTION (200-400 words):
   - Write in an engaging, professional tone
   - Highlight key features and benefits (not just facts)
   - Use emotional triggers and lifestyle benefits
   - Include:
     * Opening hook (what makes this property special)
     * Key features (bedrooms, bathrooms, living spaces)
     * Lifestyle benefits (location, amenities, neighborhood)
     * Call to action
   - Use NZ real estate terminology
   - Be persuasive but honest
   - Focus on what buyers care about most

Format your response as JSON:
{
  "title": "Your compelling title here",
  "description": "Your engaging description here"
}`;

    try {
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800, // Optimized for 200-400 word descriptions (~600 tokens) + title (~100 tokens)
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      // Extract the text content
      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response format from AI');
      }

      // Parse the JSON response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse AI response');
      }

      const result = JSON.parse(jsonMatch[0]) as AIGeneratedContent;
      
      console.log('✅ AI-generated property content:', {
        titleLength: result.title.length,
        descriptionLength: result.description.length,
      });

      return result;
    } catch (error: any) {
      console.error('❌ AI description generation failed:', error);
      
      // Return fallback content
      return this.generateFallbackContent(propertyData);
    }
  }

  private buildPropertyContext(data: PropertyData): string {
    const parts: string[] = [];

    parts.push(`Property Type: ${this.formatPropertyType(data.propertyType)}`);
    
    if (data.address) parts.push(`Address: ${data.address}`);
    if (data.suburb) parts.push(`Suburb: ${data.suburb}`);
    if (data.city) parts.push(`City/Region: ${data.city}`);
    if (data.price) parts.push(`Price: ${data.price}`);
    
    if (data.bedrooms) parts.push(`Bedrooms: ${data.bedrooms}`);
    if (data.bathrooms) parts.push(`Bathrooms: ${data.bathrooms}`);
    if (data.floorArea) parts.push(`Floor Area: ${data.floorArea}m²`);
    if (data.landArea) parts.push(`Land Area: ${data.landArea}m²`);
    
    if (data.parkingType) parts.push(`Parking: ${data.parkingType}`);
    if (data.carSpaces) parts.push(`Car Spaces: ${data.carSpaces}`);
    if (data.yearBuilt) parts.push(`Year Built: ${data.yearBuilt}`);
    if (data.zoning) parts.push(`Zoning: ${data.zoning}`);

    return parts.join('\n');
  }

  private formatPropertyType(type: string): string {
    const typeMap: Record<string, string> = {
      residential: 'Residential House',
      rental: 'Rental Property',
      commercial: 'Commercial Property',
      lease: 'Leasehold Property',
      farm: 'Farm/Rural Property',
      batch: 'Batch/Holiday Home',
      land: 'Land/Section',
      apartment: 'Apartment/Unit',
    };
    return typeMap[type] || type;
  }

  private generateFallbackContent(data: PropertyData): AIGeneratedContent {
    // Generate basic fallback content if AI fails
    const propertyTypeFormatted = this.formatPropertyType(data.propertyType);
    const location = data.suburb || data.city || 'Prime Location';
    
    let title = `${propertyTypeFormatted}`;
    if (data.bedrooms && data.bathrooms) {
      title = `${data.bedrooms} Bed, ${data.bathrooms} Bath ${propertyTypeFormatted}`;
    }
    if (location) {
      title += ` in ${location}`;
    }
    
    // Limit title to 60 characters
    if (title.length > 60) {
      title = title.substring(0, 57) + '...';
    }

    let description = `Discover this wonderful ${propertyTypeFormatted.toLowerCase()} `;
    if (data.suburb) {
      description += `located in the desirable ${data.suburb} area`;
    }
    description += '. ';

    if (data.bedrooms && data.bathrooms) {
      description += `Featuring ${data.bedrooms} bedrooms and ${data.bathrooms} bathrooms, `;
    }
    
    if (data.floorArea) {
      description += `with ${data.floorArea}m² of living space `;
    }
    
    if (data.landArea) {
      description += `on ${data.landArea}m² of land. `;
    }

    description += 'This property offers great potential for the right buyer. Contact us today to arrange a viewing and discover all this property has to offer.';

    return { title, description };
  }
}

// Export singleton instance
export const aiDescriptionGenerator = new AIDescriptionGenerator();

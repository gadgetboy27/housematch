import fetch from 'node-fetch';

// Open2view API types
export interface Open2viewProperty {
  id: string;
  last_updated: string;
  status: 'CURRENT' | 'CONTRACT' | 'SOLD' | 'RENTED';
  address: {
    display: string;
    address: string;
  };
  agency_id: string;
  latitude: string;
  longitude: string;
  price?: string;
  price_from?: string;
  price_to?: string;
  category?: 'Residential' | 'Commercial' | 'Agricultural';
  property_type?: string;
  suburb?: string;
  area?: string;
  region?: string;
  bedrooms?: string;
  bathrooms?: string;
  floor_size?: string;
  lot_size?: string;
  built_in?: string;
  description?: string;
  photos?: {
    count: string;
    photo: Array<{
      type: 'Normal' | 'Elevated' | 'Night';
      caption: string;
      position: string;
      thumbnail: string;
      url: string;
    }>;
  };
  virtualtours?: {
    count: string;
    virtualtour: Array<{
      caption: string;
      position: string;
      thumbnail: string;
      url: string;
    }>;
  };
  floorplans?: {
    count: string;
    floorplan?: Array<{
      caption: string;
      position: string;
      thumbnail: string;
      url: string;
    }>;
  };
  agents?: {
    count: string;
    agent: Array<{
      id: string;
      name: string;
    }>;
  };
  openhomes?: {
    count: string;
    openhome: Array<{
      start: string;
      end: string;
    }>;
  };
}

export interface Open2viewResponse {
  property?: Open2viewProperty;
  properties?: {
    count: string;
    property: Open2viewProperty[];
  };
  errors?: {
    count: string;
    error: Array<{
      field: string;
      message: string;
    }>;
  };
}

export class Open2viewService {
  private baseUrl = 'https://api.open2view.com/nz';

  /**
   * Fetch a single property by ID
   */
  async getProperty(id: string): Promise<Open2viewProperty | null> {
    try {
      const response = await fetch(`${this.baseUrl}/properties/${id}.json`);
      
      if (!response.ok) {
        console.error(`Open2view API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json() as Open2viewResponse;
      
      if (data.errors) {
        console.error('Open2view API errors:', data.errors.error);
        return null;
      }

      return data.property || null;
    } catch (error) {
      console.error('Error fetching property from Open2view:', error);
      return null;
    }
  }

  /**
   * Search properties with filters
   */
  async searchProperties(filters: {
    category?: 'residential' | 'commercial' | 'agricultural';
    status?: 'current' | 'contract' | 'sold' | 'rented';
    property_type?: string;
    price_from?: number;
    price_to?: number;
    bedrooms?: number;
    bathrooms?: number;
    suburb?: string;
    region?: string;
    limit?: number;
    offset?: number;
    detail?: 'short' | 'full';
  } = {}): Promise<Open2viewProperty[]> {
    try {
      const params = new URLSearchParams();
      
      // Add filters to query params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`${this.baseUrl}/properties.json?${params.toString()}`);
      
      if (!response.ok) {
        console.error(`Open2view API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json() as Open2viewResponse;
      
      if (data.errors) {
        console.error('Open2view API errors:', data.errors.error);
        return [];
      }

      return data.properties?.property || [];
    } catch (error) {
      console.error('Error searching properties from Open2view:', error);
      return [];
    }
  }

  /**
   * Test API connection with a sample property
   */
  async testConnection(): Promise<{ success: boolean; sampleProperty?: Open2viewProperty; error?: string }> {
    try {
      // Get a few properties to test with
      const properties = await this.searchProperties({ 
        status: 'current', 
        category: 'residential', 
        limit: 1,
        detail: 'full'
      });

      if (properties.length === 0) {
        return { success: false, error: 'No properties found in API' };
      }

      return { success: true, sampleProperty: properties[0] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const open2viewService = new Open2viewService();
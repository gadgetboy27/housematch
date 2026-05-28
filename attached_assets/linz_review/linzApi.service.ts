// services/linzApi.service.ts
// Service for interacting with LINZ Data Service APIs

/**
 * LINZ API Service
 * 
 * Provides methods to interact with LINZ Data Service for property verification
 * 
 * API Key: Get your API key from https://data.linz.govt.nz and store it in environment variable LINZ_API_KEY
 * 
 * Main Endpoints:
 * - Address Search: WFS API (layer-105689 - NZ Street Addresses)
 * - Title Search: Koordinates Query API (layer-50804 - NZ Property Titles)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PropertyVerificationResult {
  success: boolean;
  titleNumber: string;
  legalDescription: string;
  lotNumber: string;
  titleType: string;
  status: string;
  fullAddress?: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

export interface AddressFeature {
  type: string;
  id: string;
  geometry: {
    type: string;
    coordinates: [number, number]; // [lon, lat]
  };
  properties: {
    address_id: number;
    full_address: string;
    town_city: string;
    suburb_locality?: string;
    [key: string]: any;
  };
}

export interface TitleFeature {
  id: string;
  properties: {
    title_no: string;
    legal_description: string;
    type: string;
    status: string;
    land_district?: string;
    issue_date?: string;
    [key: string]: any;
  };
}

export interface ApiError {
  error: string;
  message?: string;
}

export interface WFSResponse {
  type: string;
  features: AddressFeature[];
  totalFeatures?: number;
  numberReturned?: number;
}

export interface KoordinatesResponse {
  vectorQuery: {
    layers: {
      [layerId: string]: {
        features: TitleFeature[];
      };
    };
  };
}

// ============================================================================
// API SERVICE CLASS
// ============================================================================

export class LinzApiService {
  private readonly apiKey: string;
  private readonly baseWfsUrl: string;
  private readonly baseQueryUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.LINZ_API_KEY || '';
    if (!this.apiKey) {
      console.warn('LINZ_API_KEY not configured. Set environment variable LINZ_API_KEY or pass it to the constructor.');
    }
    this.baseWfsUrl = `https://data.linz.govt.nz/services;key=${this.apiKey}/wfs`;
    this.baseQueryUrl = 'https://data.linz.govt.nz/services/query/v1/vector.json';
  }

  /**
   * Search for an address in the LINZ database
   * 
   * @param address - Street address to search for
   * @param city - City/town name
   * @returns Address feature or null if not found
   */
  async searchAddress(
    address: string,
    city: string
  ): Promise<AddressFeature | null> {
    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeNames: 'layer-105689', // NZ Street Addresses
      cql_filter: `full_address LIKE '%${address}%' AND town_city='${city}'`,
      count: '1',
      outputFormat: 'json',
    });

    const url = `${this.baseWfsUrl}?${params.toString()}`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: WFSResponse = await response.json();

      if (!data.features || data.features.length === 0) {
        return null;
      }

      return data.features[0];
    } catch (error) {
      console.error('Error searching address:', error);
      throw error;
    }
  }

  /**
   * Get title information from coordinates using Koordinates Query API
   * 
   * @param lon - Longitude
   * @param lat - Latitude
   * @param radius - Search radius in meters (default: 50)
   * @returns Title feature or null if not found
   */
  async getTitleByCoordinates(
    lon: number,
    lat: number,
    radius: number = 50
  ): Promise<TitleFeature | null> {
    const params = new URLSearchParams({
      key: this.apiKey,
      layer: '50804', // NZ Property Titles
      x: lon.toString(),
      y: lat.toString(),
      radius: radius.toString(),
      max_results: '1',
    });

    const url = `${this.baseQueryUrl}?${params.toString()}`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: KoordinatesResponse = await response.json();
      const features = data.vectorQuery?.layers?.['50804']?.features || [];

      if (features.length === 0) {
        return null;
      }

      return features[0];
    } catch (error) {
      console.error('Error getting title by coordinates:', error);
      throw error;
    }
  }

  /**
   * Get multiple titles within a radius (for properties with multiple titles)
   * 
   * @param lon - Longitude
   * @param lat - Latitude
   * @param radius - Search radius in meters (default: 100)
   * @param maxResults - Maximum number of results (default: 10)
   * @returns Array of title features
   */
  async getMultipleTitlesByCoordinates(
    lon: number,
    lat: number,
    radius: number = 100,
    maxResults: number = 10
  ): Promise<TitleFeature[]> {
    const params = new URLSearchParams({
      key: this.apiKey,
      layer: '50804',
      x: lon.toString(),
      y: lat.toString(),
      radius: radius.toString(),
      max_results: maxResults.toString(),
    });

    const url = `${this.baseQueryUrl}?${params.toString()}`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: KoordinatesResponse = await response.json();
      return data.vectorQuery?.layers?.['50804']?.features || [];
    } catch (error) {
      console.error('Error getting multiple titles:', error);
      throw error;
    }
  }

  /**
   * Complete property verification workflow
   * 
   * @param address - Property address
   * @param city - City/town name
   * @returns Verification result or error
   */
  async getPropertyVerification(
    address: string,
    city: string
  ): Promise<PropertyVerificationResult | ApiError> {
    try {
      // Step 1: Search for address
      const addressFeature = await this.searchAddress(address, city);

      if (!addressFeature) {
        return {
          error: 'Address not found',
          message: 'The address could not be found in the LINZ database. Please check the address and try again.',
        };
      }

      // Get coordinates from address
      const [lon, lat] = addressFeature.geometry.coordinates;

      // Step 2: Get title information using coordinates
      const titleFeature = await this.getTitleByCoordinates(lon, lat);

      if (!titleFeature) {
        return {
          error: 'No title found',
          message: 'No title information could be found for this property. This may be Crown land or not yet registered.',
        };
      }

      // Extract and format data
      const properties = titleFeature.properties;

      return {
        success: true,
        titleNumber: properties.title_no || 'N/A',
        legalDescription: properties.legal_description || 'N/A',
        lotNumber: this.extractLotNumber(properties.legal_description),
        titleType: properties.type || 'N/A',
        status: properties.status || 'N/A',
        fullAddress: addressFeature.properties.full_address,
        coordinates: { lat, lon },
      };
    } catch (error) {
      console.error('Verification error:', error);
      return {
        error: 'System error',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
      };
    }
  }

  /**
   * Search title by title number
   * 
   * @param titleNumber - Title number (e.g., "NA123/456")
   * @returns Title information or error
   */
  async searchByTitleNumber(
    titleNumber: string
  ): Promise<TitleFeature | ApiError> {
    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeNames: 'layer-50804',
      cql_filter: `title_no='${titleNumber}'`,
      count: '1',
      outputFormat: 'json',
    });

    const url = `${this.baseWfsUrl}?${params.toString()}`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: WFSResponse = await response.json();

      if (!data.features || data.features.length === 0) {
        return {
          error: 'Title not found',
          message: `No title found with number: ${titleNumber}`,
        };
      }

      return data.features[0] as any as TitleFeature;
    } catch (error) {
      console.error('Error searching by title number:', error);
      return {
        error: 'System error',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
      };
    }
  }

  /**
   * Extract lot number from legal description
   * Parses formats like "LOT 1 DP 12345" or "UNIT 5 LOT 10 DP 98765"
   * 
   * @param legalDescription - Legal description text
   * @returns Formatted lot number or original description
   */
  private extractLotNumber(legalDescription?: string): string {
    if (!legalDescription) {
      return 'N/A';
    }

    // Try to extract LOT and DP numbers
    const lotMatch = legalDescription.match(/LOT\s+(\d+)/i);
    const dpMatch = legalDescription.match(/DP\s+(\d+)/i);

    if (lotMatch && dpMatch) {
      return `Lot ${lotMatch[1]} DP ${dpMatch[1]}`;
    }

    // Try to extract UNIT and LOT for unit titles
    const unitMatch = legalDescription.match(/UNIT\s+(\d+)/i);
    if (unitMatch && lotMatch && dpMatch) {
      return `Unit ${unitMatch[1]} Lot ${lotMatch[1]} DP ${dpMatch[1]}`;
    }

    // Return full legal description if no clear pattern
    return legalDescription;
  }

  /**
   * Generate URL to LINZ Land Record Search for ordering official title
   * 
   * @param titleNumber - Optional title number to pre-fill
   * @returns LINZ Land Record Search URL
   */
  getLandRecordSearchUrl(titleNumber?: string): string {
    const baseUrl = 'https://lrs.linz.govt.nz/search/';
    if (titleNumber) {
      return `${baseUrl}?title=${encodeURIComponent(titleNumber)}`;
    }
    return baseUrl;
  }

  /**
   * Get attribution text for LINZ data
   * Required under CC BY 4.0 license
   */
  getAttributionText(): string {
    return 'Property data sourced from LINZ Data Service and licensed for reuse under CC BY 4.0 International licence';
  }

  /**
   * Get attribution HTML with links
   */
  getAttributionHTML(): string {
    return `
      Property data sourced from 
      <a href="https://data.linz.govt.nz" target="_blank" rel="noopener noreferrer">LINZ Data Service</a> 
      and licensed for reuse under 
      <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
    `;
  }
}

// ============================================================================
// SINGLETON INSTANCE (Optional)
// ============================================================================

export const linzApi = new LinzApiService();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if result is an error
 */
export function isApiError(
  result: PropertyVerificationResult | ApiError
): result is ApiError {
  return 'error' in result;
}

/**
 * Format title number for display
 */
export function formatTitleNumber(titleNumber: string): string {
  return titleNumber.replace(/\//g, ' / ');
}

/**
 * Validate NZ title number format
 * Examples: NA123/456, WN45D/789
 */
export function isValidTitleNumber(titleNumber: string): boolean {
  const pattern = /^[A-Z]{2,3}\d+[A-Z]?\/\d+$/i;
  return pattern.test(titleNumber);
}

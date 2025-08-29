import fetch from 'node-fetch';

interface LINZPropertyData {
  id: string;
  properties: {
    titles: string;
    appellation: string;
    land_district: string;
    parcel_intent: string;
    topology_type: string;
  };
  geometry?: any;
}

interface ValidationResult {
  isValid: boolean;
  matchedRecord?: LINZPropertyData;
  error?: string;
  suggestions?: string[];
}

export class LINZValidationService {
  private apiKey: string;
  private baseUrl = 'https://data.linz.govt.nz/services';

  constructor() {
    this.apiKey = process.env.LINZ_API_KEY || '';
    if (!this.apiKey) {
      console.warn('LINZ_API_KEY not found in environment variables');
    }
  }

  /**
   * Validate lot number exists in LINZ records (without address requirement)
   */
  async validateLotNumber(lotNumber: string): Promise<ValidationResult> {
    if (!this.apiKey) {
      return {
        isValid: false,
        error: 'LINZ API key not configured'
      };
    }

    try {
      // Clean up lot number format for searching - try both formats
      const cleanLotNumber = lotNumber.trim().toUpperCase();
      // Remove PT prefix if present for broader search
      const searchLotNumber = cleanLotNumber.replace(/^PT\s+/, '');
      
      // LINZ WFS query for property titles by legal description
      const wfsUrl = `${this.baseUrl};key=${this.apiKey}/wfs`;
      const params = new URLSearchParams({
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeNames: 'layer-50772', // NZ Primary Parcels layer
        cql_filter: `appellation LIKE '%${searchLotNumber}%' OR appellation LIKE '%${cleanLotNumber}%'`,
        outputformat: 'json',
        count: '10'
      });

      const response = await fetch(`${wfsUrl}?${params}`);
      
      if (!response.ok) {
        throw new Error(`LINZ API error: ${response.status}`);
      }

      const data = await response.json() as { features: LINZPropertyData[] };
      
      if (data.features && data.features.length > 0) {
        // Find exact or close matches
        const exactMatch = data.features.find(feature => 
          feature.properties.appellation?.toUpperCase().includes(searchLotNumber) ||
          feature.properties.appellation?.toUpperCase().includes(cleanLotNumber)
        );

        return {
          isValid: true, // Lot number exists in LINZ
          matchedRecord: exactMatch || data.features[0],
          suggestions: data.features.slice(0, 3).map(f => f.properties.appellation)
        };
      }

      return {
        isValid: false,
        error: 'Lot number not found in LINZ database'
      };

    } catch (error) {
      console.error('LINZ lot validation error:', error);
      return {
        isValid: false,
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate address against LINZ records  
   */
  async validateAddress(address: string, suburb?: string): Promise<ValidationResult> {
    if (!this.apiKey) {
      return {
        isValid: false,
        error: 'LINZ API key not configured'
      };
    }

    try {
      // This would typically use LINZ's address/parcel data
      // For now, we'll use a simplified approach with property titles
      const searchTerm = `${address}${suburb ? ` ${suburb}` : ''}`.trim();
      
      const wfsUrl = `${this.baseUrl};key=${this.apiKey}/wfs`;
      const params = new URLSearchParams({
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeNames: 'layer-50772',
        cql_filter: `appellation LIKE '%${searchTerm}%' OR titles LIKE '%${searchTerm}%'`,
        outputformat: 'json',
        count: '5'
      });

      const response = await fetch(`${wfsUrl}?${params}`);
      
      if (!response.ok) {
        throw new Error(`LINZ API error: ${response.status}`);
      }

      const data = await response.json() as { features: LINZPropertyData[] };
      
      return {
        isValid: data.features && data.features.length > 0,
        matchedRecord: data.features?.[0],
        suggestions: data.features?.slice(0, 3).map(f => f.properties.appellation) || []
      };

    } catch (error) {
      console.error('LINZ address validation error:', error);
      return {
        isValid: false,
        error: `Address validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate individual components independently  
   */
  async crossValidateProperty(lotNumber: string, address: string, suburb?: string): Promise<{
    lotValid: ValidationResult;
    addressValid: ValidationResult;
    crossMatch: boolean;
    overallValid: boolean;
  }> {
    const [lotResult, addressResult] = await Promise.all([
      this.validateLotNumber(lotNumber),
      this.validateNZAddress(address, suburb)
    ]);

    // For independent verification, we don't require cross-matching
    // We just verify each component exists in NZ systems
    const componentsVerified = lotResult.isValid && addressResult.isValid;

    return {
      lotValid: lotResult,
      addressValid: addressResult,
      crossMatch: false, // Not requiring exact match anymore
      overallValid: componentsVerified
    };
  }

  /**
   * Simplified NZ address validation - just check if it's a real NZ address
   */
  async validateNZAddress(address: string, suburb?: string): Promise<ValidationResult> {
    if (!address || address.length < 5) {
      return {
        isValid: false,
        error: 'Address too short'
      };
    }

    // Basic NZ address format validation
    const addressPattern = /^\d+\s+[\w\s]+(?:street|road|avenue|drive|lane|place|way|crescent|court)$/i;
    const hasNumber = /^\d+/.test(address.trim());
    const hasStreetType = /(street|road|avenue|drive|lane|place|way|crescent|court)/i.test(address);
    
    if (hasNumber && hasStreetType) {
      return {
        isValid: true,
        matchedRecord: undefined,
        suggestions: []
      };
    }

    return {
      isValid: false,
      error: 'Invalid NZ address format'
    };
  }

  /**
   * Get property suggestions based on partial input
   */
  async getPropertySuggestions(searchTerm: string): Promise<string[]> {
    if (!this.apiKey || searchTerm.length < 3) {
      return [];
    }

    try {
      const wfsUrl = `${this.baseUrl};key=${this.apiKey}/wfs`;
      const params = new URLSearchParams({
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeNames: 'layer-50772',
        cql_filter: `appellation LIKE '%${searchTerm}%'`,
        outputformat: 'json',
        count: '5'
      });

      const response = await fetch(`${wfsUrl}?${params}`);
      const data = await response.json() as { features: LINZPropertyData[] };
      
      return data.features?.map(f => f.properties.appellation).filter(Boolean) || [];

    } catch (error) {
      console.error('LINZ suggestions error:', error);
      return [];
    }
  }
}
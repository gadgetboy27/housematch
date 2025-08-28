import fetch from 'node-fetch';

interface LINZPropertyData {
  id: string;
  properties: {
    title_no: string;
    legal_desc_1: string;
    land_district: string;
    status: string;
    type: string;
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
   * Validate lot number against LINZ records
   */
  async validateLotNumber(lotNumber: string): Promise<ValidationResult> {
    if (!this.apiKey) {
      return {
        isValid: false,
        error: 'LINZ API key not configured'
      };
    }

    try {
      // Clean up lot number format for searching
      const cleanLotNumber = lotNumber.trim().toUpperCase();
      
      // LINZ WFS query for property titles by legal description
      const wfsUrl = `${this.baseUrl};key=${this.apiKey}/wfs`;
      const params = new URLSearchParams({
        REQUEST: 'GetFeature',
        typeNames: 'layer-50804', // NZ Property Titles layer
        cql_filter: `legal_desc_1 LIKE '%${cleanLotNumber}%'`,
        outputFormat: 'json',
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
          feature.properties.legal_desc_1?.toUpperCase().includes(cleanLotNumber)
        );

        return {
          isValid: !!exactMatch,
          matchedRecord: exactMatch || data.features[0],
          suggestions: data.features.slice(0, 3).map(f => f.properties.legal_desc_1)
        };
      }

      return {
        isValid: false,
        error: 'Lot number not found in LINZ records'
      };

    } catch (error) {
      console.error('LINZ lot validation error:', error);
      return {
        isValid: false,
        error: `Validation failed: ${error.message}`
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
        REQUEST: 'GetFeature',
        typeNames: 'layer-50804',
        cql_filter: `legal_desc_1 LIKE '%${searchTerm}%' OR title_no LIKE '%${searchTerm}%'`,
        outputFormat: 'json',
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
        suggestions: data.features?.slice(0, 3).map(f => f.properties.legal_desc_1) || []
      };

    } catch (error) {
      console.error('LINZ address validation error:', error);
      return {
        isValid: false,
        error: `Address validation failed: ${error.message}`
      };
    }
  }

  /**
   * Cross-validate lot number and address together
   */
  async crossValidateProperty(lotNumber: string, address: string, suburb?: string): Promise<{
    lotValid: ValidationResult;
    addressValid: ValidationResult;
    crossMatch: boolean;
    overallValid: boolean;
  }> {
    const [lotResult, addressResult] = await Promise.all([
      this.validateLotNumber(lotNumber),
      this.validateAddress(address, suburb)
    ]);

    // Check if lot number and address refer to the same property
    let crossMatch = false;
    if (lotResult.matchedRecord && addressResult.matchedRecord) {
      crossMatch = lotResult.matchedRecord.properties.title_no === addressResult.matchedRecord.properties.title_no;
    }

    return {
      lotValid: lotResult,
      addressValid: addressResult,
      crossMatch,
      overallValid: lotResult.isValid && addressResult.isValid && crossMatch
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
        REQUEST: 'GetFeature',
        typeNames: 'layer-50804',
        cql_filter: `legal_desc_1 LIKE '%${searchTerm}%'`,
        outputFormat: 'json',
        count: '5'
      });

      const response = await fetch(`${wfsUrl}?${params}`);
      const data = await response.json() as { features: LINZPropertyData[] };
      
      return data.features?.map(f => f.properties.legal_desc_1).filter(Boolean) || [];

    } catch (error) {
      console.error('LINZ suggestions error:', error);
      return [];
    }
  }
}
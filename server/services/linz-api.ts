import axios from 'axios';

interface LINZTitleData {
  titleNumber: string;
  landDistrict: string;
  type: string;
  status: string;
  issueDate: string | null;
  legalDescription: string;
  area: number | null;
  geometry: any;
  confidence?: number;
  matchStrategy?: string;
}

interface ParsedAddress {
  lotNumber?: string;
  dpNumber?: string;
  streetNumber?: string;
  streetName?: string;
  suburb?: string;
  city?: string;
  raw: string;
}

interface LINZConfig {
  apiKey: string;
  wfsBaseUrl: string;
  arcgisBaseUrl: string;
}

class LINZApiService {
  private config: LINZConfig;
  private cache: Map<string, { data: LINZTitleData[] | null; timestamp: number }>;
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    const apiKey = process.env.LINZ_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  LINZ_API_KEY not configured - title search features will be disabled');
    }

    this.config = {
      apiKey: apiKey || '',
      wfsBaseUrl: 'https://data.linz.govt.nz/services',
      arcgisBaseUrl: 'https://services.arcgis.com/xdsHIIxuCWByZiCB/arcgis/rest/services/LINZ_NZ_Property_Titles/FeatureServer/0'
    };

    this.cache = new Map();
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  /**
   * Parse address to extract lot/DP numbers and components
   */
  private parseAddress(address: string): ParsedAddress {
    const parsed: ParsedAddress = { raw: address };
    
    // Extract Lot number (various formats)
    const lotMatch = address.match(/\b(?:lot|lt)\s*(\d+[A-Z]?)\b/i);
    if (lotMatch) {
      parsed.lotNumber = lotMatch[1];
    }
    
    // Extract DP (Deposited Plan) number
    const dpMatch = address.match(/\b(?:DP|dp)\s*(\d+)\b/i);
    if (dpMatch) {
      parsed.dpNumber = dpMatch[1];
    }
    
    // Extract street number
    const streetNumberMatch = address.match(/^(\d+[A-Z]?)\s+/);
    if (streetNumberMatch) {
      parsed.streetNumber = streetNumberMatch[1];
    }
    
    // Try to extract street name and suburb
    const parts = address.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      parsed.streetName = parts[0];
      parsed.suburb = parts[1];
      if (parts.length >= 3) {
        parsed.city = parts[2];
      }
    }
    
    return parsed;
  }

  /**
   * Strategy 1: Direct lot/DP number query
   * Highest reliability when user provides lot/DP info
   */
  private async queryByLotDP(parsed: ParsedAddress): Promise<LINZTitleData[]> {
    if (!parsed.lotNumber && !parsed.dpNumber) {
      return [];
    }

    try {
      console.log(`🔍 Strategy 1: Querying by Lot ${parsed.lotNumber} DP ${parsed.dpNumber}`);
      
      const url = `${this.config.wfsBaseUrl};key=${this.config.apiKey}/wfs`;
      
      // Build CQL filter for lot/DP - escape user input to prevent injection
      let cqlFilter = '';
      if (parsed.lotNumber && parsed.dpNumber) {
        const escapedLot = this.escapeCQLString(parsed.lotNumber);
        const escapedDP = this.escapeCQLString(parsed.dpNumber);
        cqlFilter = `legal_desc ILIKE '%LOT ${escapedLot}%DP ${escapedDP}%'`;
      } else if (parsed.lotNumber) {
        const escapedLot = this.escapeCQLString(parsed.lotNumber);
        cqlFilter = `legal_desc ILIKE '%LOT ${escapedLot}%'`;
      } else if (parsed.dpNumber) {
        const escapedDP = this.escapeCQLString(parsed.dpNumber);
        cqlFilter = `legal_desc ILIKE '%DP ${escapedDP}%'`;
      }
      
      const params = {
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeNames: 'layer-50804', // Property Titles layer
        outputFormat: 'json',
        cql_filter: cqlFilter,
        maxFeatures: 10
      };

      const response = await axios.get(url, { params, timeout: 15000 });

      if (response.data.features && response.data.features.length > 0) {
        const results = response.data.features.map((feature: any) => ({
          ...this.parseTitle(feature),
          confidence: 0.95,
          matchStrategy: 'lot_dp_direct'
        }));
        
        console.log(`✅ Strategy 1: Found ${results.length} matches by lot/DP`);
        return results;
      }
    } catch (error: any) {
      console.warn(`⚠️  Strategy 1 failed:`, error.message);
    }
    
    return [];
  }

  /**
   * Strategy 2: Query by street number and name
   * Good for standard street addresses
   */
  private async queryByStreetAddress(parsed: ParsedAddress): Promise<LINZTitleData[]> {
    if (!parsed.streetName) {
      return [];
    }

    try {
      console.log(`🔍 Strategy 2: Querying by street address: ${parsed.streetName}`);
      
      const url = `${this.config.wfsBaseUrl};key=${this.config.apiKey}/wfs`;
      
      // Normalize street name
      const normalizedStreet = this.normalizeAddress(parsed.streetName);
      const escapedStreet = this.escapeCQLString(normalizedStreet);
      
      // Build filter with street number if available
      let cqlFilter = `title_memorial ILIKE '%${escapedStreet}%'`;
      if (parsed.streetNumber) {
        const escapedStreetNumber = this.escapeCQLString(parsed.streetNumber);
        cqlFilter += ` AND title_memorial ILIKE '%${escapedStreetNumber}%'`;
      }
      if (parsed.suburb) {
        const escapedSuburb = this.escapeCQLString(parsed.suburb.toLowerCase());
        cqlFilter += ` AND title_memorial ILIKE '%${escapedSuburb}%'`;
      }
      
      const params = {
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeNames: 'layer-50804',
        outputFormat: 'json',
        cql_filter: cqlFilter,
        maxFeatures: 15
      };

      const response = await axios.get(url, { params, timeout: 15000 });

      if (response.data.features && response.data.features.length > 0) {
        // Score results by relevance
        const scoredResults = response.data.features.map((feature: any) => {
          const score = this.scoreStreetMatch(parsed, feature);
          return {
            ...this.parseTitle(feature),
            confidence: score,
            matchStrategy: 'street_address'
          };
        }).filter((r: any) => r.confidence > 0.4); // Filter low confidence
        
        // Sort by confidence
        scoredResults.sort((a: any, b: any) => b.confidence - a.confidence);
        
        console.log(`✅ Strategy 2: Found ${scoredResults.length} street address matches`);
        return scoredResults.slice(0, 5); // Return top 5
      }
    } catch (error: any) {
      console.warn(`⚠️  Strategy 2 failed:`, error.message);
    }
    
    return [];
  }

  /**
   * Strategy 3: Query LINZ parcels layer by suburb/locality
   * Fallback when other strategies fail
   */
  private async queryBySuburbLocality(parsed: ParsedAddress): Promise<LINZTitleData[]> {
    if (!parsed.suburb) {
      return [];
    }

    try {
      console.log(`🔍 Strategy 3: Querying by suburb: ${parsed.suburb}`);
      
      const url = `${this.config.wfsBaseUrl};key=${this.config.apiKey}/wfs`;
      
      const escapedSuburb = this.escapeCQLString(parsed.suburb.toLowerCase());
      const cqlFilter = `title_memorial ILIKE '%${escapedSuburb}%'`;
      
      const params = {
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeNames: 'layer-50804',
        outputFormat: 'json',
        cql_filter: cqlFilter,
        maxFeatures: 20
      };

      const response = await axios.get(url, { params, timeout: 15000 });

      if (response.data.features && response.data.features.length > 0) {
        // Score by how well they match the full address
        const scoredResults = response.data.features.map((feature: any) => {
          const score = this.scoreGeneralMatch(parsed, feature);
          return {
            ...this.parseTitle(feature),
            confidence: score,
            matchStrategy: 'suburb_locality'
          };
        }).filter((r: any) => r.confidence > 0.3);
        
        scoredResults.sort((a: any, b: any) => b.confidence - a.confidence);
        
        console.log(`✅ Strategy 3: Found ${scoredResults.length} suburb matches`);
        return scoredResults.slice(0, 5);
      }
    } catch (error: any) {
      console.warn(`⚠️  Strategy 3 failed:`, error.message);
    }
    
    return [];
  }

  /**
   * Multi-strategy title lookup by address
   * Tries multiple approaches and returns best results
   */
  async searchTitleByAddress(address: string): Promise<LINZTitleData[]> {
    if (!this.isConfigured()) {
      console.warn('⚠️  LINZ API not configured, cannot search by address');
      return [];
    }

    // Check cache first
    const cacheKey = `address:${address.toLowerCase().trim()}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      console.log('✅ LINZ cache hit for address:', address);
      return cached.data || [];
    }

    try {
      console.log('🔍 Multi-strategy LINZ search for:', address);
      
      // Parse address to extract components
      const parsed = this.parseAddress(address);
      console.log('📝 Parsed address:', {
        lot: parsed.lotNumber,
        dp: parsed.dpNumber,
        street: parsed.streetName,
        suburb: parsed.suburb
      });
      
      // Try all strategies in parallel for speed
      const [lotDPResults, streetResults, suburbResults] = await Promise.all([
        this.queryByLotDP(parsed),
        this.queryByStreetAddress(parsed),
        this.queryBySuburbLocality(parsed)
      ]);
      
      // Combine results and deduplicate by title number
      const allResults = [...lotDPResults, ...streetResults, ...suburbResults];
      const uniqueResults = this.deduplicateResults(allResults);
      
      // Sort by confidence
      uniqueResults.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
      
      // Return top 3 matches
      const topMatches = uniqueResults.slice(0, 3);
      
      console.log(`✅ LINZ search complete: ${topMatches.length} top matches found`);
      topMatches.forEach((match, i) => {
        console.log(`  ${i + 1}. ${match.titleNumber} - ${match.legalDescription} (confidence: ${(match.confidence! * 100).toFixed(0)}%, strategy: ${match.matchStrategy})`);
      });
      
      // Cache results
      this.cache.set(cacheKey, {
        data: topMatches,
        timestamp: Date.now()
      });
      
      return topMatches;
      
    } catch (error: any) {
      console.error('❌ Error in multi-strategy LINZ search:', error.message);
      
      // Cache empty result to avoid repeated failures
      this.cache.set(cacheKey, {
        data: [],
        timestamp: Date.now()
      });
      
      return [];
    }
  }

  /**
   * Get title information by title number (exact lookup)
   */
  async getTitleByNumber(titleNumber: string): Promise<LINZTitleData | null> {
    if (!this.isConfigured()) {
      console.warn('⚠️  LINZ API not configured, cannot fetch title data');
      return null;
    }

    const cacheKey = `title:${titleNumber}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      console.log('✅ LINZ cache hit for title:', titleNumber);
      return cached.data ? cached.data[0] : null;
    }

    try {
      console.log('🔍 Fetching LINZ title data for:', titleNumber);
      
      const url = `${this.config.wfsBaseUrl};key=${this.config.apiKey}/wfs`;
      
      // Escape user input to prevent CQL injection
      const escapedTitleNumber = this.escapeCQLString(titleNumber);
      
      const params = {
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeNames: 'layer-50804',
        outputFormat: 'json',
        cql_filter: `title_no='${escapedTitleNumber}'`
      };

      const response = await axios.get(url, { params, timeout: 10000 });

      if (response.data.features && response.data.features.length > 0) {
        const titleData = this.parseTitle(response.data.features[0]);
        
        this.cache.set(cacheKey, {
          data: [titleData],
          timestamp: Date.now()
        });

        console.log('✅ LINZ title data fetched successfully:', titleNumber);
        return titleData;
      }

      console.log('⚠️  No title found for:', titleNumber);
      this.cache.set(cacheKey, { data: null, timestamp: Date.now() });
      return null;
      
    } catch (error: any) {
      console.error('❌ Error fetching LINZ title:', error.message);
      throw new Error('Failed to fetch title data from LINZ');
    }
  }

  /**
   * Deduplicate results by title number
   */
  private deduplicateResults(results: LINZTitleData[]): LINZTitleData[] {
    const seen = new Set<string>();
    return results.filter(r => {
      if (seen.has(r.titleNumber)) {
        return false;
      }
      seen.add(r.titleNumber);
      return true;
    });
  }

  /**
   * Score street address match quality
   */
  private scoreStreetMatch(parsed: ParsedAddress, feature: any): number {
    const props = feature.properties;
    const memorial = (props.title_memorial || '').toLowerCase();
    const legalDesc = (props.legal_desc || '').toLowerCase();
    
    let score = 0;
    
    // Street number match (high value)
    if (parsed.streetNumber && memorial.includes(parsed.streetNumber.toLowerCase())) {
      score += 0.4;
    }
    
    // Street name match (high value)
    if (parsed.streetName) {
      const normalizedStreet = this.normalizeAddress(parsed.streetName);
      if (memorial.includes(normalizedStreet)) {
        score += 0.4;
      }
    }
    
    // Suburb match (medium value)
    if (parsed.suburb && memorial.includes(parsed.suburb.toLowerCase())) {
      score += 0.2;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Score general match quality for fallback searches
   */
  private scoreGeneralMatch(parsed: ParsedAddress, feature: any): number {
    const props = feature.properties;
    const memorial = (props.title_memorial || '').toLowerCase();
    const legalDesc = (props.legal_desc || '').toLowerCase();
    
    let score = 0;
    const searchTerms = parsed.raw.toLowerCase().split(/[\s,]+/).filter(t => t.length > 2);
    
    // Count matching terms
    searchTerms.forEach(term => {
      if (memorial.includes(term)) score += 0.15;
      if (legalDesc.includes(term)) score += 0.1;
    });
    
    return Math.min(score, 1.0);
  }

  /**
   * Normalize address for better matching
   */
  private normalizeAddress(address: string): string {
    return address
      .toLowerCase()
      .trim()
      .replace(/\bstreet\b/g, 'st')
      .replace(/\broad\b/g, 'rd')
      .replace(/\bavenue\b/g, 'ave')
      .replace(/\bdrive\b/g, 'dr')
      .replace(/\bcrescent\b/g, 'cres')
      .replace(/\bplace\b/g, 'pl')
      .replace(/\s+/g, ' ');
  }

  /**
   * Escape special characters in CQL strings to prevent injection attacks
   * CQL (Common Query Language) requires proper escaping of special characters
   */
  private escapeCQLString(str: string): string {
    if (!str) return '';
    
    return str
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/'/g, "''")      // Escape single quotes (SQL standard)
      .replace(/%/g, '\\%')     // Escape wildcards
      .replace(/_/g, '\\_')     // Escape single char wildcard
      .replace(/;/g, '')        // Remove semicolons (statement terminators)
      .replace(/--/g, '')       // Remove SQL comments
      .replace(/\/\*/g, '')     // Remove block comment starts
      .replace(/\*\//g, '');    // Remove block comment ends
  }

  /**
   * Parse WFS feature to title data
   */
  private parseTitle(feature: any): LINZTitleData {
    const props = feature.properties;
    
    return {
      titleNumber: props.title_no || 'Unknown',
      landDistrict: props.land_district || 'Unknown',
      type: props.type || 'Unknown',
      status: props.status || 'Unknown',
      issueDate: props.issue_date || null,
      legalDescription: props.legal_desc || 'No legal description available',
      area: props.area || null,
      geometry: feature.geometry
    };
  }

  /**
   * NEW: Coordinate-based Address Search (Step 1 of 2-step verification)
   * Search for an address in LINZ Street Addresses database to get coordinates
   */
  async searchAddressByCoordinates(address: string, city: string): Promise<{
    fullAddress: string;
    coordinates: { lat: number; lon: number };
    addressId: number;
  } | null> {
    if (!this.isConfigured()) {
      console.warn('⚠️  LINZ API not configured');
      return null;
    }

    try {
      console.log(`🔍 LINZ Step 1: Searching address in Street Addresses layer: ${address}, ${city}`);
      
      const url = `${this.config.wfsBaseUrl};key=${this.config.apiKey}/wfs`;
      
      const params = {
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeNames: 'layer-105689', // NZ Street Addresses
        cql_filter: `full_address LIKE '%${this.escapeCQLString(address)}%' AND town_city='${this.escapeCQLString(city)}'`,
        count: '1',
        outputFormat: 'json',
      };

      const response = await axios.get(url, { params, timeout: 10000 });

      if (!response.data.features || response.data.features.length === 0) {
        console.log('⚠️  Address not found in LINZ Street Addresses database');
        return null;
      }

      const feature = response.data.features[0];
      const [lon, lat] = feature.geometry.coordinates;

      console.log(`✅ LINZ Step 1: Address found - coordinates: ${lat}, ${lon}`);
      
      return {
        fullAddress: feature.properties.full_address,
        coordinates: { lat, lon },
        addressId: feature.properties.address_id,
      };
    } catch (error: any) {
      console.error('❌ LINZ Step 1 failed:', error.message);
      return null;
    }
  }

  /**
   * NEW: Get title information from coordinates (Step 2 of 2-step verification)
   * Uses Koordinates Query API for coordinate-based title lookup
   */
  async getTitleByCoordinates(
    lon: number,
    lat: number,
    radius: number = 50
  ): Promise<LINZTitleData | null> {
    if (!this.isConfigured()) {
      console.warn('⚠️  LINZ API not configured');
      return null;
    }

    try {
      console.log(`🔍 LINZ Step 2: Querying title by coordinates (${lat}, ${lon}) with ${radius}m radius`);
      
      // Using Koordinates Query API
      const url = 'https://data.linz.govt.nz/services/query/v1/vector.json';
      
      const params = {
        key: this.config.apiKey,
        layer: '50804', // NZ Property Titles
        x: lon.toString(),
        y: lat.toString(),
        radius: radius.toString(),
        max_results: '1',
      };

      const response = await axios.get(url, { params, timeout: 10000 });
      
      const features = response.data.vectorQuery?.layers?.['50804']?.features || [];

      if (features.length === 0) {
        console.log('⚠️  No title found at these coordinates');
        return null;
      }

      const feature = features[0];
      const titleData = {
        titleNumber: feature.properties.title_no || 'Unknown',
        landDistrict: feature.properties.land_district || 'Unknown',
        type: feature.properties.type || 'Unknown',
        status: feature.properties.status || 'Unknown',
        issueDate: feature.properties.issue_date || null,
        legalDescription: feature.properties.legal_description || feature.properties.legal_desc || 'No legal description available',
        area: feature.properties.area || null,
        geometry: feature.geometry,
      };

      console.log(`✅ LINZ Step 2: Title found - ${titleData.titleNumber}`);
      
      return titleData;
    } catch (error: any) {
      console.error('❌ LINZ Step 2 failed:', error.message);
      return null;
    }
  }

  /**
   * NEW: Extract lot number from legal description
   * Parses formats like "LOT 1 DP 12345" or "UNIT 5 LOT 10 DP 98765"
   */
  extractLotNumber(legalDescription?: string): string {
    if (!legalDescription) {
      return '';
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

    // If no clear LOT/DP pattern, return the full legal description
    return legalDescription;
  }

  /**
   * NEW: Complete 2-step property verification workflow
   * Step 1: Search address → Get coordinates
   * Step 2: Query title by coordinates → Get title info
   */
  async verifyPropertyAddress(address: string, city: string): Promise<{
    success: boolean;
    titleNumber?: string;
    lotNumber?: string;
    legalDescription?: string;
    titleType?: string;
    status?: string;
    fullAddress?: string;
    coordinates?: { lat: number; lon: number };
    error?: string;
    message?: string;
  }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'LINZ API not configured',
        message: 'LINZ_API_KEY is missing. Please configure it to use address verification.',
      };
    }

    // Check cache
    const cacheKey = `verify:${address.toLowerCase().trim()}:${city.toLowerCase().trim()}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      console.log('✅ LINZ verification cache hit');
      return (cached.data as any[])[0] as any;
    }

    try {
      // Step 1: Search for address to get coordinates
      const addressResult = await this.searchAddressByCoordinates(address, city);

      if (!addressResult) {
        const result = {
          success: false,
          error: 'Address not found',
          message: 'The address could not be found in the LINZ database. Please check the address and try again.',
        };
        
        // Cache negative result (wrapped in array for type compatibility)
        this.cache.set(cacheKey, { data: [result] as any, timestamp: Date.now() });
        return result;
      }

      // Step 2: Get title information using coordinates
      const titleData = await this.getTitleByCoordinates(
        addressResult.coordinates.lon,
        addressResult.coordinates.lat
      );

      if (!titleData) {
        const result = {
          success: false,
          error: 'No title found',
          message: 'Address found but no title information could be found. This may be Crown land or not yet registered.',
          fullAddress: addressResult.fullAddress,
          coordinates: addressResult.coordinates,
        };
        
        this.cache.set(cacheKey, { data: [result] as any, timestamp: Date.now() });
        return result;
      }

      // Extract lot number from legal description
      const lotNumber = this.extractLotNumber(titleData.legalDescription);

      const result = {
        success: true,
        titleNumber: titleData.titleNumber,
        lotNumber: lotNumber,
        legalDescription: titleData.legalDescription,
        titleType: titleData.type,
        status: titleData.status,
        fullAddress: addressResult.fullAddress,
        coordinates: addressResult.coordinates,
      };

      // Cache successful result (wrapped in array for type compatibility)
      this.cache.set(cacheKey, { data: [result] as any, timestamp: Date.now() });
      
      console.log(`✅ LINZ verification complete:`, {
        title: result.titleNumber,
        lot: result.lotNumber,
      });

      return result;
      
    } catch (error: any) {
      console.error('❌ Error in LINZ verification:', error.message);
      
      const result = {
        success: false,
        error: 'System error',
        message: error.message || 'An unexpected error occurred during verification.',
      };
      
      this.cache.set(cacheKey, { data: [result] as any, timestamp: Date.now() });
      return result;
    }
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️  LINZ cache cleared');
  }
}

// Export singleton instance
export const linzApi = new LINZApiService();

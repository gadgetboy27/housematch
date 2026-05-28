import fetch from 'node-fetch';
import { createHmac } from 'crypto';
import OAuth from 'oauth-1.0a';

// Trade Me Sandbox Property API - Same types as production
export interface TradeMeProperty {
  ListingId: number;
  Title: string;
  Category: string;
  StartPrice: number;
  BuyNowPrice: number;
  StartDate: string;
  EndDate: string;
  IsFeatured: boolean;
  HasGallery: boolean;
  IsBold: boolean;
  IsHighlighted: boolean;
  HasHomePageFeature: boolean;
  MaxBidAmount: number;
  AsAt: string;
  CategoryPath: string;
  PictureHref: string;
  HasPayNow: boolean;
  IsNew: boolean;
  RegionId: number;
  Region: string;
  SuburbId: number;
  Suburb: string;
  BidCount: number;
  IsReserveMet: boolean;
  HasReserve: boolean;
  HasBuyNow: boolean;
  ReserveState: number;
  Attributes: Array<{
    Name: string;
    DisplayName: string;
    Value: string;
    DisplayValue: string;
  }>;
  IsClassified: boolean;
  OpenHomes: Array<{
    Start: string;
    End: string;
  }>;
  Subtitle: string;
  IsBuyNowOnly: boolean;
  IsOnWatchList: boolean;
  GeographicLocation: {
    Latitude: number;
    Longitude: number;
    Northing: number;
    Easting: number;
    Accuracy: number;
  };
  PriceDisplay: string;
}

export interface TradeMeSearchResponse {
  TotalCount: number;
  TotalCountTruncated: boolean;
  Page: number;
  PageSize: number;
  List: TradeMeProperty[];
}

export class TradeMeSandboxService {
  private baseUrl = 'https://api.tmsandbox.co.nz/v1';
  private oauth: OAuth;
  private consumerKey: string;
  private consumerSecret: string;

  constructor() {
    // Use same credentials for now - sandbox apps are auto-approved
    this.consumerKey = process.env.TRADEME_CONSUMER_KEY || '';
    this.consumerSecret = process.env.TRADEME_CONSUMER_SECRET || '';
    
    this.oauth = new OAuth({
      consumer: {
        key: this.consumerKey,
        secret: this.consumerSecret,
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return createHmac('sha1', key).update(base_string).digest('base64');
      },
    });
  }

  private async makeAuthenticatedRequest(url: string, method: string = 'GET'): Promise<any> {
    try {
      const requestData = {
        url: url,
        method: method,
      };

      const authHeader = this.oauth.toHeader(this.oauth.authorize(requestData));
      
      const response = await fetch(url, {
        method: method,
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Trade Me Sandbox API error: ${response.status} ${response.statusText}`, errorText);
        return { 
          error: true, 
          status: response.status, 
          statusText: response.statusText, 
          data: errorText 
        };
      }

      return await response.json();
    } catch (error) {
      console.error('Error making authenticated Trade Me sandbox request:', error);
      return { 
        error: true, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Test sandbox without OAuth first (to see if endpoint works)
   */
  async testSandboxBasic(): Promise<any> {
    try {
      const url = `${this.baseUrl}/Search/Property/Residential.json?region=1&rows=3&photo_size=Large`;
      const response = await fetch(url);
      const data = await response.json();
      
      return {
        status: response.status,
        statusText: response.statusText,
        url: url,
        data: data
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test sandbox with OAuth authentication
   */
  async testSandboxOAuth(): Promise<any> {
    try {
      const url = `${this.baseUrl}/Search/Property/Residential.json?region=1&rows=3&photo_size=Large&sort_order=ExpiryDesc`;
      const data = await this.makeAuthenticatedRequest(url);
      
      return {
        url: url,
        authMode: 'OAuth',
        credentials: this.consumerKey ? 'Present' : 'Missing',
        data: data
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Search residential properties in sandbox
   */
  async searchResidential(filters: {
    region?: number;
    suburb?: string;
    price_min?: number;
    price_max?: number;
    bedrooms_min?: number;
    bedrooms_max?: number;
    bathrooms_min?: number;
    bathrooms_max?: number;
    property_type?: string;
    sort_order?: string;
    rows?: number;
    page?: number;
    photo_size?: 'Thumbnail' | 'List' | 'Medium' | 'Gallery' | 'Large' | 'FullSize';
  } = {}): Promise<TradeMeProperty[]> {
    try {
      const params = new URLSearchParams();
      
      // Add filters to query params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });

      const url = `${this.baseUrl}/Search/Property/Residential.json?${params.toString()}`;
      const data = await this.makeAuthenticatedRequest(url);
      
      if (!data || data.error) {
        console.log('Sandbox API response:', data);
        return [];
      }

      return (data as TradeMeSearchResponse).List || [];
    } catch (error) {
      console.error('Error fetching properties from Trade Me sandbox:', error);
      return [];
    }
  }

  /**
   * Get sample sandbox properties for testing
   */
  async getSampleProperties(): Promise<{ 
    success: boolean; 
    properties?: TradeMeProperty[]; 
    totalCount?: number;
    error?: string;
    debugInfo?: any;
  }> {
    try {
      // First test basic connection
      const basicTest = await this.testSandboxBasic();
      console.log('Basic sandbox test:', basicTest);

      // Then test with OAuth
      const oauthTest = await this.testSandboxOAuth();
      console.log('OAuth sandbox test:', oauthTest);

      // Try to get actual properties
      const properties = await this.searchResidential({ 
        region: 1, // Auckland region ID
        rows: 5,
        photo_size: 'Large',
        sort_order: 'ExpiryDesc'
      });

      return {
        success: properties.length > 0,
        properties: properties,
        totalCount: properties.length,
        debugInfo: {
          basicTest,
          oauthTest
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const tradeMeSandboxService = new TradeMeSandboxService();
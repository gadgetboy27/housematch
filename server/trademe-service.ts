import fetch from 'node-fetch';
import { createHash, createHmac, randomBytes } from 'crypto';
import OAuth from 'oauth-1.0a';

// Trade Me Property API types
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

export class TradeMeService {
  private baseUrl = 'https://api.trademe.co.nz/v1';
  private oauth: OAuth;
  private consumerKey: string;
  private consumerSecret: string;

  constructor() {
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

  /**
   * Search residential properties
   */
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
        console.error(`Trade Me API error: ${response.status} ${response.statusText}`, errorText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error making authenticated Trade Me request:', error);
      return null;
    }
  }

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
      
      if (!data) {
        return [];
      }

      return (data as TradeMeSearchResponse).List || [];
    } catch (error) {
      console.error('Error fetching properties from Trade Me:', error);
      return [];
    }
  }

  /**
   * Search open homes
   */
  async searchOpenHomes(filters: {
    region?: number;
    suburb?: string;
    rows?: number;
    page?: number;
    photo_size?: 'Thumbnail' | 'List' | 'Medium' | 'Gallery' | 'Large' | 'FullSize';
  } = {}): Promise<TradeMeProperty[]> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });

      const url = `${this.baseUrl}/Search/Property/OpenHomes.json?${params.toString()}`;
      const data = await this.makeAuthenticatedRequest(url);
      
      if (!data) {
        return [];
      }

      return (data as TradeMeSearchResponse).List || [];
    } catch (error) {
      console.error('Error fetching open homes from Trade Me:', error);
      return [];
    }
  }

  /**
   * Test API connection with sample data
   */
  async testConnection(): Promise<{ 
    success: boolean; 
    sampleProperties?: TradeMeProperty[]; 
    totalCount?: number;
    error?: string;
    authStatus?: string;
  }> {
    try {
      // Check if we have credentials
      if (!this.consumerKey || !this.consumerSecret) {
        return {
          success: false,
          error: 'Missing Trade Me API credentials',
          authStatus: 'No credentials configured'
        };
      }

      // Test with Auckland residential properties, larger photos
      const properties = await this.searchResidential({ 
        region: 1, // Auckland region ID
        rows: 3,
        photo_size: 'Large',
        sort_order: 'ExpiryDesc' // Newest listings first
      });

      if (!properties) {
        return {
          success: false,
          error: 'Authentication failed or API unavailable',
          authStatus: 'Authentication error'
        };
      }

      if (properties.length === 0) {
        return {
          success: false,
          error: 'No properties found - check if application is approved',
          authStatus: 'Authenticated but no data'
        };
      }

      return { 
        success: true, 
        sampleProperties: properties, 
        totalCount: properties.length,
        authStatus: 'Authenticated and approved'
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        authStatus: 'Connection failed'
      };
    }
  }
}

export const tradeMeService = new TradeMeService();
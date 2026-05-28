// PropertyVerification.tsx
// Complete React TypeScript component for LINZ property verification

import React, { useState } from 'react';

// ============================================================================
// CONFIGURATION
// ============================================================================

// SECURITY: API key should be stored as an environment variable
// For frontend: Add VITE_LINZ_API_KEY to your .env file
// For backend: Add LINZ_API_KEY to Replit Secrets
const LINZ_API_KEY = import.meta.env.VITE_LINZ_API_KEY || '';

if (!LINZ_API_KEY) {
  console.error('LINZ_API_KEY is not configured. Please add VITE_LINZ_API_KEY to your environment variables.');
}

const LINZ_ENDPOINTS = {
  addressSearch: `https://data.linz.govt.nz/services;key=${LINZ_API_KEY}/wfs`,
  titleQuery: `https://data.linz.govt.nz/services/query/v1/vector.json`,
};

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

interface PropertyVerificationResult {
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

interface AddressFeature {
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

interface TitleFeature {
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

interface ApiError {
  error: string;
  message?: string;
}

// ============================================================================
// API SERVICE
// ============================================================================

class LinzApiService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Search for an address in the LINZ database
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

    const url = `${LINZ_ENDPOINTS.addressSearch}?${params.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return null;
    }

    return data.features[0] as AddressFeature;
  }

  /**
   * Get title information from coordinates
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

    const url = `${LINZ_ENDPOINTS.titleQuery}?${params.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const features = data.vectorQuery?.layers?.['50804']?.features || [];

    if (features.length === 0) {
      return null;
    }

    return features[0] as TitleFeature;
  }

  /**
   * Get title and lot information from address
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

      // Get coordinates
      const [lon, lat] = addressFeature.geometry.coordinates;

      // Step 2: Get title information
      const titleFeature = await this.getTitleByCoordinates(lon, lat);

      if (!titleFeature) {
        return {
          error: 'No title found',
          message: 'No title information could be found for this property.',
        };
      }

      // Extract data
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
      return {
        error: 'System error',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
      };
    }
  }

  /**
   * Extract lot number from legal description
   */
  private extractLotNumber(legalDescription?: string): string {
    if (!legalDescription) {
      return 'N/A';
    }

    // Try to extract LOT and DP numbers
    // Examples: "LOT 1 DP 12345", "UNIT 5 LOT 10 DP 98765"
    const lotMatch = legalDescription.match(/LOT\s+(\d+)/i);
    const dpMatch = legalDescription.match(/DP\s+(\d+)/i);

    if (lotMatch && dpMatch) {
      return `Lot ${lotMatch[1]} DP ${dpMatch[1]}`;
    }

    // If no clear LOT/DP pattern, return the full legal description
    return legalDescription;
  }

  /**
   * Generate link to LINZ Land Record Search for ordering title
   */
  getLandRecordSearchUrl(titleNumber?: string): string {
    const baseUrl = 'https://lrs.linz.govt.nz/search/';
    if (titleNumber) {
      return `${baseUrl}?title=${encodeURIComponent(titleNumber)}`;
    }
    return baseUrl;
  }
}

// ============================================================================
// REACT COMPONENT
// ============================================================================

// NZ Cities/Towns for dropdown
const NZ_CITIES = [
  'Auckland',
  'Wellington',
  'Christchurch',
  'Hamilton',
  'Tauranga',
  'Lower Hutt',
  'Dunedin',
  'Palmerston North',
  'Napier',
  'Porirua',
  'Hibiscus Coast',
  'New Plymouth',
  'Rotorua',
  'Whangarei',
  'Nelson',
  'Hastings',
  'Invercargill',
];

interface PropertyVerificationProps {
  onVerificationComplete?: (result: PropertyVerificationResult) => void;
}

const PropertyVerification: React.FC<PropertyVerificationProps> = ({
  onVerificationComplete,
}) => {
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Auckland');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PropertyVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const linzApi = new LinzApiService(LINZ_API_KEY);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address.trim()) {
      setError('Please enter a property address');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    const verificationResult = await linzApi.getPropertyVerification(address, city);

    setIsLoading(false);

    if ('error' in verificationResult) {
      setError(verificationResult.message || verificationResult.error);
      return;
    }

    setResult(verificationResult);

    // Call parent callback if provided
    if (onVerificationComplete) {
      onVerificationComplete(verificationResult);
    }
  };

  const handleOrderTitle = () => {
    const url = linzApi.getLandRecordSearchUrl(result?.titleNumber);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleReset = () => {
    setAddress('');
    setCity('Auckland');
    setResult(null);
    setError(null);
  };

  return (
    <div className="property-verification">
      <h2>Property Verification</h2>
      <p className="subtitle">
        Verify property details with official LINZ records
      </p>

      {/* Input Form */}
      <form onSubmit={handleVerify} className="verification-form">
        <div className="form-group">
          <label htmlFor="address">Property Address</label>
          <input
            type="text"
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g., 123 Queen Street"
            disabled={isLoading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="city">City/Town</label>
          <select
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={isLoading}
            required
          >
            {NZ_CITIES.map((cityName) => (
              <option key={cityName} value={cityName}>
                {cityName}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary">
          {isLoading ? 'Verifying...' : 'Verify Property'}
        </button>
      </form>

      {/* Loading State */}
      {isLoading && (
        <div className="status-message loading">
          <div className="spinner"></div>
          <p>Checking LINZ database...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="status-message error">
          <h3>❌ Verification Error</h3>
          <p>{error}</p>
          <button onClick={handleReset} className="btn-secondary">
            Try Again
          </button>
        </div>
      )}

      {/* Success State */}
      {result && !error && (
        <div className="verification-result success">
          <h3>✓ Property Verified with LINZ</h3>

          <div className="result-grid">
            <div className="result-item highlight">
              <label>Title Number</label>
              <span className="value">{result.titleNumber}</span>
            </div>

            <div className="result-item highlight">
              <label>Lot Number</label>
              <span className="value">{result.lotNumber}</span>
            </div>

            <div className="result-item">
              <label>Title Type</label>
              <span className="value">{result.titleType}</span>
            </div>

            <div className="result-item">
              <label>Status</label>
              <span className="value status-badge">{result.status}</span>
            </div>

            <div className="result-item full-width">
              <label>Legal Description</label>
              <span className="value">{result.legalDescription}</span>
            </div>

            {result.fullAddress && (
              <div className="result-item full-width">
                <label>Verified Address</label>
                <span className="value">{result.fullAddress}</span>
              </div>
            )}
          </div>

          <div className="buyer-note">
            <h4>For Buyers</h4>
            <p>
              Please verify these details match the property you're viewing. For
              complete ownership and encumbrance information, you can order the
              official title document from LINZ.
            </p>
            <button onClick={handleOrderTitle} className="btn-primary">
              Order Official Title Document ($8)
            </button>
          </div>

          <div className="action-buttons">
            <button onClick={handleReset} className="btn-secondary">
              Verify Another Property
            </button>
          </div>
        </div>
      )}

      {/* Attribution */}
      <div className="attribution">
        <p>
          Property data sourced from{' '}
          <a
            href="https://data.linz.govt.nz"
            target="_blank"
            rel="noopener noreferrer"
          >
            LINZ Data Service
          </a>{' '}
          and licensed for reuse under{' '}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noopener noreferrer"
          >
            CC BY 4.0
          </a>
        </p>
      </div>
    </div>
  );
};

export default PropertyVerification;

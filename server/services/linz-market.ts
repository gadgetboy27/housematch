import axios from 'axios';

export interface MarketCard {
  id: string;
  fullAddress: string;
  addressNumber: string;
  roadName: string;
  suburb: string;
  city: string;
  lat: number;
  lng: number;
  source: 'linz';
}

interface NearbySchool {
  name: string;
  type: string;   // Contributing, Full Primary, Secondary, etc.
  decile?: number;
  distance?: number;
}

export interface AutoPropertyReport {
  address: string;
  city: string;
  generatedAt: string;
  linz: {
    verified: boolean;
    titleNumber?: string;
    titleType?: string;
    titleStatus?: string;
    legalDescription?: string;
    landArea?: string;
    landDistrict?: string;
  };
  nearbySchools: NearbySchool[];
  nearbyMarket: MarketCard[];
  manualChecklist: string[];
}

class LINZMarketService {
  private cache = new Map<string, { data: MarketCard[]; ts: number }>();
  private readonly TTL = 6 * 60 * 60 * 1000; // 6 hours

  private get apiKey() { return process.env.LINZ_API_KEY || ''; }
  private get wfsUrl() {
    return `https://data.linz.govt.nz/services;key=${this.apiKey}/wfs`;
  }

  private escapeCQL(s: string): string {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '');
  }

  async getMarketCards(suburb: string | null, city: string, limit = 20): Promise<MarketCard[]> {
    if (!this.apiKey) return [];

    const key = `market:${(suburb ?? 'all').toLowerCase()}:${city.toLowerCase()}`;
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.ts < this.TTL) return cached.data;

    try {
      const cityFilter = `town_city ILIKE '${this.escapeCQL(city)}'`;
      const cql_filter = suburb
        ? `suburb_locality ILIKE '${this.escapeCQL(suburb)}' AND ${cityFilter}`
        : cityFilter;

      const params = {
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeNames: 'layer-105689', // NZ Street Addresses
        outputFormat: 'json',
        cql_filter,
        count: limit,
      };

      const res = await axios.get(this.wfsUrl, { params, timeout: 15000 });
      const features: any[] = res.data?.features || [];

      const cards: MarketCard[] = features.map((f: any) => {
        const p = f.properties;
        const [lng, lat] = f.geometry?.coordinates || [0, 0];
        return {
          id: String(p.address_id ?? Math.random()),
          fullAddress: p.full_address || `${p.address_number} ${p.road_name}`,
          addressNumber: String(p.address_number || ''),
          roadName: String(p.road_name || ''),
          suburb: p.suburb_locality || suburb,
          city: p.town_city || city,
          lat,
          lng,
          source: 'linz' as const,
        };
      });

      this.cache.set(key, { data: cards, ts: Date.now() });
      return cards;
    } catch (err: any) {
      console.error('LINZ market error:', err.message);
      return [];
    }
  }

  async getSuburbSuggestions(query: string, city?: string): Promise<string[]> {
    if (!this.apiKey || query.length < 2) return [];

    try {
      let filter = `suburb_locality ILIKE '${this.escapeCQL(query)}%'`;
      if (city) filter += ` AND town_city ILIKE '${this.escapeCQL(city)}'`;

      const params = {
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeNames: 'layer-105689',
        outputFormat: 'json',
        cql_filter: filter,
        count: 20,
        propertyName: 'suburb_locality,town_city',
      };

      const res = await axios.get(this.wfsUrl, { params, timeout: 8000 });
      const suburbs = new Set<string>();
      for (const f of res.data?.features || []) {
        if (f.properties?.suburb_locality) suburbs.add(f.properties.suburb_locality);
      }
      return Array.from(suburbs).sort().slice(0, 8);
    } catch {
      return [];
    }
  }

  // Queries MoE school API for nearby schools given lat/lng.
  // Returns an empty array on failure so reports degrade gracefully.
  async getNearbySchools(lat: number, lng: number): Promise<NearbySchool[]> {
    try {
      const res = await axios.get(
        'https://www.educationcounts.govt.nz/api/school/v1/schools',
        {
          params: { latitude: lat, longitude: lng, radius: 2000 },
          timeout: 8000,
        }
      );
      const raw: any[] = res.data?.schools || res.data || [];
      return raw.slice(0, 5).map((s: any) => ({
        name: s.name || s.school_name || 'Unknown',
        type: s.school_type || s.type || '',
        decile: s.decile ?? undefined,
        distance: s.distance ?? undefined,
      }));
    } catch {
      return [];
    }
  }

  async generateAutoReport(address: string, city: string): Promise<AutoPropertyReport> {
    const { linzApi } = await import('./linz-api.js');
    const linzResult = await linzApi.verifyPropertyAddress(address, city);

    const [nearbySchools, nearbyMarket] = await Promise.all([
      linzResult.coordinates
        ? this.getNearbySchools(linzResult.coordinates.lat, linzResult.coordinates.lon)
        : Promise.resolve([]),
      // Get up to 8 market cards from the same suburb for context
      this.getMarketCards(
        address.split(',')[1]?.trim() || city,
        city,
        8
      ),
    ]);

    return {
      address,
      city,
      generatedAt: new Date().toISOString(),
      linz: {
        verified: linzResult.success,
        titleNumber: linzResult.titleNumber,
        titleType: linzResult.titleType,
        titleStatus: linzResult.status,
        legalDescription: linzResult.legalDescription,
        landDistrict: (linzResult as any).landDistrict,
        landArea: linzResult.legalDescription?.match(/(\d+(?:\.\d+)?)\s*m²/)?.[0],
      },
      nearbySchools,
      nearbyMarket,
      manualChecklist: [
        'LIM Report — order from your local council ($200–$400, ~10 working days)',
        'Building inspection — licensed inspector ($500–$800)',
        'Title instruments — registered owner names & mortgages (from LINZ, ~$20)',
        'Body corporate records (if Unit Title) — request from body corp manager',
        'Earthquake-prone building status — check with local council',
        'Building consent history — check with local council',
      ],
    };
  }
}

export const linzMarketService = new LINZMarketService();

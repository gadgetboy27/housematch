// New Zealand Regions and Council Jurisdictions
// Used for location-based report filtering

export type NZRegion = 
  | 'auckland'
  | 'wellington' 
  | 'christchurch'
  | 'hamilton'
  | 'tauranga'
  | 'dunedin'
  | 'palmerston-north'
  | 'napier'
  | 'porirua'
  | 'rotorua'
  | 'other';

export interface RegionConfig {
  id: NZRegion;
  name: string;
  displayName: string;
  council: string;
  limReportId: string | null; // Which LIM report they can purchase
  // Suburbs/areas within this region (for auto-detection)
  suburbs?: string[];
}

export const nzRegions: Record<NZRegion, RegionConfig> = {
  'auckland': {
    id: 'auckland',
    name: 'auckland',
    displayName: 'Auckland',
    council: 'Auckland Council',
    limReportId: 'lim_auckland',
    suburbs: [
      'Ponsonby', 'Parnell', 'Remuera', 'Takapuna', 'Devonport', 
      'Mt Eden', 'Epsom', 'Mission Bay', 'St Heliers', 'Newmarket',
      'Albany', 'Manukau', 'Pakuranga', 'Howick', 'Botany'
    ],
  },
  'wellington': {
    id: 'wellington',
    name: 'wellington',
    displayName: 'Wellington',
    council: 'Wellington City Council',
    limReportId: 'lim_wellington',
    suburbs: [
      'Te Aro', 'Kelburn', 'Mt Victoria', 'Thorndon', 'Newtown',
      'Island Bay', 'Karori', 'Khandallah', 'Miramar', 'Kilbirnie'
    ],
  },
  'christchurch': {
    id: 'christchurch',
    name: 'christchurch',
    displayName: 'Christchurch',
    council: 'Christchurch City Council',
    limReportId: 'lim_christchurch',
    suburbs: [
      'Riccarton', 'Merivale', 'Fendalton', 'St Albans', 'Papanui',
      'Sumner', 'New Brighton', 'Addington', 'Sydenham', 'Linwood'
    ],
  },
  'hamilton': {
    id: 'hamilton',
    name: 'hamilton',
    displayName: 'Hamilton',
    council: 'Hamilton City Council',
    limReportId: null, // No LIM report available yet
    suburbs: ['Hillcrest', 'Rototuna', 'Chartwell', 'Frankton', 'Hamilton East'],
  },
  'tauranga': {
    id: 'tauranga',
    name: 'tauranga',
    displayName: 'Tauranga',
    council: 'Tauranga City Council',
    limReportId: null,
    suburbs: ['Mount Maunganui', 'Papamoa', 'Bethlehem', 'Greerton', 'Otumoetai'],
  },
  'dunedin': {
    id: 'dunedin',
    name: 'dunedin',
    displayName: 'Dunedin',
    council: 'Dunedin City Council',
    limReportId: null,
    suburbs: ['North Dunedin', 'St Clair', 'Roslyn', 'Caversham', 'Mosgiel'],
  },
  'palmerston-north': {
    id: 'palmerston-north',
    name: 'palmerston-north',
    displayName: 'Palmerston North',
    council: 'Palmerston North City Council',
    limReportId: null,
    suburbs: ['Terrace End', 'Roslyn', 'Hokowhitu', 'Takaro', 'Awapuni'],
  },
  'napier': {
    id: 'napier',
    name: 'napier',
    displayName: 'Napier',
    council: 'Napier City Council',
    limReportId: null,
    suburbs: ['Ahuriri', 'Bluff Hill', 'Marewa', 'Onekawa', 'Taradale'],
  },
  'porirua': {
    id: 'porirua',
    name: 'porirua',
    displayName: 'Porirua',
    council: 'Porirua City Council',
    limReportId: null,
    suburbs: ['Whitby', 'Papakowhai', 'Ascot Park', 'Titahi Bay', 'Cannons Creek'],
  },
  'rotorua': {
    id: 'rotorua',
    name: 'rotorua',
    displayName: 'Rotorua',
    council: 'Rotorua Lakes Council',
    limReportId: null,
    suburbs: ['Western Heights', 'Koutu', 'Ngongotaha', 'Hamurana', 'Springfield'],
  },
  'other': {
    id: 'other',
    name: 'other',
    displayName: 'Other NZ Location',
    council: 'Other',
    limReportId: null,
    suburbs: [],
  },
};

// Helper to get region config by city name
export function getRegionByCity(city: string | null | undefined): RegionConfig | null {
  if (!city) return null;
  
  const normalizedCity = city.toLowerCase().trim();
  
  // Direct match
  if (normalizedCity in nzRegions) {
    return nzRegions[normalizedCity as NZRegion];
  }
  
  // Try to find by display name
  const region = Object.values(nzRegions).find(
    r => r.displayName.toLowerCase() === normalizedCity
  );
  
  return region || null;
}

// Helper to get available regions as dropdown options
export function getRegionOptions(): Array<{ value: NZRegion; label: string }> {
  return Object.values(nzRegions)
    .filter(r => r.id !== 'other') // Exclude "Other" from main list
    .map(r => ({
      value: r.id,
      label: r.displayName,
    }))
    .concat([{ value: 'other', label: 'Other NZ Location' }]);
}

// Helper to detect region from suburb name
export function detectRegionFromSuburb(suburb: string): NZRegion | null {
  const normalizedSuburb = suburb.toLowerCase().trim();
  
  for (const region of Object.values(nzRegions)) {
    if (region.suburbs) {
      const match = region.suburbs.find(
        s => s.toLowerCase() === normalizedSuburb
      );
      if (match) return region.id;
    }
  }
  
  return null;
}

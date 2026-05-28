import { getRegionByCity } from './nzRegions';

export interface ReportProvider {
  id: string;
  name: string;
  type: 'api' | 'manual' | 'assisted';
  website?: string;
  apiEndpoint?: string;
}

export interface ReportType {
  id: string;
  name: string;
  category: 'legal' | 'structural' | 'financial' | 'market';
  description: string;
  detailedDescription: string;
  provider: ReportProvider;
  
  // Pricing (in NZD cents)
  basePriceCents: number;
  ourPriceCents: number; // With markup
  savingsCents: number;
  
  // Turnaround time
  estimatedDays: number;
  fastTrackAvailable: boolean;
  fastTrackDays?: number;
  fastTrackPriceCents?: number;
  
  // What's included
  includes: string[];
  
  // Availability
  availability: 'available' | 'coming_soon';
  
  // Display
  icon: string;
  color: string;
  isPopular: boolean;
  displayOrder: number;
}

export interface ReportBundle {
  id: string;
  name: string;
  description: string;
  badge: string;
  reportIds: string[];
  
  // Pricing
  regularPriceCents: number; // Sum of individual reports
  bundlePriceCents: number; // Discounted price
  savingsCents: number;
  
  // Availability
  availability: 'available' | 'coming_soon';
  
  // Display
  icon: string;
  color: string;
  isPopular: boolean;
  displayOrder: number;
}

// Provider Definitions
export const providers: Record<string, ReportProvider> = {
  linz: {
    id: 'linz',
    name: 'LINZ (Land Information NZ)',
    type: 'api',
    website: 'https://linz.govt.nz',
    apiEndpoint: 'https://data.linz.govt.nz/services',
  },
  mbie: {
    id: 'mbie',
    name: 'MBIE (Ministry of Business)',
    type: 'api',
    website: 'https://api.business.govt.nz',
    apiEndpoint: 'https://api.business.govt.nz/gateway/tenancy-services',
  },
  aucklandCouncil: {
    id: 'auckland_council',
    name: 'Auckland Council',
    type: 'assisted',
    website: 'https://new.aucklandcouncil.govt.nz/en/buying-property/order-property-report/order-lim.html',
  },
  wellingtonCouncil: {
    id: 'wellington_council',
    name: 'Wellington City Council',
    type: 'assisted',
    website: 'https://wellington.govt.nz/property-rates-and-building/property/reports/lim',
  },
  christchurchCouncil: {
    id: 'christchurch_council',
    name: 'Christchurch City Council',
    type: 'assisted',
    website: 'https://ccc.govt.nz',
  },
  hppi: {
    id: 'hppi',
    name: 'House Pre-Purchase Inspections',
    type: 'assisted',
    website: 'https://www.hppi.co.nz',
  },
  redLbp: {
    id: 'red_lbp',
    name: 'Red LBP',
    type: 'assisted',
    website: 'https://www.redlbp.co.nz',
  },
  swiperight: {
    id: 'swiperight',
    name: 'HouseMatch.nz',
    type: 'api',
    website: 'https://housematch.nz',
  },
};

// Individual Report Types
export const reportTypes: Record<string, ReportType> = {
  titleSearch: {
    id: 'title_search',
    name: 'Property Title Search',
    category: 'legal',
    description: 'Official property ownership and encumbrance details',
    detailedDescription: 'Get the official Certificate of Title showing current registered owner, mortgages, liens, easements, covenants, and legal land description. Automated delivery in 2 business days.',
    provider: providers.linz,
    
    basePriceCents: 800, // $8 from LINZ
    ourPriceCents: 1900, // $19 with markup (increased from $15)
    savingsCents: 600, // vs $25 elsewhere
    
    estimatedDays: 2, // Automated delivery after 2 business days
    fastTrackAvailable: false,
    
    includes: [
      'Current registered owner details',
      'All encumbrances (mortgages, liens)',
      'Easements and covenants',
      'Legal land description',
      'Digital delivery within 2 business days',
      'Searchable PDF format',
    ],
    
    availability: 'available',
    
    icon: '📄',
    color: 'blue',
    isPopular: true,
    displayOrder: 1,
  },
  
  rentalData: {
    id: 'rental_data',
    name: 'Rental Market Analysis',
    category: 'market',
    description: 'MBIE rental statistics and yield analysis',
    detailedDescription: 'Comprehensive rental market data showing median rents, rental yields, bond statistics, and market trends for the property\'s area. Powered by official MBIE data.',
    provider: providers.mbie,
    
    basePriceCents: 0, // Free from MBIE API
    ourPriceCents: 2900, // $29 for our analysis
    savingsCents: 2100, // vs $50 for similar reports
    
    estimatedDays: 0, // Instant via API
    fastTrackAvailable: false,
    
    includes: [
      'Median weekly rent for area',
      'Rental yield calculation',
      'Bond statistics and trends',
      'Market rent percentiles (25th, 50th, 75th)',
      'Historical rental trends (6-12 months)',
      'Branded PDF report',
    ],
    
    availability: 'coming_soon',
    
    icon: '💰',
    color: 'green',
    isPopular: false,
    displayOrder: 2,
  },
  
  limAuckland: {
    id: 'lim_auckland',
    name: 'LIM Report (Auckland)',
    category: 'legal',
    description: 'Land Information Memorandum from Auckland Council',
    detailedDescription: 'Official council report showing building/resource consents, zoning, hazards, rates, and all council-held information. Essential for property purchase.',
    provider: providers.aucklandCouncil,
    
    basePriceCents: 37500, // $375 from Auckland Council
    ourPriceCents: 48750, // $487.50 with 30% markup (was $399)
    savingsCents: 17030, // vs $657.80 urgent option
    
    estimatedDays: 10,
    fastTrackAvailable: true,
    fastTrackDays: 3,
    fastTrackPriceCents: 65780, // $657.80 with 30% markup (was $519)
    
    includes: [
      'Building & resource consents',
      'Zoning and district plan info',
      'Natural hazards (flooding, land instability)',
      'Rates information',
      'Services and utilities',
      'Code compliance certificates',
      'We submit and track your order',
      'Cancellation fee: $65 (30% markup applied)',
    ],
    
    availability: 'available',
    
    icon: '🏛️',
    color: 'purple',
    isPopular: true,
    displayOrder: 3,
  },
  
  limWellington: {
    id: 'lim_wellington',
    name: 'LIM Report (Wellington)',
    category: 'legal',
    description: 'Land Information Memorandum from Wellington Council',
    detailedDescription: 'Official council report showing building/resource consents, zoning, hazards, rates, and all council-held information. Essential for property purchase.',
    provider: providers.wellingtonCouncil,
    
    basePriceCents: 56350, // $563.50 from Wellington Council
    ourPriceCents: 58900, // $589 with our service
    savingsCents: 25600, // vs $845.50 urgent
    
    estimatedDays: 10,
    fastTrackAvailable: true,
    fastTrackDays: 5,
    fastTrackPriceCents: 86900, // $869
    
    includes: [
      'Building & resource consents',
      'Zoning and district plan info',
      'Natural hazards (earthquake, flooding)',
      'Rates information',
      'Services and utilities',
      'Code compliance certificates',
      'We submit and track your order',
    ],
    
    availability: 'available',
    
    icon: '🏛️',
    color: 'purple',
    isPopular: false,
    displayOrder: 4,
  },
  
  limChristchurch: {
    id: 'lim_christchurch',
    name: 'LIM Report (Christchurch)',
    category: 'legal',
    description: 'Land Information Memorandum from Christchurch Council',
    detailedDescription: 'Official council report showing building/resource consents, zoning, hazards, rates, and all council-held information. Essential for property purchase.',
    provider: providers.christchurchCouncil,
    
    basePriceCents: 29000, // $290 from Christchurch Council - Residential
    ourPriceCents: 37700, // $377 with 30% markup (was $319)
    savingsCents: 13000, // vs $507 fast track
    
    estimatedDays: 10,
    fastTrackAvailable: true,
    fastTrackDays: 5,
    fastTrackPriceCents: 50700, // $507 with 30% markup (was $409)
    
    includes: [
      'Building & resource consents',
      'Zoning and district plan info',
      'Earthquake/liquefaction hazards',
      'Rates information',
      'Services and utilities',
      'Code compliance certificates',
      'We submit and track your order',
      'Cancellation fee: $65 (30% markup applied)',
    ],
    
    availability: 'available',
    
    icon: '🏛️',
    color: 'purple',
    isPopular: false,
    displayOrder: 5,
  },
  
  pimResidential: {
    id: 'pim_residential',
    name: 'PIM Report - Residential (Building Act)',
    category: 'legal',
    description: 'Project Information Memoranda for building consents',
    detailedDescription: 'A Project Information Memoranda (PIM) is a Council document issued under Section 31-35 of the Building Act 2004 that provides information about a property relevant to a proposed building project. It advises on whether other authorisations are required for your project, such as resource consent.',
    provider: providers.christchurchCouncil,
    
    basePriceCents: 36000, // $360 deposit from Council
    ourPriceCents: 46800, // $468 with 30% markup
    savingsCents: 0, // Statutory requirement - no alternatives
    
    estimatedDays: 20, // Statutory time
    fastTrackAvailable: false,
    
    includes: [
      'Building consent requirements',
      'Resource consent requirements',
      'District plan information',
      'Known property constraints',
      'Services and utilities availability',
      'Natural hazards affecting building',
      'Heritage or conservation restrictions',
      'We submit and track your order',
      'Deposit only - full cost on application',
    ],
    
    availability: 'available',
    
    icon: '📋',
    color: 'blue',
    isPopular: false,
    displayOrder: 6,
  },
  
  pimCommercial: {
    id: 'pim_commercial',
    name: 'PIM Report - Commercial/Industrial (Building Act)',
    category: 'legal',
    description: 'Project Information Memoranda for commercial projects',
    detailedDescription: 'A Project Information Memoranda (PIM) is a Council document issued under Section 31-35 of the Building Act 2004 that provides information about a property relevant to a proposed commercial or industrial building project. It advises on whether other authorisations are required for your project, such as resource consent.',
    provider: providers.christchurchCouncil,
    
    basePriceCents: 48500, // $485 deposit from Council
    ourPriceCents: 63050, // $630.50 with 30% markup
    savingsCents: 0, // Statutory requirement - no alternatives
    
    estimatedDays: 20, // Statutory time
    fastTrackAvailable: false,
    
    includes: [
      'Building consent requirements',
      'Resource consent requirements',
      'District plan information',
      'Known property constraints',
      'Services and utilities availability',
      'Natural hazards affecting building',
      'Commercial zoning restrictions',
      'Parking and access requirements',
      'We submit and track your order',
      'Deposit only - full cost on application',
    ],
    
    availability: 'available',
    
    icon: '🏢',
    color: 'blue',
    isPopular: false,
    displayOrder: 7,
  },

  buildingInspection: {
    id: 'building_inspection',
    name: 'Building Inspection Report',
    category: 'structural',
    description: 'Professional pre-purchase building inspection',
    detailedDescription: 'Comprehensive inspection by qualified Licensed Building Practitioner covering structure, weathertightness, electrical, plumbing, and more. Includes detailed photos, moisture testing, and recommendations. Pricing based on Red LBP for properties under 100m² - larger properties may incur additional fees.',
    provider: providers.redLbp,
    
    basePriceCents: 65000, // $650 from Red LBP (under 100m²)
    ourPriceCents: 84500, // $845 with 30% markup (was $699)
    savingsCents: 10500, // vs $950 for 101-200m²
    
    estimatedDays: 2, // 24-48 hours typical
    fastTrackAvailable: false, // Red LBP doesn't offer fast track for inspections
    
    includes: [
      'Full structural inspection by LBP',
      'Weathertightness assessment',
      'Roof and foundations check',
      'Electrical and plumbing review',
      'Non-invasive moisture testing',
      'Floor level spot check',
      'Detailed photo documentation',
      'Written recommendations',
      'Compliance with NZS 4306:2005',
      'Pricing for properties under 100m²',
      'We coordinate booking for you',
    ],
    
    availability: 'available',
    
    icon: '🏗️',
    color: 'orange',
    isPopular: false,
    displayOrder: 8,
  },
  
  methTesting: {
    id: 'meth_testing',
    name: 'Methamphetamine Testing',
    category: 'structural',
    description: 'Professional meth contamination screening',
    detailedDescription: 'Laboratory-tested meth contamination screening to ensure the property is safe. Essential for rental properties and peace of mind. Results provided within 2 working days.',
    provider: providers.redLbp,
    
    basePriceCents: 27500, // $275 from Red LBP
    ourPriceCents: 35750, // $357.50 with 30% markup (was $279)
    savingsCents: 4250, // vs $400 elsewhere
    
    estimatedDays: 2, // Results within 2 working days
    fastTrackAvailable: false,
    
    includes: [
      'Professional sample collection',
      'Laboratory analysis (NZS8510 & NIOSH 9111)',
      'Pass/fail certification',
      'Detailed contamination report',
      'Compliance with NZ standards',
      'Results within 2 working days',
      'We coordinate testing for you',
    ],
    
    availability: 'available',
    
    icon: '🧪',
    color: 'red',
    isPopular: false,
    displayOrder: 9,
  },
};

// Report Bundles
export const reportBundles: Record<string, ReportBundle> = {
  buyerEssentials: {
    id: 'buyer_essentials',
    name: 'Buyer Essentials Bundle',
    description: 'Everything you need for due diligence',
    badge: 'Most Popular',
    reportIds: ['title_search', 'lim_auckland', 'rental_data'],
    
    regularPriceCents: 44400, // $444 sum
    bundlePriceCents: 39900, // $399 bundle price
    savingsCents: 4500, // $45 savings
    
    availability: 'coming_soon',
    
    icon: '📦',
    color: 'blue',
    isPopular: false,
    displayOrder: 1,
  },
  
  completePackage: {
    id: 'complete_package',
    name: 'Complete Property Package',
    description: 'All reports for total confidence',
    badge: 'Best Value',
    reportIds: ['title_search', 'lim_auckland', 'building_inspection', 'rental_data', 'meth_testing'],
    
    regularPriceCents: 173800, // $1,738 sum (updated with new pricing)
    bundlePriceCents: 156420, // $1,564.20 bundle price (10% discount)
    savingsCents: 17380, // $173.80 savings
    
    availability: 'coming_soon',
    
    icon: '🎁',
    color: 'purple',
    isPopular: false,
    displayOrder: 2,
  },
  
  investorPro: {
    id: 'investor_pro',
    name: 'Investor Pro Package',
    description: 'Financial analysis for investors',
    badge: 'For Investors',
    reportIds: ['title_search', 'rental_data', 'lim_auckland'],
    
    regularPriceCents: 44400, // $444 sum
    bundlePriceCents: 37900, // $379 bundle price
    savingsCents: 6500, // $65 savings
    
    availability: 'coming_soon',
    
    icon: '💼',
    color: 'green',
    isPopular: false,
    displayOrder: 3,
  },
};

// Helper function to get report by ID
export function getReportById(id: string): ReportType | undefined {
  return reportTypes[id];
}

// Helper function to get bundle by ID
export function getBundleById(id: string): ReportBundle | undefined {
  return reportBundles[id];
}

// Helper function to get LIM report for a specific city
export function getLIMForCity(city: string): ReportType | undefined {
  const cityLower = city.toLowerCase();
  
  if (cityLower.includes('auckland')) return reportTypes.limAuckland;
  if (cityLower.includes('wellington')) return reportTypes.limWellington;
  if (cityLower.includes('christchurch')) return reportTypes.limChristchurch;
  
  // Default to Auckland for now
  return reportTypes.limAuckland;
}

// Helper to calculate bundle savings
export function calculateBundleSavings(reportIds: string[]): {
  regularPrice: number;
  bundlePrice: number;
  savings: number;
} {
  const regularPrice = reportIds.reduce((sum, id) => {
    const report = getReportById(id);
    return sum + (report?.ourPriceCents || 0);
  }, 0);
  
  // Apply 10% bundle discount
  const bundlePrice = Math.floor(regularPrice * 0.9);
  const savings = regularPrice - bundlePrice;
  
  return { regularPrice, bundlePrice, savings };
}

// Format price in NZD
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Location-based Report Filtering
// Filter reports based on property location to prevent users from buying wrong regional services

export function getAvailableReportsForCity(city: string | null | undefined): ReportType[] {
  const allReports = Object.values(reportTypes);
  
  if (!city) {
    // If no city specified, show only non-location-specific reports
    // Filter out LIM and PIM reports (both require valid council/region)
    return allReports.filter(report => 
      !report.id.startsWith('lim_') && !report.id.startsWith('pim_')
    );
  }
  
  const regionConfig = getRegionByCity(city);
  const availableLimReportId = regionConfig?.limReportId;
  const hasValidCouncil = !!regionConfig; // Check if property is in a region with council
  
  // Filter reports based on region configuration
  return allReports.filter(report => {
    // LIM reports are location-specific - only show if region has a configured LIM report
    if (report.id.startsWith('lim_')) {
      return availableLimReportId && report.id === availableLimReportId;
    }
    
    // PIM reports require valid council - available for any property with a recognized council
    if (report.id.startsWith('pim_')) {
      return hasValidCouncil;
    }
    
    // All other reports are available everywhere
    return true;
  });
}

export function getAvailableBundlesForCity(city: string | null | undefined): ReportBundle[] {
  const allBundles = Object.values(reportBundles);
  
  if (!city) {
    return allBundles;
  }
  
  const availableReports = getAvailableReportsForCity(city);
  const availableReportIds = new Set(availableReports.map(r => r.id));
  
  // Only show bundles where ALL included reports are available for this city
  return allBundles.filter(bundle => {
    return bundle.reportIds.every(reportId => availableReportIds.has(reportId));
  });
}

// Helper to check if a specific report is available for a city
export function isReportAvailableForCity(reportId: string, city: string | null | undefined): boolean {
  if (!city) return false;
  
  const availableReports = getAvailableReportsForCity(city);
  return availableReports.some(r => r.id === reportId);
}

// Helper to get the appropriate LIM report for a city
export function getLimReportForCity(city: string | null | undefined): ReportType | null {
  if (!city) return null;
  
  const regionConfig = getRegionByCity(city);
  if (!regionConfig || !regionConfig.limReportId) {
    return null; // No LIM report available for this region
  }
  
  return reportTypes[regionConfig.limReportId] || null;
}

// Helper to check if a city has a LIM report available
export function hasLimReportForCity(city: string | null | undefined): boolean {
  return getLimReportForCity(city) !== null;
}

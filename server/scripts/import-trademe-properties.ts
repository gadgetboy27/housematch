/**
 * Trade Me Property Import Script
 * 
 * Legally imports properties from Trade Me API to seed the database.
 * 
 * Usage:
 *   npm run import-trademe [limit] [region]
 * 
 * Examples:
 *   npm run import-trademe           # Import 10 properties from Auckland
 *   npm run import-trademe 50        # Import 50 properties from Auckland
 *   npm run import-trademe 20 2      # Import 20 properties from Wellington (region 2)
 * 
 * Region IDs:
 *   1 = Auckland
 *   2 = Wellington
 *   3 = Canterbury (Christchurch)
 *   4 = Waikato (Hamilton)
 *   5 = Bay of Plenty (Tauranga)
 */

import { db } from '../db';
import { properties, users } from '@shared/schema';
import { tradeMeService, TradeMeProperty } from '../trademe-service';
import { eq } from 'drizzle-orm';

// Map Trade Me property type to our schema
function mapPropertyType(tradeMeCategory: string): string {
  const categoryLower = tradeMeCategory.toLowerCase();
  
  if (categoryLower.includes('residential')) return 'residential';
  if (categoryLower.includes('rental')) return 'rental';
  if (categoryLower.includes('commercial')) return 'commercial';
  if (categoryLower.includes('lease')) return 'lease';
  
  return 'residential'; // Default
}

// Extract bedrooms from attributes
function extractBedrooms(property: TradeMeProperty): number | null {
  const bedroomAttr = property.Attributes?.find(
    attr => attr.Name === 'Bedrooms' || attr.DisplayName.toLowerCase().includes('bedroom')
  );
  
  if (bedroomAttr?.Value) {
    const num = parseInt(bedroomAttr.Value);
    return !isNaN(num) ? num : null;
  }
  
  return null;
}

// Extract bathrooms from attributes
function extractBathrooms(property: TradeMeProperty): number | null {
  const bathroomAttr = property.Attributes?.find(
    attr => attr.Name === 'Bathrooms' || attr.DisplayName.toLowerCase().includes('bathroom')
  );
  
  if (bathroomAttr?.Value) {
    const num = parseInt(bathroomAttr.Value);
    return !isNaN(num) ? num : null;
  }
  
  return null;
}

// Extract floor area from attributes
function extractFloorArea(property: TradeMeProperty): number | null {
  const floorAreaAttr = property.Attributes?.find(
    attr => attr.Name === 'FloorArea' || attr.DisplayName.toLowerCase().includes('floor')
  );
  
  if (floorAreaAttr?.Value) {
    const num = parseInt(floorAreaAttr.Value);
    return !isNaN(num) ? num : null;
  }
  
  return null;
}

// Extract land area from attributes
function extractLandArea(property: TradeMeProperty): number | null {
  const landAreaAttr = property.Attributes?.find(
    attr => attr.Name === 'LandArea' || attr.DisplayName.toLowerCase().includes('land')
  );
  
  if (landAreaAttr?.Value) {
    const num = parseInt(landAreaAttr.Value);
    return !isNaN(num) ? num : null;
  }
  
  return null;
}

// Extract car spaces from attributes
function extractCarSpaces(property: TradeMeProperty): number | null {
  const parkingAttr = property.Attributes?.find(
    attr => attr.Name === 'Parking' || attr.DisplayName.toLowerCase().includes('parking') || attr.DisplayName.toLowerCase().includes('garage')
  );
  
  if (parkingAttr?.Value) {
    const num = parseInt(parkingAttr.Value);
    return !isNaN(num) ? num : null;
  }
  
  return null;
}

// Format price display
function formatPrice(property: TradeMeProperty): string {
  if (property.PriceDisplay) {
    return property.PriceDisplay;
  }
  
  if (property.BuyNowPrice > 0) {
    return `$${property.BuyNowPrice.toLocaleString('en-NZ')}`;
  }
  
  if (property.StartPrice > 0) {
    return `From $${property.StartPrice.toLocaleString('en-NZ')}`;
  }
  
  return 'Price on application';
}

// Generate a generic address from Trade Me data
function generateAddress(property: TradeMeProperty): string {
  const parts = [];
  
  if (property.Suburb) parts.push(property.Suburb);
  if (property.Region) parts.push(property.Region);
  
  if (parts.length === 0) {
    return `Property ${property.ListingId}`;
  }
  
  return parts.join(', ');
}

// Map Trade Me property to our schema
function mapTradeMeToProperty(property: TradeMeProperty, systemUserId: string) {
  const address = generateAddress(property);
  
  return {
    userId: systemUserId,
    title: property.Title || `Property in ${property.Suburb}`,
    address: address,
    suburb: property.Suburb || 'Unknown',
    city: property.Region || 'New Zealand',
    price: formatPrice(property),
    bedrooms: extractBedrooms(property),
    bathrooms: extractBathrooms(property),
    floorArea: extractFloorArea(property),
    landArea: extractLandArea(property),
    carSpaces: extractCarSpaces(property),
    propertyType: mapPropertyType(property.Category),
    lotNumber: `TM-${property.ListingId}`, // Use Trade Me listing ID as lot number
    certificateOfTitle: `TRADEME-${property.ListingId}`, // Placeholder - would need real title data
    imageUrl: property.PictureHref || null,
    additionalImages: [], // Trade Me API would need additional call to get all images
    description: property.Subtitle || `Property listed on Trade Me. Listing ID: ${property.ListingId}`,
    views: 0,
    likes: 0,
    saves: 0,
    // Add Trade Me specific metadata
    externalListingId: property.ListingId.toString(),
    externalSource: 'trademe',
    publishStatus: 'published' as const,
  };
}

async function getOrCreateSystemUser(): Promise<string> {
  const systemEmail = 'system@housematch.co.nz';
  
  // Check if system user exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, systemEmail))
    .limit(1);
  
  if (existingUser.length > 0) {
    console.log('✅ Using existing system user:', existingUser[0].id);
    return existingUser[0].id;
  }
  
  // Create system user
  const [newUser] = await db
    .insert(users)
    .values({
      email: systemEmail,
      password: 'SYSTEM_ACCOUNT', // Won't be used for login
      name: 'Trade Me Imports',
      subscriptionTier: 'premium', // Give premium to avoid limits
    })
    .returning();
  
  console.log('✅ Created system user:', newUser.id);
  return newUser.id;
}

async function importProperties(limit: number = 10, regionId: number = 1) {
  console.log('\n🚀 Trade Me Property Import Script');
  console.log('=====================================\n');
  
  try {
    // Step 1: Test API connection
    console.log('📡 Testing Trade Me API connection...');
    const testResult = await tradeMeService.testConnection();
    
    if (!testResult.success) {
      console.error('❌ API Connection Failed:', testResult.error);
      console.error('   Auth Status:', testResult.authStatus);
      console.log('\n💡 Make sure you have set:');
      console.log('   - TRADEME_CONSUMER_KEY');
      console.log('   - TRADEME_CONSUMER_SECRET');
      process.exit(1);
    }
    
    console.log('✅ API Connection successful!');
    console.log(`   Found ${testResult.totalCount} sample properties\n`);
    
    // Step 2: Get or create system user
    console.log('👤 Setting up system user...');
    const systemUserId = await getOrCreateSystemUser();
    
    // Step 3: Fetch properties from Trade Me
    console.log(`\n🏠 Fetching ${limit} properties from Trade Me (Region ${regionId})...`);
    const tradeMeProperties = await tradeMeService.searchResidential({
      region: regionId,
      rows: limit,
      photo_size: 'Large',
      sort_order: 'ExpiryDesc', // Newest first
    });
    
    if (!tradeMeProperties || tradeMeProperties.length === 0) {
      console.log('⚠️  No properties found. Try a different region or check API access.');
      process.exit(0);
    }
    
    console.log(`✅ Retrieved ${tradeMeProperties.length} properties\n`);
    
    // Step 4: Import properties
    console.log('💾 Importing properties to database...\n');
    let successCount = 0;
    let errorCount = 0;
    
    for (const tmProperty of tradeMeProperties) {
      try {
        // Check if already imported (by external listing ID)
        const existing = await db
          .select()
          .from(properties)
          .where(eq(properties.externalListingId, tmProperty.ListingId.toString()))
          .limit(1);
        
        if (existing.length > 0) {
          console.log(`⏭️  Skipped: "${tmProperty.Title}" (already imported)`);
          continue;
        }
        
        // Map and insert property
        const propertyData = mapTradeMeToProperty(tmProperty, systemUserId);
        
        await db.insert(properties).values(propertyData);
        
        successCount++;
        console.log(`✅ [${successCount}/${tradeMeProperties.length}] Imported: "${tmProperty.Title}"`);
        console.log(`   Location: ${tmProperty.Suburb}, ${tmProperty.Region}`);
        console.log(`   Price: ${formatPrice(tmProperty)}`);
        console.log(`   Bedrooms: ${extractBedrooms(tmProperty) || 'N/A'}, Bathrooms: ${extractBathrooms(tmProperty) || 'N/A'}\n`);
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to import: "${tmProperty.Title}"`);
        console.error(`   Error:`, error instanceof Error ? error.message : error);
        console.error('');
      }
    }
    
    // Step 5: Summary
    console.log('\n=====================================');
    console.log('📊 Import Summary');
    console.log('=====================================');
    console.log(`✅ Successfully imported: ${successCount} properties`);
    if (errorCount > 0) {
      console.log(`❌ Failed: ${errorCount} properties`);
    }
    console.log('\n🎉 Import complete!\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error during import:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const limit = args[0] ? parseInt(args[0]) : 10;
const regionId = args[1] ? parseInt(args[1]) : 1;

// Validate arguments
if (isNaN(limit) || limit < 1 || limit > 200) {
  console.error('❌ Invalid limit. Must be between 1 and 200');
  process.exit(1);
}

if (isNaN(regionId) || regionId < 1) {
  console.error('❌ Invalid region ID. Must be a positive number');
  process.exit(1);
}

// Run import
importProperties(limit, regionId)
  .then(() => {
    console.log('✅ Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

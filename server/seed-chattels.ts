import { db } from './db';
import { standardChattels } from '@shared/schema';

async function seedStandardChattels() {
  const chattelsData = [
    // Fixed Coverings
    { category: 'Fixed Coverings', description: 'Fixed floor coverings', typicallyIncluded: true, displayOrder: 1 },
    { category: 'Fixed Coverings', description: 'Blinds and curtains', typicallyIncluded: true, displayOrder: 2 },
    { category: 'Fixed Coverings', description: 'Light fittings', typicallyIncluded: true, displayOrder: 3 },
    
    // Kitchen Appliances
    { category: 'Kitchen Appliances', description: 'Stove', typicallyIncluded: true, displayOrder: 10 },
    { category: 'Kitchen Appliances', description: 'Oven', typicallyIncluded: true, displayOrder: 11 },
    { category: 'Kitchen Appliances', description: 'Rangehood', typicallyIncluded: true, displayOrder: 12 },
    { category: 'Kitchen Appliances', description: 'Dishwasher', typicallyIncluded: true, displayOrder: 13 },
    
    // Heating/Cooling
    { category: 'Heating/Cooling', description: 'Heat pump', typicallyIncluded: true, displayOrder: 20 },
    { category: 'Heating/Cooling', description: 'Fixed heaters', typicallyIncluded: true, displayOrder: 21 },
    { category: 'Heating/Cooling', description: 'Ceiling fans', typicallyIncluded: true, displayOrder: 22 },
    
    // Outdoor
    { category: 'Outdoor', description: 'Letterbox', typicallyIncluded: true, displayOrder: 30 },
    { category: 'Outdoor', description: 'Clothesline', typicallyIncluded: true, displayOrder: 31 },
    { category: 'Outdoor', description: 'Garden shed', typicallyIncluded: true, displayOrder: 32 },
    { category: 'Outdoor', description: 'Fixed BBQ', typicallyIncluded: true, displayOrder: 33 },
    
    // Security
    { category: 'Security', description: 'Alarm system', typicallyIncluded: true, displayOrder: 40 },
    { category: 'Security', description: 'Security cameras', typicallyIncluded: true, displayOrder: 41 },
    { category: 'Security', description: 'Gate remote controls', typicallyIncluded: true, displayOrder: 42 },
    
    // Typically Excluded
    { category: 'Excluded', description: 'Freestanding furniture', typicallyIncluded: false, displayOrder: 100 },
    { category: 'Excluded', description: 'Washing machine', typicallyIncluded: false, displayOrder: 101 },
    { category: 'Excluded', description: 'Dryer', typicallyIncluded: false, displayOrder: 102 },
    { category: 'Excluded', description: 'Fridge/Freezer', typicallyIncluded: false, displayOrder: 103 },
    { category: 'Excluded', description: 'Wall art and mirrors', typicallyIncluded: false, displayOrder: 104 },
  ];
  
  // Check if already seeded
  const existing = await db.select().from(standardChattels).limit(1);
  if (existing.length > 0) {
    console.log('✅ Standard chattels already seeded');
    return;
  }
  
  await db.insert(standardChattels).values(chattelsData);
  console.log(`✅ Seeded ${chattelsData.length} standard chattels`);
}

seedStandardChattels()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed error:', err);
    process.exit(1);
  });

// Subscription tier configuration for image limits and other features

export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    displayName: 'Free Member',
    maxPropertyImages: 3, // Up to 3 images per property
    maxTotalProperties: 5, // Maximum 5 properties
    features: [
      'Basic property listings',
      'Up to 3 images per property',
      'Limited to 5 properties',
      'Standard support'
    ]
  },
  premium: {
    name: 'Premium',
    displayName: 'Premium Member',
    maxPropertyImages: 20, // Up to 20 images per property
    maxTotalProperties: -1, // Unlimited properties
    features: [
      'Unlimited property listings',
      'Up to 20 images per property',
      '2 free title searches per month',
      'Priority AI recommendations',
      'Premium support',
      'No ads',
      'Early access to new features',
      'Advanced property insights'
    ]
  },
  enterprise: {
    name: 'Enterprise',
    displayName: 'Enterprise Member',
    maxPropertyImages: 50, // Up to 50 images per property
    maxTotalProperties: -1, // Unlimited properties
    features: [
      'Unlimited property listings',
      'Up to 50 images per property',
      '10 free title searches per month',
      'Priority AI recommendations',
      'Dedicated account manager',
      'No ads',
      'Early access to new features',
      'Advanced property insights',
      'Custom branding options'
    ]
  }
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

/**
 * Get the maximum number of images allowed for a subscription tier
 */
export function getMaxImagesForTier(tier: SubscriptionTier | string = 'free'): number {
  const normalizedTier = (tier || 'free') as SubscriptionTier;
  return SUBSCRIPTION_TIERS[normalizedTier]?.maxPropertyImages || SUBSCRIPTION_TIERS.free.maxPropertyImages;
}

/**
 * Get the maximum number of properties allowed for a subscription tier
 */
export function getMaxPropertiesForTier(tier: SubscriptionTier | string = 'free'): number {
  const normalizedTier = (tier || 'free') as SubscriptionTier;
  return SUBSCRIPTION_TIERS[normalizedTier]?.maxTotalProperties || SUBSCRIPTION_TIERS.free.maxTotalProperties;
}

/**
 * Check if a user can add more images to a property
 */
export function canAddMoreImages(currentImageCount: number, tier: SubscriptionTier | string = 'free'): boolean {
  const maxImages = getMaxImagesForTier(tier);
  return currentImageCount < maxImages;
}

/**
 * Check if a user can add more properties
 */
export function canAddMoreProperties(currentPropertyCount: number, tier: SubscriptionTier | string = 'free'): boolean {
  const maxProperties = getMaxPropertiesForTier(tier);
  if (maxProperties === -1) return true; // Unlimited
  return currentPropertyCount < maxProperties;
}

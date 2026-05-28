import { db } from '../db';
import { users, subscriptionPlans, aiUsageLogs } from '@shared/schema';
import { eq, sql, and, gte } from 'drizzle-orm';

/**
 * Update user's total AI spending and check if they qualify as high-value user
 */
export async function updateUserAISpending(userId: string) {
  try {
    // Calculate total AI spending for this user
    const logs = await db.query.aiUsageLogs.findMany({
      where: (logs, { eq }) => eq(logs.userId, userId),
    });

    const totalSpending = logs.reduce((sum, log) => {
      return sum + parseFloat(log.estimatedCost);
    }, 0);

    // High-value threshold: $2-3 (we'll use $2 as trigger)
    const isHighValue = totalSpending >= 2.0;

    // Update user record
    await db.update(users)
      .set({
        totalAiSpending: totalSpending.toFixed(4),
        isHighValueUser: isHighValue,
      })
      .where(eq(users.id, userId));

    console.log(`💰 User ${userId} AI spending: $${totalSpending.toFixed(2)} (high-value: ${isHighValue})`);

    return {
      totalSpending,
      isHighValue,
      shouldShowUpgrade: isHighValue && totalSpending < 3.0, // Show upgrade prompt between $2-3
    };
  } catch (error) {
    console.error('Failed to update user AI spending:', error);
    return null;
  }
}

/**
 * Get user's subscription status and benefits
 */
export async function getUserSubscriptionStatus(userId: string) {
  try {
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
    });

    if (!user) {
      return null;
    }

    const isPremium = user.subscriptionTier === 'premium' && user.subscriptionStatus === 'active';
    
    // Get plan details if premium
    let plan = null;
    if (isPremium) {
      plan = await db.query.subscriptionPlans.findFirst({
        where: (plans, { eq }) => eq(plans.id, 'premium'),
      });
    }

    return {
      isPremium,
      subscriptionTier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus,
      stripeSubscriptionId: user.stripeSubscriptionId,
      subscriptionStartDate: user.subscriptionStartDate,
      subscriptionEndDate: user.subscriptionEndDate,
      totalAiSpending: parseFloat(user.totalAiSpending || '0'),
      isHighValueUser: user.isHighValueUser,
      plan,
      benefits: isPremium ? {
        freeTitleSearches: plan?.titleSearchCredits || 2,
        aiPriority: plan?.aiPriority || true,
        premiumSupport: true,
      } : null,
    };
  } catch (error) {
    console.error('Failed to get user subscription status:', error);
    return null;
  }
}

/**
 * Check if user has premium access
 */
export async function hasPremiumAccess(userId: string): Promise<boolean> {
  try {
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
    });

    return user?.subscriptionTier === 'premium' && user?.subscriptionStatus === 'active';
  } catch (error) {
    console.error('Failed to check premium access:', error);
    return false;
  }
}

/**
 * Get user's remaining title search credits
 */
export async function getTitleSearchCredits(userId: string): Promise<number> {
  try {
    const status = await getUserSubscriptionStatus(userId);
    if (!status?.isPremium) {
      return 0;
    }

    // Count title searches this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usedThisMonth = await db.query.purchaseOrders.findMany({
      where: (orders, { and, eq, gte }) => and(
        eq(orders.userId, userId),
        eq(orders.reportType, 'title_search'),
        gte(orders.createdAt, startOfMonth)
      ),
    });

    const maxCredits = status.benefits?.freeTitleSearches || 2;
    const remaining = Math.max(0, maxCredits - usedThisMonth.length);

    return remaining;
  } catch (error) {
    console.error('Failed to get title search credits:', error);
    return 0;
  }
}

/**
 * Initialize subscription plans in database
 */
export async function initializeSubscriptionPlans() {
  try {
    const existingPlan = await db.query.subscriptionPlans.findFirst({
      where: (plans, { eq }) => eq(plans.id, 'premium'),
    });

    if (!existingPlan) {
      await db.insert(subscriptionPlans).values({
        id: 'premium',
        name: 'premium',
        displayName: 'HouseMatch Premium',
        price: 2900, // $29 NZD
        priceWithGst: 3335, // $33.35 with 15% GST
        currency: 'nzd',
        interval: 'month',
        features: [
          '2 Free Title Searches per month (worth $30)',
          'Priority AI recommendations',
          'Premium support',
          'No ads',
          'Early access to new features',
          'Advanced property insights',
        ],
        titleSearchCredits: 2,
        aiPriority: true,
        isActive: true,
        sortOrder: 1,
      });

      console.log('✅ Initialized Premium subscription plan ($29/month)');
    }
  } catch (error) {
    console.error('Failed to initialize subscription plans:', error);
  }
}

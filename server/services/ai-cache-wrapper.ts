import { CacheService } from './redis-cache';
import { db } from '../db';
import { aiUsageLogs } from '@shared/schema';

// GPT-3.5-turbo pricing (as of 2025)
const PRICING = {
  'gpt-3.5-turbo': {
    input: 0.0005 / 1000,  // $0.0005 per 1K tokens
    output: 0.0015 / 1000, // $0.0015 per 1K tokens
  },
  'gpt-4': {
    input: 0.03 / 1000,    // $0.03 per 1K tokens
    output: 0.06 / 1000,   // $0.06 per 1K tokens
  },
};

interface CacheStrategy {
  ttl: number; // Time to live in seconds
  requireMinSwipes?: number; // Minimum swipes before using AI
  useEveryN?: number; // Only use AI every N operations
}

const CACHE_STRATEGIES: Record<string, CacheStrategy> = {
  preferences: {
    ttl: 3600, // 1 hour - preferences don't change frequently
    requireMinSwipes: 5, // Need at least 5 swipes to analyze
  },
  recommendations: {
    ttl: 1800, // 30 minutes
    requireMinSwipes: 20, // Need meaningful data
    useEveryN: 10, // Only regenerate every 10 swipes
  },
  insights: {
    ttl: 86400, // 24 hours - market insights are static
  },
  search: {
    ttl: 3600, // 1 hour
  },
};

/**
 * Calculate cost based on token usage
 */
function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING['gpt-3.5-turbo'];
  return (promptTokens * pricing.input) + (completionTokens * pricing.output);
}

/**
 * Smart AI call wrapper with caching and usage tracking
 */
export async function smartAICall<T>(
  feature: string,
  cacheKey: string,
  generator: () => Promise<{ result: T; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }>,
  options: {
    userId?: string;
    model?: string;
    skipCache?: boolean;
  } = {}
): Promise<T> {
  const {
    userId = null,
    model = 'gpt-3.5-turbo',
    skipCache = false,
  } = options;

  const strategy = CACHE_STRATEGIES[feature] || CACHE_STRATEGIES.search;
  const startTime = Date.now();

  // Try cache first (unless explicitly skipped)
  if (!skipCache) {
    const cached = await CacheService.get<T>(cacheKey);
    if (cached) {
      console.log(`✅ Cache hit: ${feature} - ${cacheKey}`);
      
      // Log cache hit (no cost!)
      try {
        await db.insert(aiUsageLogs).values({
          userId,
          feature,
          model,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCost: '0',
          cacheHit: true,
          responseTimeMs: Date.now() - startTime,
        });
      } catch (error) {
        console.error('Failed to log cache hit:', error);
      }
      
      return cached;
    }
  }

  // Cache miss - call AI
  console.log(`💰 AI call: ${feature} - ${cacheKey} (${model})`);
  
  try {
    const { result, usage } = await generator();
    const responseTime = Date.now() - startTime;
    const cost = calculateCost(model, usage.prompt_tokens, usage.completion_tokens);

    // Log AI usage
    try {
      await db.insert(aiUsageLogs).values({
        userId,
        feature,
        model,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        estimatedCost: cost.toFixed(6),
        cacheHit: false,
        responseTimeMs: responseTime,
      });

      console.log(`📊 AI call logged: ${feature} - ${usage.total_tokens} tokens - $${cost.toFixed(6)}`);

      // Update user's total AI spending (async, don't wait)
      if (userId) {
        import('./subscription-service').then(({ updateUserAISpending }) => {
          updateUserAISpending(userId).catch(err => 
            console.error('Failed to update user AI spending:', err)
          );
        });
      }
    } catch (error) {
      console.error('Failed to log AI usage:', error);
    }

    // Cache the result
    const cached = await CacheService.set(cacheKey, result, strategy.ttl);
    if (cached) {
      console.log(`💾 Cached: ${feature} for ${strategy.ttl}s`);
    }

    return result;
  } catch (error) {
    console.error(`❌ AI call failed: ${feature}`, error);
    throw error;
  }
}

/**
 * Check if user qualifies for AI features
 */
export async function shouldUseAI(
  feature: string,
  swipeCount: number
): Promise<{ shouldUse: boolean; reason: string }> {
  const strategy = CACHE_STRATEGIES[feature];
  
  if (!strategy) {
    return { shouldUse: true, reason: 'No strategy defined' };
  }

  // Check minimum swipes requirement
  if (strategy.requireMinSwipes && swipeCount < strategy.requireMinSwipes) {
    return {
      shouldUse: false,
      reason: `Need ${strategy.requireMinSwipes} swipes, have ${swipeCount}`,
    };
  }

  // Check useEveryN requirement
  if (strategy.useEveryN && swipeCount % strategy.useEveryN !== 0) {
    return {
      shouldUse: false,
      reason: `Only use AI every ${strategy.useEveryN} swipes`,
    };
  }

  return { shouldUse: true, reason: 'Qualifies for AI' };
}

/**
 * Get AI cost statistics
 */
export async function getAICostStats(timeframe: 'today' | 'week' | 'month' = 'today') {
  try {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
    }

    const logs = await db.query.aiUsageLogs.findMany({
      where: (logs, { gte }) => gte(logs.createdAt, startDate),
    });

    const totalCost = logs.reduce((sum, log) => sum + parseFloat(log.estimatedCost), 0);
    const totalCalls = logs.length;
    const cacheHits = logs.filter(log => log.cacheHit).length;
    const cacheMissRate = totalCalls > 0 ? ((totalCalls - cacheHits) / totalCalls * 100) : 0;
    const totalTokens = logs.reduce((sum, log) => sum + log.totalTokens, 0);

    return {
      timeframe,
      totalCost: totalCost.toFixed(2),
      totalCalls,
      cacheHits,
      cacheMissRate: cacheMissRate.toFixed(1),
      totalTokens,
      averageCostPerCall: totalCalls > 0 ? (totalCost / totalCalls).toFixed(4) : '0',
      byFeature: logs.reduce((acc, log) => {
        if (!acc[log.feature]) {
          acc[log.feature] = { calls: 0, cost: 0, tokens: 0 };
        }
        acc[log.feature].calls++;
        acc[log.feature].cost += parseFloat(log.estimatedCost);
        acc[log.feature].tokens += log.totalTokens;
        return acc;
      }, {} as Record<string, { calls: number; cost: number; tokens: number }>),
    };
  } catch (error) {
    console.error('Failed to get AI cost stats:', error);
    return null;
  }
}

import Redis from 'ioredis';

// Redis client for caching AI responses
let redis: Redis | null = null;

/**
 * Redis is completely optional in all environments
 * - In production: Only initialize if REDIS_PASSWORD is provided for security
 * - In development: Only initialize if explicitly configured
 * - App runs without cache if Redis is unavailable
 */
const shouldInitializeRedis = () => {
  // In production, require REDIS_PASSWORD for security
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.REDIS_PASSWORD) {
      console.warn('⚠️  Redis disabled in production (REDIS_PASSWORD not set). App will run without cache.');
      console.warn('⚠️  To enable caching in production, set REDIS_PASSWORD environment variable.');
      return false;
    }
    return true;
  }
  
  // In development, only initialize if host is configured
  // This prevents unnecessary connection attempts when Redis isn't available
  if (process.env.REDIS_HOST || process.env.REDIS_PASSWORD) {
    return true;
  }
  
  console.log('ℹ️  Redis not configured - app will run without cache');
  return false;
};

// Only attempt to initialize Redis if configured
if (shouldInitializeRedis()) {
  try {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        if (times > 3) {
          console.log('❌ Redis connection failed after 3 attempts, running without cache');
          return null; // Stop retrying
        }
        return Math.min(times * 100, 3000); // Reconnect delay
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true, // Don't connect immediately to avoid blocking app startup
    });

    // Connect asynchronously without blocking app startup
    redis.connect().catch((err) => {
      console.log('⚠️  Redis connection failed (running without cache):', err.message);
      redis = null;
    });

    redis.on('connect', () => {
      console.log('✅ Redis connected - AI caching enabled');
    });

    redis.on('error', (err) => {
      console.log('⚠️  Redis error (running without cache):', err.message);
    });
  } catch (error) {
    console.log('⚠️  Redis initialization failed (running without cache):', error);
    redis = null;
  }
} else {
  redis = null;
}

export class CacheService {
  /**
   * Get cached value
   */
  static async get<T>(key: string): Promise<T | null> {
    if (!redis) return null;
    
    try {
      const cached = await redis.get(key);
      if (!cached) return null;
      
      return JSON.parse(cached) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached value with TTL (time to live in seconds)
   */
  static async set(key: string, value: any, ttl: number): Promise<boolean> {
    if (!redis) return false;
    
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete cached value
   */
  static async delete(key: string): Promise<boolean> {
    if (!redis) return false;
    
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Clear all cache keys matching pattern
   */
  static async clearPattern(pattern: string): Promise<number> {
    if (!redis) return 0;
    
    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return 0;
      
      await redis.del(...keys);
      return keys.length;
    } catch (error) {
      console.error('Cache clear pattern error:', error);
      return 0;
    }
  }

  /**
   * Check if Redis is connected
   */
  static isConnected(): boolean {
    return redis !== null && redis.status === 'ready';
  }
}

export { redis };

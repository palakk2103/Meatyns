import { redisClient } from '../app/config/redis.js';

async function flushCache() {
  try {
    if (redisClient && redisClient.status === 'ready') {
      await redisClient.flushall();
      console.log('✓ Redis cache flushed successfully.');
    } else {
      console.log('Redis client not connected or memory cache in use.');
    }
  } catch (err) {
    console.log('Redis flush note:', err.message);
  }
  process.exit(0);
}

flushCache();

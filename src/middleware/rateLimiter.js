const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

// HTTP rate limiter
exports.httpLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:http:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// WebSocket message rate limiter
exports.wsMessageLimiter = async (userId) => {
  const key = `rl:ws:${userId}`;
  const limit = 50; // messages
  const window = 60; // seconds

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, window);
  }

  return current <= limit;
}; 
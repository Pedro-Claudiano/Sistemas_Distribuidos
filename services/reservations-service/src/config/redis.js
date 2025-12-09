const Redis = require('ioredis');

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379,
  maxRetriesPerRequest: null
});

redisClient.on('connect', () => {
  console.log(`[Redis] Connected to ${process.env.REDIS_HOST}`);
});

redisClient.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

module.exports = redisClient;

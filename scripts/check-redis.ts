/**
 * Script to check Redis connection and list all keys
 * Run with: bun scripts/check-redis.ts
 */

import { Redis } from '@upstash/redis';

async function checkRedis() {
  console.log('🔍 Checking Redis connection...\n');

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.error('❌ Missing Redis environment variables:');
    if (!url) console.error('   - UPSTASH_REDIS_REST_URL');
    if (!token) console.error('   - UPSTASH_REDIS_REST_TOKEN');
    process.exit(1);
  }

  console.log('✅ Environment variables found');
  console.log(`   URL: ${url.substring(0, 30)}...`);

  const redis = new Redis({ url, token });

  try {
    // Test connection with PING
    const pong = await redis.ping();
    console.log(`✅ Redis connection: ${pong}\n`);

    // Get all keys
    const keys = await redis.keys('*');
    console.log(`📦 Total keys: ${keys.length}\n`);

    if (keys.length === 0) {
      console.log('   (No keys found - cache is empty)');
      return;
    }

    // Group keys by prefix
    const grouped: Record<string, string[]> = {};
    for (const key of keys) {
      const prefix = key.split(':')[0];
      if (!grouped[prefix]) grouped[prefix] = [];
      grouped[prefix].push(key);
    }

    // Display grouped keys
    console.log('📋 Keys by category:');
    console.log('─'.repeat(50));

    for (const [prefix, prefixKeys] of Object.entries(grouped).sort()) {
      console.log(`\n🏷️  ${prefix} (${prefixKeys.length} keys)`);
      for (const key of prefixKeys.slice(0, 10)) {
        // Get TTL for each key
        const ttl = await redis.ttl(key);
        const ttlStr = ttl === -1 ? 'no expiry' : ttl === -2 ? 'expired' : `${ttl}s`;
        console.log(`   • ${key} [TTL: ${ttlStr}]`);
      }
      if (prefixKeys.length > 10) {
        console.log(`   ... and ${prefixKeys.length - 10} more`);
      }
    }

    // Get memory info if available
    console.log('\n' + '─'.repeat(50));
    console.log('📊 Summary:');
    console.log(`   Total keys: ${keys.length}`);
    console.log(`   Categories: ${Object.keys(grouped).join(', ')}`);

  } catch (error) {
    console.error('❌ Redis error:', error);
    process.exit(1);
  }
}

checkRedis();

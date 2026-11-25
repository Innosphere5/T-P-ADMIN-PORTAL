/**
 * Redis & In-Memory Multi-Tier Cache Verification Suite
 * =====================================================
 * Tests:
 * 1. Cache-Aside getOrSet: Verifies cache miss calls fetcher, cache hit serves from memory.
 * 2. Stampede Protection: Verifies concurrent calls to same key trigger fetcher strictly once.
 * 3. Invalidation: Verifies invalidate() purges cached entries.
 * 4. Pattern Invalidation: Verifies wildcard pattern deletion.
 * 5. Integration: Verifies getUserByRollNo and getUserById cache resolution.
 */

import { CacheService } from '../src/lib/cacheService.js';
import { getUserByRollNo, getUserById, getStudentDossier } from '../src/lib/db.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('🧪 Starting Redis & In-Memory Multi-Tier Cache Tests...\n');

  // Test 1: Cache Miss followed by Cache Hit
  console.log('Test 1: Cache-Aside (Miss -> Hit Lifecycle)');
  let fetchCount = 0;
  const mockFetcher = async () => {
    fetchCount++;
    return { roll: '26BCA001', name: 'Simran Test', cgpa: 9.1 };
  };

  const testKey = `test:student:${Date.now()}`;
  const res1 = await CacheService.getOrSet(testKey, mockFetcher, 60);
  assert(res1.name === 'Simran Test', 'Initial fetch returned expected student record');
  assert(fetchCount === 1, 'Initial call executed primary fetcher (Cache Miss)');

  const res2 = await CacheService.getOrSet(testKey, mockFetcher, 60);
  assert(res2.name === 'Simran Test', 'Second call returned matching cached student record');
  assert(fetchCount === 1, 'Second call served instantly from cache without calling fetcher (Cache Hit)');

  // Test 2: Single-Flight Stampede Guard
  console.log('\nTest 2: Single-Flight Stampede Guard (Concurrent In-Flight Mutex)');
  let heavyDbCount = 0;
  const stampedeFetcher = async () => {
    heavyDbCount++;
    await new Promise((r) => setTimeout(r, 40)); // Simulate 40ms network round-trip
    return { data: 'heavy_payload', timestamp: Date.now() };
  };

  const stampedeKey = `test:stampede:${Date.now()}`;
  // Fire 15 concurrent requests for the exact same uncached key
  const results = await Promise.all(
    Array.from({ length: 15 }, () => CacheService.getOrSet(stampedeKey, stampedeFetcher, 60))
  );

  assert(results.length === 15, 'All 15 concurrent requests resolved successfully');
  assert(
    results.every((r) => r.data === 'heavy_payload'),
    'All concurrent requests received identical payload'
  );
  assert(
    heavyDbCount === 1,
    `Primary fetcher executed strictly ONCE (${heavyDbCount} times) across 15 parallel requests`
  );

  // Test 3: Cache Invalidation
  console.log('\nTest 3: Targeted Key Invalidation');
  await CacheService.invalidate(testKey);
  const res3 = await CacheService.getOrSet(testKey, mockFetcher, 60);
  assert(fetchCount === 2, 'Fetcher was invoked again after explicit key invalidation');

  // Test 4: Pattern Invalidation
  console.log('\nTest 4: Wildcard Pattern Invalidation');
  await CacheService.set('group:a:1', { id: 1 }, 60);
  await CacheService.set('group:a:2', { id: 2 }, 60);
  await CacheService.invalidatePattern('group:a:*');
  const val1 = await CacheService.get('group:a:1');
  const val2 = await CacheService.get('group:a:2');
  assert(val1 === null && val2 === null, 'All keys matching pattern successfully purged');

  // Test 5: Integration with getUserByRollNo
  console.log('\nTest 5: Integration with getUserByRollNo & getUserById');
  const user = await getUserByRollNo('26BSCCS005');
  assert(user !== null, 'Seeded student found via cached getUserByRollNo');
  assert(user?.name === 'Shahzeb', 'Retrieved student name matches seeded record');

  const userById = await getUserById('bcb3d144-730c-458d-8223-aa6fd72f774b');
  assert(userById !== null && userById.roll_no === '26BSCCS005', 'Student found via cached getUserById');

  // Test 6: Health Reporter
  console.log('\nTest 6: Cache Engine Health Telemetry');
  const health = CacheService.getHealth();
  assert(typeof health.connected === 'boolean', 'Health reports Redis connection boolean');
  assert(typeof health.mode === 'string', `Active operating mode: ${health.mode}`);

  console.log('\n========================================');
  console.log(`🏁 Cache Suite: ${passed} Passed, ${failed} Failed`);
  console.log('========================================');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

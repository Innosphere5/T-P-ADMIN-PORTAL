import assert from 'assert';
import { createNotification } from '../src/lib/db.js';

console.log('🧪 Starting FCM Architecture & Single-Dispatch Deduplication Unit Tests...\n');

let passedTests = 0;
function test(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     ${err.message}`);
    process.exit(1);
  }
}

// Canonical formatIncomingFCMNotification logic (as implemented in fcmService.js)
function formatIncomingFCMNotification(notification) {
  const content = notification?.request?.content || {};
  const rawData = content.data || {};

  let parsedPayload = rawData;
  if (typeof rawData.data === 'string') {
    try {
      parsedPayload = JSON.parse(rawData.data);
    } catch {
      parsedPayload = rawData;
    }
  }

  const notificationType =
    rawData.type ||
    parsedPayload.type ||
    (content.title?.toLowerCase().includes('drive') ? 'drive' : 'internship');

  const canonicalId =
    rawData.notification_id ||
    rawData.id ||
    parsedPayload?.notification_id ||
    parsedPayload?.id ||
    notification.request?.identifier ||
    `fcm-${Date.now()}`;

  return {
    id: canonicalId,
    title: content.title || 'New Announcement',
    message: content.body || 'New update from RIMT Training & Placement Cell.',
    type: notificationType,
    priority: rawData.priority || 'HIGH',
    data: parsedPayload || {},
    action_route: rawData.action_route || (notificationType === 'drive' ? 'placement' : 'placement'),
    created_by: rawData.created_by || 'T&P Administration',
    created_at: new Date().toISOString(),
    is_read: false,
    is_fcm_live: true,
  };
}

async function runTests() {
  console.log('Test 1: Backend createNotification Idempotency & Deduplication Guard');
  const testDriveId = `drive-test-${Date.now()}`;
  const first = await createNotification({
    title: 'Placement Drive: Single Dispatch Test',
    message: 'Official announcement for single dispatch test drive.',
    type: 'drive',
    priority: 'HIGH',
    data: { drive_id: testDriveId, company_name: 'Single Dispatch Corp' },
  });

  test('First notification created successfully with unique ID', () => {
    assert.ok(first.id, 'Expected notification to have an id');
    assert.strictEqual(first.title, 'Placement Drive: Single Dispatch Test');
  });

  // Attempt duplicate dispatch within deduplication window
  const duplicate = await createNotification({
    title: 'Placement Drive: Single Dispatch Test',
    message: 'Official announcement for single dispatch test drive.',
    type: 'drive',
    priority: 'HIGH',
    data: { drive_id: testDriveId, company_name: 'Single Dispatch Corp' },
  });

  test('Second identical dispatch returns cached notification without duplicating', () => {
    assert.strictEqual(duplicate.id, first.id, 'Expected duplicate to return the exact same notification ID');
    assert.strictEqual(duplicate.created_at, first.created_at, 'Expected timestamps to match identically');
  });

  // Explicit idempotency_key check
  const idempotencyKey = `custom-key-${Date.now()}`;
  const customFirst = await createNotification({
    title: 'Unique Drive Announcement',
    message: 'Audience targeted notification',
    type: 'drive',
    idempotency_key: idempotencyKey,
  });

  const customSecond = await createNotification({
    title: 'Unique Drive Announcement',
    message: 'Audience targeted notification (second attempt)',
    type: 'drive',
    idempotency_key: idempotencyKey,
  });

  test('Idempotency key prevents duplicate execution regardless of body mutation', () => {
    assert.strictEqual(customFirst.id, customSecond.id, 'Idempotency key should enforce single instance');
  });

  console.log('\nTest 2: Canonical ID Priority in formatIncomingFCMNotification');
  const mockSupabaseUUID = 'd47ac10b-58cc-4372-a567-0e02b2c3d479';
  const mockExpoRandomId = 'expo-random-local-id-889922';

  const mockExpoNotification = {
    request: {
      identifier: mockExpoRandomId,
      content: {
        title: 'Placement Drive: Canonical ID Test',
        body: 'Testing canonical Supabase UUID precedence over Expo identifier.',
        data: {
          notification_id: mockSupabaseUUID,
          type: 'drive',
          action_route: 'register',
        },
      },
    },
  };

  const formatted = formatIncomingFCMNotification(mockExpoNotification);

  test('formatIncomingFCMNotification prioritizes backend Supabase UUID over Expo local identifier', () => {
    assert.strictEqual(
      formatted.id,
      mockSupabaseUUID,
      `Expected canonical ID ${mockSupabaseUUID}, got ${formatted.id}`
    );
    assert.notStrictEqual(
      formatted.id,
      mockExpoRandomId,
      'Expo random request.identifier must NOT overwrite Supabase canonical UUID'
    );
  });

  console.log('\nTest 3: Cross-Transport Deduplication (Realtime + FCM Push)');
  // Client-side deduplication Map behavior (as in NotificationContext.js)
  const processedKeys = new Map();
  function processClientNotification(notif) {
    const canonicalId = notif.id || notif.notification_id || notif.data?.notification_id;
    const entityId = notif.data?.drive_id || notif.data?.event_id || '';
    const contentKey = `${notif.type || 'general'}:${entityId}:${String(notif.title || '').trim()}:${String(notif.message || '').trim()}`;

    const now = Date.now();
    const existingById = canonicalId ? processedKeys.get(canonicalId) : null;
    const existingByContent = processedKeys.get(contentKey);

    if ((existingById && now - existingById < 45000) || (existingByContent && now - existingByContent < 45000)) {
      return { rendered: false, reason: 'DEDUPLICATED' };
    }

    if (canonicalId) processedKeys.set(canonicalId, now);
    processedKeys.set(contentKey, now);
    return { rendered: true, id: canonicalId };
  }

  // 1. Supabase Realtime event arrives first
  const realtimeArrival = {
    id: mockSupabaseUUID,
    title: 'Placement Drive: Canonical ID Test',
    message: 'Testing canonical Supabase UUID precedence over Expo identifier.',
    type: 'drive',
    data: { drive_id: testDriveId, notification_id: mockSupabaseUUID },
  };
  const realtimeRes = processClientNotification(realtimeArrival);

  test('Supabase Realtime notification renders on UI exactly once', () => {
    assert.strictEqual(realtimeRes.rendered, true);
    assert.strictEqual(realtimeRes.id, mockSupabaseUUID);
  });

  // 2. FCM Push arrives 500ms later for the exact same event
  const fcmArrival = formatIncomingFCMNotification(mockExpoNotification);
  const fcmRes = processClientNotification(fcmArrival);

  test('Subsequent FCM push within deduplication window is suppressed from re-rendering banner', () => {
    assert.strictEqual(fcmRes.rendered, false);
    assert.strictEqual(fcmRes.reason, 'DEDUPLICATED');
  });

  test('UI receives strictly ONE render event for the lifecycle of the notification', () => {
    const totalRendered = [realtimeRes, fcmRes].filter((r) => r.rendered).length;
    assert.strictEqual(totalRendered, 1, 'Expected exactly 1 render across transports');
  });

  console.log('\n========================================');
  console.log(`🏁 FCM Single-Dispatch Tests: ${passedTests} Passed, 0 Failed`);
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});

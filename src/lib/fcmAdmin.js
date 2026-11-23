import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

let cachedAccessToken = null;
let tokenExpiry = 0;

/**
 * Load Firebase Service Account credentials
 */
function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } catch {
      // fallback to file
    }
  }

  const filePath = path.join(process.cwd(), 'firebase-service-account.json');
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      console.warn('[FCM Admin] Failed to parse firebase-service-account.json:', e.message);
    }
  }

  return null;
}

/**
 * Generate Google OAuth 2.0 Access Token using Service Account RS256 signature
 */
async function getGoogleAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);

  // Return cached token if valid for at least 5 more minutes
  if (cachedAccessToken && tokenExpiry > now + 300) {
    return cachedAccessToken;
  }

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const claimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64Payload = Buffer.from(JSON.stringify(claimSet)).toString('base64url');
  const signatureInput = `${b64Header}.${b64Payload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  const signature = signer.sign(serviceAccount.private_key, 'base64url');

  const assertionJwt = `${signatureInput}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: assertionJwt,
    }).toString(),
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    throw new Error(`Failed to fetch Google OAuth token: ${tokenRes.status} ${errorText}`);
  }

  const tokenData = await tokenRes.json();
  cachedAccessToken = tokenData.access_token;
  tokenExpiry = now + (tokenData.expires_in || 3600);

  return cachedAccessToken;
}

/**
 * Dispatch real-time FCM Push Notification to topic or target registration token
 * Uses Firebase Cloud Messaging HTTP v1 API
 */
export async function sendFCMPushNotification({
  title,
  message,
  type = 'drive',
  priority = 'HIGH',
  data = {},
  targetToken = null,
  topic = 'all_students',
}) {
  const serviceAccount = getServiceAccount();
  if (!serviceAccount) {
    console.warn('[FCM Admin] Service account credentials not found; skipping FCM dispatch.');
    return { success: false, reason: 'SERVICE_ACCOUNT_MISSING' };
  }

  try {
    const accessToken = await getGoogleAccessToken(serviceAccount);
    const projectId = serviceAccount.project_id || 'rimt-4acfc';

    // Construct FCM v1 payload
    const messagePayload = {
      notification: {
        title,
        body: message,
      },
      data: {
        type: String(type || 'internship'),
        priority: String(priority || 'HIGH'),
        action_route: String(data?.action_route || 'placement'),
        ...Object.keys(data || {}).reduce((acc, key) => {
          acc[key] = typeof data[key] === 'object' ? JSON.stringify(data[key]) : String(data[key]);
          return acc;
        }, {}),
      },
      android: {
        priority: 'high',
        notification: {
          channel_id: type === 'drive' ? 'rimt_urgent_drives' : 'rimt_official_alerts',
          sound: 'default',
          color: '#1A365D',
          notification_priority: 'PRIORITY_MAX',
          default_sound: true,
          default_vibrate_timings: true,
        },
      },
    };

    if (targetToken) {
      messagePayload.token = targetToken;
    } else {
      messagePayload.topic = topic;
    }

    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: messagePayload }),
    });

    const resBody = await res.json();
    if (!res.ok) {
      console.warn('[FCM Admin] FCM HTTP v1 dispatch failed:', resBody);
      return { success: false, error: resBody };
    }

    console.log('[FCM Admin] ✅ FCM Notification broadcasted successfully:', resBody.name);
    return { success: true, messageId: resBody.name };
  } catch (err) {
    console.error('[FCM Admin] Exception sending FCM push notification:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Subscribe a native FCM device token to a topic for broadcast delivery.
 * Uses Firebase Instance ID / FCM topic management HTTP API.
 * @param {string} token - Native FCM registration token
 * @param {string} topic - Topic name (e.g. 'all_students')
 * @returns {Promise<{ success: boolean }>}
 */
export async function subscribeTokenToTopic(token, topic = 'all_students') {
  if (!token || token.startsWith('ExponentPushToken')) {
    // Expo push tokens can't be subscribed to FCM topics
    return { success: false, reason: 'EXPO_TOKEN_NOT_SUPPORTED' };
  }

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) {
    return { success: false, reason: 'SERVICE_ACCOUNT_MISSING' };
  }

  try {
    const accessToken = await getGoogleAccessToken(serviceAccount);

    const res = await fetch(`https://iid.googleapis.com/iid/v1/${token}/rel/topics/${topic}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'access_token_auth': 'true',
      },
    });

    if (res.ok || res.status === 200) {
      console.log(`[FCM Admin] ✅ Token subscribed to topic '${topic}' successfully`);
      return { success: true };
    }

    const errBody = await res.text().catch(() => '');
    console.warn(`[FCM Admin] Topic subscription failed (${res.status}):`, errBody);
    return { success: false, error: errBody };
  } catch (err) {
    console.warn('[FCM Admin] Topic subscription error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send FCM push notifications to all active tokens stored in Supabase fcm_tokens table.
 * This is a fallback mechanism when topic-based delivery needs to be supplemented
 * with direct token targeting (e.g., for Expo push tokens that don't support topics).
 *
 * @param {Object} params - Same params as sendFCMPushNotification (title, message, type, etc.)
 * @returns {Promise<{ success: boolean, sent: number, failed: number }>}
 */
export async function sendFCMToAllStoredTokens({ title, message, type = 'drive', priority = 'HIGH', data = {} }) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { success: false, sent: 0, failed: 0, reason: 'SUPABASE_NOT_CONFIGURED' };
  }

  try {
    // Fetch all active FCM tokens
    const tokensRes = await fetch(
      `${SUPABASE_URL}/rest/v1/fcm_tokens?is_active=eq.true&token_type=eq.fcm&select=token`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (!tokensRes.ok) {
      return { success: false, sent: 0, failed: 0, reason: 'TOKEN_FETCH_FAILED' };
    }

    const tokens = await tokensRes.json();
    if (!Array.isArray(tokens) || tokens.length === 0) {
      return { success: true, sent: 0, failed: 0, reason: 'NO_ACTIVE_TOKENS' };
    }

    let sent = 0;
    let failed = 0;

    // Send to each token individually (batched in groups of 5 for rate limiting)
    const uniqueTokens = [...new Set(tokens.map((t) => t.token).filter(Boolean))];

    for (const token of uniqueTokens) {
      try {
        const result = await sendFCMPushNotification({
          title,
          message,
          type,
          priority,
          data,
          targetToken: token,
          topic: null,
        });
        if (result.success) sent++;
        else failed++;
      } catch {
        failed++;
      }
    }

    console.log(`[FCM Admin] 📊 Batch delivery: ${sent} sent, ${failed} failed out of ${uniqueTokens.length} tokens`);
    return { success: true, sent, failed };
  } catch (err) {
    console.error('[FCM Admin] sendFCMToAllStoredTokens error:', err.message);
    return { success: false, sent: 0, failed: 0, error: err.message };
  }
}

/**
 * redis.js — Singleton High-Performance Redis Client over TCP (RESP)
 * Supports TLS (rediss://) with Server Name Indication (SNI) for Upstash & Cloud Redis.
 * Uses runtime server-only loading so browser/edge bundlers never traverse Node built-ins (dns, net, tls).
 */

const REDIS_URL = process.env.REDIS_URL || 'rediss://default:********@cuddly-possum-217024.upstash.io:6379';

function loadIoRedis() {
  if (typeof window !== 'undefined') return null;
  try {
    // Use eval('require') so Turbopack/Webpack does not statically bundle Node-only net/dns/tls into client graphs
    const runtimeRequire = eval('require');
    return runtimeRequire('ioredis');
  } catch {
    return null;
  }
}

class RedisManager {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.initClient();
  }

  initClient() {
    const isTest = process.env.NODE_ENV === 'test'
      || process.argv?.some((arg) => arg.includes('test'))
      || Boolean(process.env.VITEST)
      || Boolean(process.env.JEST_WORKER_ID);

    if (typeof window !== 'undefined' || !REDIS_URL || (isTest && !process.env.REDIS_TEST_ENABLED)) {
      return;
    }

    const Redis = loadIoRedis();
    if (!Redis) return;

    try {
      const options = {
        maxRetriesPerRequest: 1,
        connectTimeout: 6000,
        lazyConnect: true,
        enableAutoPipelining: true,
        retryStrategy: (times) => {
          if (times > 10) {
            return 10000;
          }
          return Math.min(times * 200, 3000);
        },
      };

      // Configure TLS if rediss:// protocol is detected
      if (REDIS_URL.startsWith('rediss://')) {
        try {
          const parsed = new URL(REDIS_URL);
          options.tls = {
            servername: parsed.hostname,
            rejectUnauthorized: false,
          };
        } catch {
          options.tls = { rejectUnauthorized: false };
        }
      }

      this.client = new Redis(REDIS_URL, options);

      this.client.on('connect', () => {
        console.log('⚡ [Redis TCP] Connected to remote cache database');
      });

      this.client.on('ready', () => {
        this.isReady = true;
        console.log('✅ [Redis TCP] Cache DB ready for sub-millisecond queries');
      });

      this.client.on('error', (err) => {
        this.isReady = false;
        if (process.env.NODE_ENV !== 'production') {
          console.warn('⚠️ [Redis TCP] Connection warning:', err.message);
        }
      });

      this.client.on('close', () => {
        this.isReady = false;
      });

      this.client.connect().catch((err) => {
        this.isReady = false;
        console.warn('ℹ️ [Redis TCP] Initial connection deferred or credentials need verification:', err.message);
      });
    } catch (err) {
      console.warn('⚠️ [Redis TCP] Failed to initialize client:', err.message);
      this.client = null;
      this.isReady = false;
    }
  }

  getClient() {
    return this.client;
  }

  isConnected() {
    return this.isReady && this.client && this.client.status === 'ready';
  }
}

if (!globalThis.__RIMT_REDIS_MANAGER) {
  globalThis.__RIMT_REDIS_MANAGER = new RedisManager();
}

export const redisManager = globalThis.__RIMT_REDIS_MANAGER;
export const redis = redisManager.getClient();
export default redis;

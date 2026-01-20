import { getDatabase } from '../db/init.js';

let cacheReady = false;

/**
 * Check if cache is ready
 */
export function isCacheReady() {
  return cacheReady;
}

/**
 * Initialize cache - call after database is initialized
 */
export function initializeCache() {
  try {
    getDatabase();
    cacheReady = true;
    console.log('[Cache] Cache service ready');
  } catch (error) {
    console.error('[Cache] Failed to initialize:', error.message);
    cacheReady = false;
  }
}

/**
 * Get cached value
 * @param {string} key - Cache key
 * @returns {any|null} Cached value or null
 */
export function getCached(key) {
  if (!cacheReady) return null;

  try {
    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);

    const row = db.prepare(
      'SELECT value FROM cache WHERE key = ? AND expires_at > ?'
    ).get(key, now);

    if (row) {
      try {
        return JSON.parse(row.value);
      } catch {
        return row.value;
      }
    }
  } catch (error) {
    console.error('[Cache] Get error:', error.message);
  }
  return null;
}

/**
 * Set cache value
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds
 */
export function setCache(key, value, ttl) {
  if (!cacheReady) return;

  try {
    const db = getDatabase();
    const expiresAt = Math.floor(Date.now() / 1000) + ttl;
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);

    db.prepare(`
      INSERT OR REPLACE INTO cache (key, value, expires_at)
      VALUES (?, ?, ?)
    `).run(key, valueStr, expiresAt);
  } catch (error) {
    console.error('[Cache] Set error:', error.message);
  }
}

/**
 * Delete cached value
 * @param {string} key - Cache key
 */
export function deleteCache(key) {
  if (!cacheReady) return;

  try {
    const db = getDatabase();
    db.prepare('DELETE FROM cache WHERE key = ?').run(key);
  } catch (error) {
    console.error('[Cache] Delete error:', error.message);
  }
}

/**
 * Clear expired cache entries
 */
export function cleanupExpiredCache() {
  if (!cacheReady) return;

  try {
    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);
    const result = db.prepare('DELETE FROM cache WHERE expires_at < ?').run(now);
    if (result.changes > 0) {
      console.log(`[Cache] Cleaned up ${result.changes} expired entries`);
    }
  } catch (error) {
    console.error('[Cache] Cleanup error:', error.message);
  }
}

/**
 * Clear all cache
 */
export function clearAllCache() {
  if (!cacheReady) return;

  try {
    const db = getDatabase();
    db.prepare('DELETE FROM cache').run();
  } catch (error) {
    console.error('[Cache] Clear all error:', error.message);
  }
}

// Run cleanup every hour (only starts after cache is ready)
setInterval(() => {
  if (cacheReady) {
    cleanupExpiredCache();
  }
}, 60 * 60 * 1000);

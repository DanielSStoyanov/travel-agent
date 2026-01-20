import { getDatabase } from '../db/init.js';

/**
 * Get cached value
 * @param {string} key - Cache key
 * @returns {any|null} Cached value or null
 */
export function getCached(key) {
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
  return null;
}

/**
 * Set cache value
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds
 */
export function setCache(key, value, ttl) {
  const db = getDatabase();
  const expiresAt = Math.floor(Date.now() / 1000) + ttl;
  const valueStr = typeof value === 'string' ? value : JSON.stringify(value);

  db.prepare(`
    INSERT OR REPLACE INTO cache (key, value, expires_at)
    VALUES (?, ?, ?)
  `).run(key, valueStr, expiresAt);
}

/**
 * Delete cached value
 * @param {string} key - Cache key
 */
export function deleteCache(key) {
  const db = getDatabase();
  db.prepare('DELETE FROM cache WHERE key = ?').run(key);
}

/**
 * Clear expired cache entries
 */
export function cleanupExpiredCache() {
  const db = getDatabase();
  const now = Math.floor(Date.now() / 1000);
  const result = db.prepare('DELETE FROM cache WHERE expires_at < ?').run(now);
  console.log(`[Cache] Cleaned up ${result.changes} expired entries`);
}

/**
 * Clear all cache
 */
export function clearAllCache() {
  const db = getDatabase();
  db.prepare('DELETE FROM cache').run();
}

// Run cleanup every hour
setInterval(cleanupExpiredCache, 60 * 60 * 1000);

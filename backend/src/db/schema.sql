-- Cache table for API responses
CREATE TABLE IF NOT EXISTS cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Search history for learning preferences
CREATE TABLE IF NOT EXISTS search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  search_type TEXT NOT NULL,  -- 'flight', 'hotel', 'combined'
  query_params TEXT NOT NULL,
  results_count INTEGER,
  selected_option TEXT,       -- Which option user selected (for learning)
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- User preferences (for personalization)
CREATE TABLE IF NOT EXISTS preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Index for cache expiration cleanup
CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_search_history_date ON search_history(created_at);

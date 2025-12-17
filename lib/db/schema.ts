// SQL Schema for Regulatory Intelligence Engine
// This file contains the DDL for creating all database tables

export const SCHEMA_SQL = `
-- regulations table: Main table for storing Finnish chemical regulations
CREATE TABLE IF NOT EXISTS regulations (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  source_url TEXT NOT NULL,
  published_date TIMESTAMP NOT NULL,
  finlex_id TEXT UNIQUE NOT NULL,
  relevance_score INTEGER,
  relevance_reasoning TEXT,
  impact_level TEXT CHECK (impact_level IN ('high', 'medium', 'low', 'none')),
  full_analysis JSONB,
  analyzed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup by finlex_id
CREATE INDEX IF NOT EXISTS idx_regulations_finlex_id ON regulations(finlex_id);

-- Index for filtering by impact level
CREATE INDEX IF NOT EXISTS idx_regulations_impact_level ON regulations(impact_level);

-- Index for sorting by published date
CREATE INDEX IF NOT EXISTS idx_regulations_published_date ON regulations(published_date DESC);

-- action_items table: Stores compliance action items for each regulation
CREATE TABLE IF NOT EXISTS action_items (
  id SERIAL PRIMARY KEY,
  regulation_id INTEGER NOT NULL REFERENCES regulations(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  action_description TEXT NOT NULL,
  deadline TIMESTAMP,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup by regulation_id
CREATE INDEX IF NOT EXISTS idx_action_items_regulation_id ON action_items(regulation_id);

-- Index for filtering by priority
CREATE INDEX IF NOT EXISTS idx_action_items_priority ON action_items(priority);

-- gemini_cache table: Stores AI analysis responses to avoid duplicate API calls
CREATE TABLE IF NOT EXISTS gemini_cache (
  id SERIAL PRIMARY KEY,
  finlex_id TEXT NOT NULL,
  cache_type TEXT NOT NULL,
  response_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(finlex_id, cache_type)
);

-- Index for cache lookup
CREATE INDEX IF NOT EXISTS idx_gemini_cache_finlex_id ON gemini_cache(finlex_id);
`;

// Individual SQL statements for programmatic execution
export const CREATE_REGULATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS regulations (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  source_url TEXT NOT NULL,
  published_date TIMESTAMP NOT NULL,
  finlex_id TEXT UNIQUE NOT NULL,
  relevance_score INTEGER,
  relevance_reasoning TEXT,
  impact_level TEXT CHECK (impact_level IN ('high', 'medium', 'low', 'none')),
  full_analysis JSONB,
  analyzed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

export const CREATE_ACTION_ITEMS_TABLE = `
CREATE TABLE IF NOT EXISTS action_items (
  id SERIAL PRIMARY KEY,
  regulation_id INTEGER NOT NULL REFERENCES regulations(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  action_description TEXT NOT NULL,
  deadline TIMESTAMP,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

export const CREATE_GEMINI_CACHE_TABLE = `
CREATE TABLE IF NOT EXISTS gemini_cache (
  id SERIAL PRIMARY KEY,
  finlex_id TEXT NOT NULL,
  cache_type TEXT NOT NULL,
  response_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(finlex_id, cache_type)
)`;

// Indexes
export const CREATE_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_regulations_finlex_id ON regulations(finlex_id);
CREATE INDEX IF NOT EXISTS idx_regulations_impact_level ON regulations(impact_level);
CREATE INDEX IF NOT EXISTS idx_regulations_published_date ON regulations(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_action_items_regulation_id ON action_items(regulation_id);
CREATE INDEX IF NOT EXISTS idx_action_items_priority ON action_items(priority);
CREATE INDEX IF NOT EXISTS idx_gemini_cache_finlex_id ON gemini_cache(finlex_id);
`;

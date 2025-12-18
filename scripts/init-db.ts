import { sql } from '@vercel/postgres';

async function initializeDatabase() {
  console.log('🚀 Initializing database schema...');

  try {
    // Create regulations table
    await sql`
      CREATE TABLE IF NOT EXISTS regulations (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        source_url TEXT NOT NULL,
        published_date TIMESTAMP NOT NULL,
        finlex_id TEXT UNIQUE NOT NULL,
        relevance_score INTEGER,
        relevance_reasoning TEXT,
        impact_level TEXT,
        full_analysis JSONB,
        analyzed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('✅ regulations table created');

    // Create action_items table
    await sql`
      CREATE TABLE IF NOT EXISTS action_items (
        id SERIAL PRIMARY KEY,
        regulation_id INTEGER NOT NULL REFERENCES regulations(id),
        department TEXT NOT NULL,
        action_description TEXT NOT NULL,
        deadline TIMESTAMP,
        priority TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('✅ action_items table created');

    // Create gemini_cache table
    await sql`
      CREATE TABLE IF NOT EXISTS gemini_cache (
        id SERIAL PRIMARY KEY,
        finlex_id TEXT NOT NULL,
        cache_type TEXT NOT NULL,
        response_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(finlex_id, cache_type)
      );
    `;
    console.log('✅ gemini_cache table created');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_regulations_finlex_id ON regulations(finlex_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_regulations_impact_level ON regulations(impact_level);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_action_items_regulation_id ON action_items(regulation_id);`;
    console.log('✅ Indexes created');

    console.log('✅ Database initialization complete!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabase();

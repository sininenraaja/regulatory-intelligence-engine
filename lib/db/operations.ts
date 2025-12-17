import { sql } from '@vercel/postgres';
import {
  Regulation,
  ActionItem,
  FullAnalysis,
  RegulationWithAnalysis,
} from '@/types';

/**
 * Initialize database tables
 * Creates all necessary tables if they don't exist
 */
export async function initializeDatabase() {
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
        impact_level TEXT CHECK (impact_level IN ('high', 'medium', 'low', 'none')),
        full_analysis JSONB,
        analyzed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create action_items table
    await sql`
      CREATE TABLE IF NOT EXISTS action_items (
        id SERIAL PRIMARY KEY,
        regulation_id INTEGER NOT NULL REFERENCES regulations(id) ON DELETE CASCADE,
        department TEXT NOT NULL,
        action_description TEXT NOT NULL,
        deadline TIMESTAMP,
        priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create gemini_cache table
    await sql`
      CREATE TABLE IF NOT EXISTS gemini_cache (
        id SERIAL PRIMARY KEY,
        finlex_id TEXT NOT NULL,
        cache_type TEXT NOT NULL,
        response_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(finlex_id, cache_type)
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_regulations_finlex_id ON regulations(finlex_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_regulations_impact_level ON regulations(impact_level)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_regulations_published_date ON regulations(published_date DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_action_items_regulation_id ON action_items(regulation_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_action_items_priority ON action_items(priority)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_gemini_cache_finlex_id ON gemini_cache(finlex_id)`;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Insert or update a regulation (upsert by finlex_id)
 */
export async function insertRegulation(data: {
  title: string;
  description: string;
  source_url: string;
  published_date: string;
  finlex_id: string;
  relevance_score?: number;
  relevance_reasoning?: string;
  impact_level?: 'high' | 'medium' | 'low' | 'none';
  full_analysis?: object;
  analyzed_at?: string;
}): Promise<Regulation> {
  const result = await sql`
    INSERT INTO regulations (
      title,
      description,
      source_url,
      published_date,
      finlex_id,
      relevance_score,
      relevance_reasoning,
      impact_level,
      full_analysis,
      analyzed_at
    ) VALUES (
      ${data.title},
      ${data.description},
      ${data.source_url},
      ${data.published_date},
      ${data.finlex_id},
      ${data.relevance_score ?? null},
      ${data.relevance_reasoning ?? null},
      ${data.impact_level ?? null},
      ${data.full_analysis ? JSON.stringify(data.full_analysis) : null},
      ${data.analyzed_at ?? null}
    )
    ON CONFLICT (finlex_id) DO UPDATE SET
      title = ${data.title},
      description = ${data.description},
      relevance_score = COALESCE(${data.relevance_score}, relevance_score),
      relevance_reasoning = COALESCE(${data.relevance_reasoning}, relevance_reasoning),
      impact_level = COALESCE(${data.impact_level}, impact_level),
      full_analysis = COALESCE(${data.full_analysis ? JSON.stringify(data.full_analysis) : null}, full_analysis),
      analyzed_at = COALESCE(${data.analyzed_at}, analyzed_at),
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  const regulation = result.rows[0];
  return {
    ...regulation,
    full_analysis: regulation.full_analysis ? JSON.stringify(regulation.full_analysis) : null,
  } as Regulation;
}

/**
 * Get a regulation by ID with its action items
 */
export async function getRegulationById(id: number): Promise<RegulationWithAnalysis | null> {
  const result = await sql`
    SELECT r.*, COALESCE(json_agg(json_build_object(
      'id', a.id,
      'regulation_id', a.regulation_id,
      'department', a.department,
      'action_description', a.action_description,
      'deadline', a.deadline,
      'priority', a.priority,
      'status', a.status,
      'created_at', a.created_at
    )) FILTER (WHERE a.id IS NOT NULL), '[]') as action_items
    FROM regulations r
    LEFT JOIN action_items a ON r.id = a.regulation_id
    WHERE r.id = ${id}
    GROUP BY r.id
  `;

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  const parsed_analysis = row.full_analysis
    ? (JSON.parse(row.full_analysis) as FullAnalysis)
    : null;

  return {
    ...row,
    full_analysis: row.full_analysis ? JSON.stringify(row.full_analysis) : null,
    action_items: row.action_items || [],
    parsed_analysis,
  } as RegulationWithAnalysis;
}

/**
 * Get all regulations with optional filtering and pagination
 */
export async function getAllRegulations(options?: {
  impact_level?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sort?: 'newest' | 'impact' | 'relevance';
}): Promise<{ regulations: Regulation[]; total: number }> {
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;

  // Build WHERE clause conditions
  let whereConditions = '1=1';

  if (options?.impact_level && options.impact_level !== 'all') {
    whereConditions += ` AND impact_level = '${options.impact_level}'`;
  }

  if (options?.search) {
    const searchTerm = `%${options.search.replace(/'/g, "''")}%`;
    whereConditions += ` AND (title ILIKE '${searchTerm}' OR description ILIKE '${searchTerm}')`;
  }

  // Build sort clause
  let orderClause = 'ORDER BY published_date DESC';
  if (options?.sort === 'impact') {
    orderClause = `ORDER BY
      CASE impact_level
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
        ELSE 4
      END ASC,
      published_date DESC`;
  } else if (options?.sort === 'relevance') {
    orderClause = 'ORDER BY relevance_score DESC NULLS LAST, published_date DESC';
  }

  // Get total count
  const countResult = await sql.query(
    `SELECT COUNT(*) as count FROM regulations WHERE ${whereConditions}`
  );

  const total = (countResult.rows[0]?.count as number) || 0;

  // Get paginated results
  const result = await sql.query(
    `SELECT * FROM regulations WHERE ${whereConditions} ${orderClause} LIMIT ${limit} OFFSET ${offset}`
  );

  return {
    regulations: result.rows as Regulation[],
    total,
  };
}

/**
 * Update regulation with analysis results
 */
export async function updateRegulationAnalysis(
  id: number,
  analysis: {
    relevance_score: number;
    relevance_reasoning: string;
    impact_level?: 'high' | 'medium' | 'low';
    full_analysis?: FullAnalysis;
  }
): Promise<Regulation> {
  const result = await sql`
    UPDATE regulations
    SET
      relevance_score = ${analysis.relevance_score},
      relevance_reasoning = ${analysis.relevance_reasoning},
      impact_level = COALESCE(${analysis.impact_level}, impact_level),
      full_analysis = ${analysis.full_analysis ? JSON.stringify(analysis.full_analysis) : null},
      analyzed_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
    RETURNING *
  `;

  const regulation = result.rows[0];
  return {
    ...regulation,
    full_analysis: regulation.full_analysis ? JSON.stringify(regulation.full_analysis) : null,
  } as Regulation;
}

/**
 * Insert batch of action items for a regulation
 */
export async function insertActionItems(
  regulationId: number,
  items: Array<{
    department: string;
    action_description: string;
    deadline?: string;
    priority: 'high' | 'medium' | 'low';
  }>
): Promise<ActionItem[]> {
  if (items.length === 0) {
    return [];
  }

  // Delete existing action items for this regulation
  await sql`DELETE FROM action_items WHERE regulation_id = ${regulationId}`;

  // Insert new action items
  const results = [];
  for (const item of items) {
    const result = await sql`
      INSERT INTO action_items (
        regulation_id,
        department,
        action_description,
        deadline,
        priority,
        status
      ) VALUES (
        ${regulationId},
        ${item.department},
        ${item.action_description},
        ${item.deadline ?? null},
        ${item.priority},
        'pending'
      )
      RETURNING *
    `;
    results.push(result.rows[0] as ActionItem);
  }

  return results;
}

/**
 * Get cached Gemini analysis response
 */
export async function getCachedAnalysis(
  finlexId: string,
  type: 'relevance' | 'full_analysis'
): Promise<any | null> {
  const result = await sql`
    SELECT response_data FROM gemini_cache
    WHERE finlex_id = ${finlexId} AND cache_type = ${type}
  `;

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].response_data;
}

/**
 * Set cached Gemini analysis response
 */
export async function setCachedAnalysis(
  finlexId: string,
  type: 'relevance' | 'full_analysis',
  responseData: object
): Promise<void> {
  await sql`
    INSERT INTO gemini_cache (finlex_id, cache_type, response_data)
    VALUES (${finlexId}, ${type}, ${JSON.stringify(responseData)})
    ON CONFLICT (finlex_id, cache_type) DO UPDATE SET
      response_data = ${JSON.stringify(responseData)},
      created_at = CURRENT_TIMESTAMP
  `;
}

/**
 * Check if regulation exists by finlex_id
 */
export async function regulationExists(finlexId: string): Promise<boolean> {
  const result = await sql`
    SELECT 1 FROM regulations WHERE finlex_id = ${finlexId} LIMIT 1
  `;

  return result.rows.length > 0;
}

/**
 * Get regulation by finlex_id
 */
export async function getRegulationByFinlexId(finlexId: string): Promise<Regulation | null> {
  const result = await sql`
    SELECT * FROM regulations WHERE finlex_id = ${finlexId}
  `;

  if (result.rows.length === 0) {
    return null;
  }

  const regulation = result.rows[0];
  return {
    ...regulation,
    full_analysis: regulation.full_analysis ? JSON.stringify(regulation.full_analysis) : null,
  } as Regulation;
}

/**
 * Delete old regulations (for maintenance)
 */
export async function deleteOldRegulations(daysOld: number): Promise<number> {
  const result = await sql`
    DELETE FROM regulations
    WHERE created_at < NOW() - INTERVAL '${daysOld} days'
  `;

  return result.rowCount ?? 0;
}

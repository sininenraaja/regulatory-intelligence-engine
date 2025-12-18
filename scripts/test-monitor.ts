#!/usr/bin/env node

/**
 * Test Script: Phase 1 Monitoring Flow
 *
 * This script tests the complete Phase 1 monitoring pipeline:
 * 1. Fetch from Finlex RSS
 * 2. Parse and normalize regulations
 * 3. Check for duplicates in database
 * 4. Analyze relevance with Gemini
 * 5. Cache analysis results
 * 6. Store in database
 *
 * Usage:
 *   npm run test:monitor
 *   FINLEX_MOCK=true npm run test:monitor  (use mock data)
 */

import { createScopedLogger } from '../lib/logger';
import { initializeDatabase, regulationExists, insertRegulation, updateRegulationAnalysis, getCachedAnalysis } from '../lib/db/operations';
import { getFreshRegulations } from '../lib/parsers/finlex';
import { analyzeRelevance, analyzeFullImpact } from '../lib/ai/gemini';

const logger = createScopedLogger('test-monitor');

interface TestResult {
  name: string;
  passed: boolean;
  duration_ms: number;
  error?: string;
  details?: Record<string, any>;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  try {
    logger.info(`Starting test: ${name}`);
    await fn();
    const duration = Date.now() - startTime;
    results.push({ name, passed: true, duration_ms: duration });
    logger.info(`✓ Test passed: ${name}`, { duration_ms: duration });
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, duration_ms: duration, error: message });
    logger.error(`✗ Test failed: ${name}`, { duration_ms: duration }, error);
  }
}

async function runTests(): Promise<void> {
  logger.info('Starting Phase 1 monitoring flow tests');

  // Test 1: Database Initialization
  await test('Database initialization', async () => {
    await initializeDatabase();
    logger.info('Database tables created successfully');
  });

  // Test 2: Finlex RSS Fetching
  let regulations: Awaited<ReturnType<typeof getFreshRegulations>> = [];
  await test('Fetch regulations from Finlex RSS', async () => {
    regulations = await getFreshRegulations();
    if (regulations.length === 0) {
      throw new Error('No regulations fetched from Finlex');
    }
    logger.info('Successfully fetched regulations', {
      count: regulations.length,
      sample: regulations[0],
    });
  });

  if (regulations.length === 0) {
    logger.warn('No regulations found, skipping remaining tests');
    printResults();
    return;
  }

  // Test 3: Duplicate Detection
  await test('Check for duplicate regulations', async () => {
    const testReg = regulations[0];
    if (!testReg.finlex_id) {
      throw new Error('Regulation missing finlex_id');
    }

    const exists = await regulationExists(testReg.finlex_id);
    logger.info('Duplicate check completed', {
      finlex_id: testReg.finlex_id,
      exists,
    });
  });

  // Test 4: Insert Regulation
  let testRegId: number | null = null;
  await test('Insert regulation into database', async () => {
    const testReg = regulations[0];
    if (!testReg.finlex_id || !testReg.title || !testReg.source_url || !testReg.published_date) {
      throw new Error('Regulation missing required fields');
    }

    const inserted = await insertRegulation({
      title: testReg.title,
      description: testReg.description || '',
      source_url: testReg.source_url,
      published_date: testReg.published_date,
      finlex_id: testReg.finlex_id,
    });

    testRegId = inserted.id;
    logger.info('Regulation inserted successfully', {
      id: inserted.id,
      finlex_id: inserted.finlex_id,
    });
  });

  if (!testRegId) {
    logger.warn('Could not insert regulation, skipping AI analysis tests');
    printResults();
    return;
  }

  // Test 5: AI Analysis - Relevance Scoring
  await test('Analyze regulation relevance with Gemini', async () => {
    const testReg = regulations[0];
    if (!testReg.title) {
      throw new Error('Regulation missing title for analysis');
    }

    const relevanceResult = await analyzeRelevance({
      id: testRegId!,
      finlex_id: testReg.finlex_id!,
      title: testReg.title,
      description: testReg.description || '',
      source_url: testReg.source_url!,
      published_date: testReg.published_date!,
      relevance_score: null,
      relevance_reasoning: null,
      impact_level: null,
      full_analysis: null,
      analyzed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    logger.info('Relevance analysis completed', {
      score: relevanceResult.score,
      reasoning: relevanceResult.reasoning.substring(0, 100),
    });

    // Update database with results
    await updateRegulationAnalysis(testRegId!, {
      relevance_score: relevanceResult.score,
      relevance_reasoning: relevanceResult.reasoning,
    });

    logger.info('Relevance results saved to database');
  });

  // Test 6: Cache Verification
  await test('Verify caching of analysis results', async () => {
    const testReg = regulations[0];
    const cached = await getCachedAnalysis(testReg.finlex_id!, 'relevance');

    if (!cached) {
      throw new Error('Analysis not found in cache');
    }

    logger.info('Cache verification successful', {
      cached_type: 'relevance',
      cached_score: (cached as any).score,
    });
  });

  // Test 7: Full Impact Analysis (Optional - only if relevance score > threshold)
  await test('Perform full impact analysis for high-relevance regulations', async () => {
    const testReg = regulations[0];
    if (!testReg.finlex_id || !testReg.title) {
      throw new Error('Regulation missing required fields');
    }

    // Only analyze if relevance score is high
    const cached = await getCachedAnalysis(testReg.finlex_id, 'relevance');
    if (!cached || (cached as any).score < 40) {
      logger.info('Skipping full impact analysis (relevance score too low)', {
        score: (cached as any)?.score || 0,
      });
      return;
    }

    const fullAnalysis = await analyzeFullImpact(
      {
        id: testRegId!,
        finlex_id: testReg.finlex_id,
        title: testReg.title,
        description: testReg.description || '',
        source_url: testReg.source_url!,
        published_date: testReg.published_date!,
        relevance_score: (cached as any).score,
        relevance_reasoning: (cached as any).reasoning,
        impact_level: null,
        full_analysis: null,
        analyzed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      (cached as any).score
    );

    logger.info('Full impact analysis completed', {
      impact_level: fullAnalysis.impact_level,
      action_items_count: fullAnalysis.action_items.length,
    });

    // Update database with full analysis
    await updateRegulationAnalysis(testRegId!, {
      relevance_score: (cached as any).score,
      relevance_reasoning: (cached as any).reasoning,
      impact_level: fullAnalysis.impact_level as 'high' | 'medium' | 'low',
      full_analysis: fullAnalysis,
    });

    logger.info('Full impact analysis saved to database');
  });

  printResults();
}

function printResults(): void {
  console.log('\n' + '='.repeat(80));
  console.log('TEST RESULTS');
  console.log('='.repeat(80));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  results.forEach((result) => {
    const status = result.passed ? '✓' : '✗';
    const color = result.passed ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(
      `${color}${status}${reset} ${result.name} (${result.duration_ms}ms)`
    );

    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
    if (result.details) {
      console.log(`  Details: ${JSON.stringify(result.details, null, 2)}`);
    }
  });

  console.log('='.repeat(80));
  console.log(
    `Results: ${passed} passed, ${failed} failed (${((passed / results.length) * 100).toFixed(1)}% success rate)`
  );
  console.log('='.repeat(80) + '\n');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  logger.error('Test suite failed with fatal error', {}, error);
  process.exit(1);
});

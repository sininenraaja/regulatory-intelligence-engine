import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, insertRegulation, updateRegulationAnalysis, insertActionItems, regulationExists } from '@/lib/db/operations';
import { analyzeRelevance, analyzeFullImpact } from '@/lib/ai/gemini';
import { getFreshRegulations } from '@/lib/parsers/finlex';

const CRON_SECRET = process.env.CRON_SECRET;
const RELEVANCE_THRESHOLD = 40;

/**
 * POST /api/monitor
 * Vercel Cron job handler for monitoring Finlex RSS feed
 * Called every 6 hours by Vercel
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      console.warn('Invalid cron secret provided');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Monitor] Starting Finlex RSS monitoring...');

    // Initialize database tables (idempotent - creates if don't exist)
    await initializeDatabase();
    console.log('[Monitor] Database initialized');

    // Fetch fresh regulations from Finlex
    const freshRegs = await getFreshRegulations();
    console.log(`[Monitor] Fetched ${freshRegs.length} regulations from Finlex`);

    if (freshRegs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new regulations found',
        stats: {
          processed: 0,
          new: 0,
          analyzed: 0,
          relevant: 0,
        },
      });
    }

    let processedCount = 0;
    let newCount = 0;
    let analyzedCount = 0;
    let relevantCount = 0;

    // Process each regulation
    for (const freshReg of freshRegs) {
      try {
        // Check if regulation already exists
        const exists = await regulationExists(freshReg.finlex_id!);

        if (exists) {
          console.log(`[Monitor] Regulation ${freshReg.finlex_id} already exists, skipping`);
          processedCount++;
          continue;
        }

        console.log(`[Monitor] Processing new regulation: ${freshReg.title}`);

        // Insert regulation into database
        const regulation = await insertRegulation({
          title: freshReg.title!,
          description: freshReg.description || '',
          source_url: freshReg.source_url!,
          published_date: freshReg.published_date!,
          finlex_id: freshReg.finlex_id!,
        });

        newCount++;
        processedCount++;

        // Analyze relevance
        console.log(`[Monitor] Analyzing relevance for ${regulation.finlex_id}`);
        const relevanceResult = await analyzeRelevance(regulation);

        // Update database with relevance score
        await updateRegulationAnalysis(regulation.id, {
          relevance_score: relevanceResult.score,
          relevance_reasoning: relevanceResult.reasoning,
        });

        analyzedCount++;

        // If relevant, perform full impact analysis
        if (relevanceResult.score > RELEVANCE_THRESHOLD) {
          console.log(`[Monitor] Regulation is relevant (score: ${relevanceResult.score}), performing full analysis`);

          const fullAnalysis = await analyzeFullImpact(regulation, relevanceResult.score);

          // Update database with full analysis
          await updateRegulationAnalysis(regulation.id, {
            relevance_score: relevanceResult.score,
            relevance_reasoning: relevanceResult.reasoning,
            impact_level: fullAnalysis.impact_level as 'high' | 'medium' | 'low',
            full_analysis: fullAnalysis,
          });

          // Insert action items
          if (fullAnalysis.action_items.length > 0) {
            await insertActionItems(regulation.id, fullAnalysis.action_items.map(item => ({
              department: item.department,
              action_description: item.action,
              deadline: item.deadline || undefined,
              priority: item.priority,
            })));
          }

          relevantCount++;
          console.log(`[Monitor] Full analysis complete for ${regulation.finlex_id}`);
        } else {
          console.log(`[Monitor] Regulation not relevant (score: ${relevanceResult.score}), skipping full analysis`);
        }
      } catch (itemError) {
        console.error(`[Monitor] Error processing regulation ${freshReg.title}:`, itemError);
        // Continue processing other regulations even if one fails
      }
    }

    console.log(`[Monitor] Monitoring complete. Processed: ${processedCount}, New: ${newCount}, Analyzed: ${analyzedCount}, Relevant: ${relevantCount}`);

    return NextResponse.json({
      success: true,
      message: 'Monitoring completed successfully',
      stats: {
        processed: processedCount,
        new: newCount,
        analyzed: analyzedCount,
        relevant: relevantCount,
      },
    });
  } catch (error) {
    console.error('[Monitor] Error during monitoring:', error);
    return NextResponse.json(
      {
        error: 'Monitoring failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/monitor
 * Test endpoint to manually trigger monitoring
 * Remove in production or add additional security
 */
export async function GET(request: NextRequest) {
  try {
    // Check if we can run tests (optional safety measure)
    const testSecret = request.nextUrl.searchParams.get('secret');

    if (testSecret !== 'test-local-only') {
      return NextResponse.json(
        { error: 'Test endpoint - use POST with proper cron secret in production' },
        { status: 400 }
      );
    }

    // For local testing, we can trigger a manual monitoring run
    const testRequest = new NextRequest(new URL('http://localhost:3000/api/monitor'), {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${CRON_SECRET}`,
      },
    });

    return POST(testRequest);
  } catch (error) {
    console.error('[Monitor] Test error:', error);
    return NextResponse.json(
      { error: 'Test failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

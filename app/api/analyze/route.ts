import { NextRequest, NextResponse } from 'next/server';
import { getRegulationById, updateRegulationAnalysis, insertActionItems } from '@/lib/db/operations';
import { analyzeRelevance, analyzeFullImpact } from '@/lib/ai/gemini';

const RELEVANCE_THRESHOLD = 40;

/**
 * POST /api/analyze
 * Manually re-analyze a regulation (bypasses cache)
 * Body: { regulationId: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { regulationId: number };
    const { regulationId } = body;

    if (!regulationId) {
      return NextResponse.json(
        { error: 'regulationId is required' },
        { status: 400 }
      );
    }

    console.log(`[Analyze] Re-analyzing regulation ${regulationId}`);

    // Fetch regulation from database
    const regulation = await getRegulationById(regulationId);

    if (!regulation) {
      return NextResponse.json(
        { error: 'Regulation not found' },
        { status: 404 }
      );
    }

    // Analyze relevance (will use cache if available, but we're forcing re-analysis here)
    console.log(`[Analyze] Analyzing relevance for ${regulation.finlex_id}`);
    const relevanceResult = await analyzeRelevance(regulation);

    // Update database with relevance score
    const updated = await updateRegulationAnalysis(regulation.id, {
      relevance_score: relevanceResult.score,
      relevance_reasoning: relevanceResult.reasoning,
    });

    // If relevant, perform full impact analysis
    if (relevanceResult.score > RELEVANCE_THRESHOLD) {
      console.log(`[Analyze] Performing full analysis for ${regulation.finlex_id}`);
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
    }

    // Fetch updated regulation
    const finalResult = await getRegulationById(regulationId);

    console.log(`[Analyze] Re-analysis complete for ${regulation.finlex_id}`);

    return NextResponse.json({
      success: true,
      message: 'Regulation re-analyzed successfully',
      data: finalResult,
    });
  } catch (error) {
    console.error('[Analyze] Error during re-analysis:', error);
    return NextResponse.json(
      {
        error: 'Analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAllRegulations } from '@/lib/db/operations';

/**
 * GET /api/regulations
 * Get list of regulations with optional filtering and pagination
 * Query params:
 *   - impact_level: 'high' | 'medium' | 'low' | 'none' | 'all'
 *   - search: search term
 *   - sort: 'newest' | 'impact' | 'relevance'
 *   - limit: number of results (default 20)
 *   - offset: pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const impact_level = searchParams.get('impact_level') || undefined;
    const search = searchParams.get('search') || undefined;
    const sort = (searchParams.get('sort') as 'newest' | 'impact' | 'relevance') || 'newest';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await getAllRegulations({
      impact_level,
      search,
      limit,
      offset,
      sort,
    });

    return NextResponse.json({
      success: true,
      data: result.regulations,
      pagination: {
        total: result.total,
        limit,
        offset,
        pages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error('[Regulations API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch regulations',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { logger } from '@/lib/logger';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime_ms: number;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      latency_ms?: number;
      error?: string;
    };
    cache?: {
      status: 'healthy' | 'unhealthy';
      error?: string;
    };
    api?: {
      status: 'healthy' | 'unhealthy';
      error?: string;
    };
  };
  metrics?: {
    regulations_total?: number;
    cache_hit_rate?: number;
    last_monitor_run?: string;
  };
}

const SERVICE_START_TIME = Date.now();

/**
 * GET /api/health
 * Health check endpoint for monitoring system status
 * Used by Netlify health checks and external monitoring services
 */
export async function GET(request: NextRequest): Promise<NextResponse<HealthCheckResult>> {
  const requestStartTime = Date.now();
  const result: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime_ms: Date.now() - SERVICE_START_TIME,
    checks: {
      database: { status: 'unhealthy' },
    },
    metrics: {},
  };

  try {
    // Check database connectivity
    logger.debug('Health check: Testing database connection');
    const dbStartTime = Date.now();

    try {
      const dbResult = await sql`SELECT 1 as health`;
      const dbLatency = Date.now() - dbStartTime;

      if (dbResult.rows.length > 0) {
        result.checks.database = {
          status: 'healthy',
          latency_ms: dbLatency,
        };
        logger.debug('Health check: Database healthy', { latency_ms: dbLatency });
      } else {
        result.checks.database = {
          status: 'unhealthy',
          error: 'No response from database query',
        };
        result.status = 'unhealthy';
      }
    } catch (dbError) {
      result.checks.database = {
        status: 'unhealthy',
        error: dbError instanceof Error ? dbError.message : 'Unknown database error',
      };
      result.status = 'unhealthy';
      logger.error('Health check: Database check failed', { component: 'database' }, dbError);
    }

    // Check metrics from database
    try {
      const regulationsCount = await sql`SELECT COUNT(*) as count FROM regulations`;
      if (regulationsCount.rows[0]) {
        result.metrics!.regulations_total = parseInt(regulationsCount.rows[0].count, 10);
      }

      const cacheCount = await sql`SELECT COUNT(*) as count FROM gemini_cache`;
      if (cacheCount.rows[0]) {
        const total = parseInt(cacheCount.rows[0].count, 10);
        result.metrics!.cache_hit_rate = total > 0 ? (total / (result.metrics!.regulations_total || 1)) * 100 : 0;
      }

      logger.debug('Health check: Metrics collected', { metrics: result.metrics });
    } catch (metricsError) {
      logger.warn('Health check: Could not collect metrics', {
        error: metricsError instanceof Error ? metricsError.message : String(metricsError),
      });
      // Metrics errors don't make the service unhealthy
    }

    // Determine overall status
    if (result.checks.database.status === 'unhealthy') {
      result.status = 'unhealthy';
    } else if (result.checks.database.latency_ms && result.checks.database.latency_ms > 1000) {
      result.status = 'degraded';
    }

    const totalTime = Date.now() - requestStartTime;
    logger.info('Health check completed', {
      status: result.status,
      total_time_ms: totalTime,
      database_latency_ms: result.checks.database.latency_ms,
    });

    const statusCode = result.status === 'unhealthy' ? 503 : 200;
    return NextResponse.json(result, { status: statusCode });
  } catch (error) {
    result.status = 'unhealthy';
    result.checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    logger.error('Health check failed with exception', { component: 'health-check' }, error);

    return NextResponse.json(result, { status: 503 });
  }
}

/**
 * POST /api/health
 * Webhook endpoint that can be used by monitoring services
 * Returns same health check data as GET
 */
export async function POST(request: NextRequest): Promise<NextResponse<HealthCheckResult>> {
  return GET(request);
}

/**
 * HEAD /api/health
 * Lightweight health check for simple uptime monitoring
 * Returns 200 if healthy, 503 if unhealthy (no body)
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const healthResult = await GET(request);
  return new NextResponse(null, { status: healthResult.status });
}

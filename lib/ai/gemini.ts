import { GoogleGenerativeAI } from '@google/generative-ai';
import { Regulation, FullAnalysis, GeminiRelevanceResponse } from '@/types';
import { relevancePrompt, impactAnalysisPrompt } from './prompts';
import {
  getCachedAnalysis,
  setCachedAnalysis,
} from '@/lib/db/operations';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('GEMINI_API_KEY environment variable is not set');
}

const client = new GoogleGenerativeAI(apiKey || '');
const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

/**
 * Retry logic with exponential backoff for handling rate limits
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1000;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a rate limit error
      const isRateLimit =
        (error as any)?.status === 429 ||
        (error as any)?.message?.includes('quota');

      if (attempt < maxRetries && isRateLimit) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        console.log(
          `Rate limited. Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`
        );
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      if (attempt === maxRetries) {
        break;
      }

      // Retry on other errors too
      if (attempt < maxRetries) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        console.log(
          `Error on attempt ${attempt + 1}. Retrying in ${delayMs}ms`
        );
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Failed after all retries');
}

/**
 * Analyze regulation relevance using Gemini
 * Returns relevance score (0-100) and reasoning
 */
export async function analyzeRelevance(
  regulation: Regulation
): Promise<GeminiRelevanceResponse> {
  try {
    // Check cache first
    const cached = await getCachedAnalysis(regulation.finlex_id, 'relevance');
    if (cached) {
      console.log(`Cache hit for relevance: ${regulation.finlex_id}`);
      return cached as GeminiRelevanceResponse;
    }

    const prompt = relevancePrompt(regulation);

    const response = await withRetry(async () => {
      const result = await model.generateContent(prompt);
      return result.response.text();
    });

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as GeminiRelevanceResponse;

    // Validate response
    if (
      typeof parsed.score !== 'number' ||
      parsed.score < 0 ||
      parsed.score > 100 ||
      typeof parsed.reasoning !== 'string'
    ) {
      throw new Error('Invalid response format');
    }

    // Cache the result
    await setCachedAnalysis(
      regulation.finlex_id,
      'relevance',
      parsed
    );

    return parsed;
  } catch (error) {
    console.error(
      `Failed to analyze relevance for ${regulation.finlex_id}:`,
      error
    );
    throw error;
  }
}

/**
 * Analyze full impact of a regulation using Gemini
 * Only call if relevance score > 40
 */
export async function analyzeFullImpact(
  regulation: Regulation,
  existingScore?: number
): Promise<FullAnalysis> {
  try {
    // Check cache first
    const cached = await getCachedAnalysis(regulation.finlex_id, 'full_analysis');
    if (cached) {
      console.log(`Cache hit for full analysis: ${regulation.finlex_id}`);
      return cached as FullAnalysis;
    }

    const prompt = impactAnalysisPrompt(regulation, existingScore);

    const response = await withRetry(async () => {
      const result = await model.generateContent(prompt);
      return result.response.text();
    });

    // Parse JSON response (handling potential markdown formatting)
    let jsonStr = response;
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      const plainJsonMatch = response.match(/\{[\s\S]*\}/);
      if (plainJsonMatch) {
        jsonStr = plainJsonMatch[0];
      }
    }

    const parsed = JSON.parse(jsonStr) as FullAnalysis;

    // Validate required fields
    const requiredFields = [
      'impact_level',
      'executive_summary',
      'key_changes',
      'affected_areas',
      'compliance_deadline',
      'action_items',
      'estimated_effort',
      'financial_impact',
      'risks_if_ignored',
    ];

    for (const field of requiredFields) {
      if (!(field in parsed)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Cache the result
    await setCachedAnalysis(
      regulation.finlex_id,
      'full_analysis',
      parsed
    );

    return parsed;
  } catch (error) {
    console.error(
      `Failed to analyze full impact for ${regulation.finlex_id}:`,
      error
    );
    throw error;
  }
}

/**
 * Test the Gemini API connection and functionality
 */
export async function testGeminiConnection(): Promise<boolean> {
  try {
    if (!apiKey) {
      console.error('GEMINI_API_KEY not set');
      return false;
    }

    const testPrompt =
      'Respond with: {"status": "ok", "message": "Gemini connection successful"}';
    const response = await model.generateContent(testPrompt);
    console.log('Gemini connection test passed');
    return true;
  } catch (error) {
    console.error('Gemini connection test failed:', error);
    return false;
  }
}

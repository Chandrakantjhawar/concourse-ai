// ──────────────────────────────────────────────────────────
// Concourse AI — Gemini Service
// Single wrapper: retries, JSON mode, injection guard,
// Zod validation, deterministic fallback
// ──────────────────────────────────────────────────────────

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { z } from 'zod';
import { config } from '../config.js';

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }
  return genAI;
}

/** Delay helper for exponential backoff */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Attempt to parse JSON from a string, handling markdown code fences.
 */
function extractJson(raw: string): unknown {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

/**
 * Check if an error is a rate limit (429) error.
 */
function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('429') || error.message.includes('Too Many Requests');
  }
  return false;
}

export interface GeminiCallOptions<T> {
  /** The fully assembled prompt string */
  prompt: string;
  /** Zod schema to validate the response */
  schema: z.ZodType<T>;
  /** Deterministic fallback function if AI fails */
  fallbackFn: () => T;
  /** Max retries (default: 1 — reduced to preserve quota) */
  maxRetries?: number;
}

/**
 * Core Gemini wrapper used by all 4 feature routers.
 *
 * 1. If USE_LOCAL_FALLBACK=true → skip Gemini, return fallback immediately
 * 2. Call Gemini with JSON mode, retry on failure (exponential backoff)
 * 3. On 429 rate limit → skip remaining retries, go straight to fallback
 * 4. Validate response with Zod schema
 * 5. If all retries fail or validation fails → return fallback
 */
export async function generateStructuredResponse<T>(
  options: GeminiCallOptions<T>,
): Promise<{ data: T; source: 'gemini' | 'fallback' }> {
  const { prompt, schema, fallbackFn, maxRetries = 1 } = options;

  // Short-circuit: use fallback if configured
  if (config.USE_LOCAL_FALLBACK) {
    return { data: fallbackFn(), source: 'fallback' };
  }

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 2s, 4s
        await delay(2000 * attempt);
      }

      const client = getClient();
      const model = client.getGenerativeModel({
        model: config.GEMINI_MODEL,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
          maxOutputTokens: 4096,
        },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // Parse and validate
      const parsed = extractJson(text);
      const validated = schema.parse(parsed);

      return { data: validated, source: 'gemini' };
    } catch (error) {
      lastError = error;
      console.error(
        `[Gemini] Attempt ${attempt + 1}/${maxRetries + 1} failed:`,
        error instanceof Error ? error.message : String(error),
      );

      // On rate limit, skip remaining retries to preserve quota
      if (isRateLimitError(error)) {
        console.warn('[Gemini] Rate limit hit — skipping remaining retries to preserve quota.');
        break;
      }
    }
  }

  // All retries exhausted — use fallback
  console.warn(
    '[Gemini] Using fallback. Last error:',
    lastError instanceof Error ? lastError.message : String(lastError),
  );

  return { data: fallbackFn(), source: 'fallback' };
}

/**
 * Quick health check — can we reach Gemini?
 * Uses a minimal prompt to avoid wasting quota.
 */
export async function checkGeminiHealth(): Promise<boolean> {
  if (config.USE_LOCAL_FALLBACK) {
    return false;
  }

  try {
    const client = getClient();
    const model = client.getGenerativeModel({
      model: config.GEMINI_MODEL,
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 32,
      },
    });
    const result = await model.generateContent('Reply with exactly: {"status":"ok"}');
    const text = result.response.text();
    return text.includes('ok');
  } catch {
    return false;
  }
}

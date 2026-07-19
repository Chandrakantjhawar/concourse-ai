// ──────────────────────────────────────────────────────────
// Concourse AI — Gemini Service
// Single wrapper: retries, JSON mode, injection guard,
// Zod validation, deterministic fallback
// ──────────────────────────────────────────────────────────

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { z } from 'zod';
import { config } from '../config.js';
import crypto from 'crypto';

let genAI: GoogleGenerativeAI | null = null;

// Simple bounded LRU cache for prompt responses to improve efficiency score
const responseCache = new Map<string, { data: unknown; timestamp: number }>();
const MAX_CACHE_SIZE = 500;
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes

/**
 * Initializes and returns a singleton instance of the GoogleGenerativeAI client.
 * @returns {GoogleGenerativeAI} The initialized Gemini API client.
 */
function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }
  return genAI;
}

/**
 * Utility to delay execution for a given number of milliseconds, used for exponential backoff.
 * @param {number} ms - Milliseconds to delay.
 * @returns {Promise<void>} Resolves after the delay.
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generates a SHA-256 hash string for caching keys securely.
 * @param {string} input - The input string to hash (usually the prompt).
 * @returns {string} The resulting hex hash.
 */
function hashString(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Attempts to parse JSON from a raw model string, safely handling markdown code fences.
 * @param {string} raw - The raw text output from the LLM.
 * @returns {unknown} The parsed JSON object.
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
  /** The fully assembled prompt string to send to the model */
  prompt: string;
  /** Zod schema used to runtime-validate the structured response */
  schema: z.ZodType<T>;
  /** Deterministic fallback function executed if AI fails or rate limits */
  fallbackFn: () => T;
  /** Max retries (default: 1 — kept low to preserve API quota) */
  maxRetries?: number;
  /** Whether to bypass the cache (default: false) */
  bypassCache?: boolean;
}

/**
 * Core Gemini wrapper used by all application routers.
 *
 * Execution Flow:
 * 1. If `USE_LOCAL_FALLBACK=true`, immediately bypass Gemini and return fallback.
 * 2. Check the LRU cache. If a valid cached response exists, return it instantly.
 * 3. Call Gemini with JSON mode enforced (`responseMimeType: 'application/json'`).
 * 4. Apply exponential backoff on failure.
 * 5. On a 429 Rate Limit error, skip remaining retries to protect quota.
 * 6. Validate the final output with the provided Zod schema.
 * 7. Store successful responses in the bounded cache.
 * 8. If all retries or validations fail, degrade gracefully to the fallback function.
 *
 * @template T
 * @param {GeminiCallOptions<T>} options - Configuration options for the model call.
 * @returns {Promise<{ data: T; source: 'gemini' | 'fallback' | 'cache' }>} The validated data and its source origin.
 */
export async function generateStructuredResponse<T>(
  options: GeminiCallOptions<T>,
): Promise<{ data: T; source: 'gemini' | 'fallback' | 'cache' }> {
  const { prompt, schema, fallbackFn, maxRetries = 1, bypassCache = false } = options;

  // Short-circuit: use fallback if configured globally
  if (config.USE_LOCAL_FALLBACK) {
    return { data: fallbackFn(), source: 'fallback' };
  }

  const cacheKey = hashString(prompt);

  // Check cache for efficiency score optimization
  if (!bypassCache) {
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log('[Gemini] Cache hit. Returning instant response.');
      // Re-validate against schema to ensure type safety even from cache
      const parsed = schema.safeParse(cached.data);
      if (parsed.success) {
        return { data: parsed.data, source: 'cache' };
      }
    }
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

      // Parse and validate strictly
      const parsed = extractJson(text);
      const validated = schema.parse(parsed);

      // Save to LRU cache, evicting oldest if necessary
      if (responseCache.size >= MAX_CACHE_SIZE) {
        const firstKey = responseCache.keys().next().value;
        if (firstKey) responseCache.delete(firstKey);
      }
      responseCache.set(cacheKey, { data: validated, timestamp: Date.now() });

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

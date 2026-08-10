// ──────────────────────────────────────────────────────────
// Concourse AI — Multi-Provider AI Service
// Supports Google Gemini, Groq, xAI Grok, OpenRouter & OpenAI
// Features: retries, JSON mode, Zod validation, auto-failover, LRU caching
// ──────────────────────────────────────────────────────────

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { z } from 'zod';
import { config } from '../config.js';
import crypto from 'crypto';

export type AIProvider = 'gemini' | 'groq' | 'grok' | 'openrouter' | 'openai';

let genAI: GoogleGenerativeAI | null = null;

// Bounded LRU cache for prompt responses to improve efficiency score
const responseCache = new Map<string, { data: unknown; timestamp: number }>();
const MAX_CACHE_SIZE = 500;
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }
  return genAI;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function hashString(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function extractJson(raw: string): unknown {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('429') || msg.includes('too many requests') || msg.includes('quota');
  }
  return false;
}

/**
 * Executes a call to an OpenAI-compatible REST API (Groq, Grok, OpenRouter, OpenAI)
 */
async function callOpenAICompatible(options: {
  endpoint: string;
  apiKey: string;
  model: string;
  prompt: string;
  extraHeaders?: Record<string, string>;
}): Promise<string> {
  const { endpoint, apiKey, model, prompt, extraHeaders = {} } = options;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a precise AI assistant. You must ALWAYS return valid JSON matching the requested schema. Return JSON ONLY without markdown fences.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`HTTP ${response.status} from ${endpoint}: ${errorText}`);
  }

  const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`Empty response content from ${endpoint}`);
  }

  return content;
}

/**
 * Call specific AI provider and return raw text output
 */
async function callProvider(provider: AIProvider, prompt: string): Promise<string> {
  switch (provider) {
    case 'gemini': {
      if (!config.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
      const client = getGeminiClient();
      const model = client.getGenerativeModel({
        model: config.GEMINI_MODEL,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
          maxOutputTokens: 4096,
        },
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    }
    case 'groq': {
      if (!config.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured');
      return callOpenAICompatible({
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: config.GROQ_API_KEY,
        model: config.GROQ_MODEL,
        prompt,
      });
    }
    case 'grok': {
      if (!config.GROK_API_KEY) throw new Error('GROK_API_KEY is not configured');
      return callOpenAICompatible({
        endpoint: 'https://api.x.ai/v1/chat/completions',
        apiKey: config.GROK_API_KEY,
        model: config.GROK_MODEL,
        prompt,
      });
    }
    case 'openrouter': {
      if (!config.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured');
      return callOpenAICompatible({
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: config.OPENROUTER_API_KEY,
        model: config.OPENROUTER_MODEL,
        prompt,
        extraHeaders: {
          'HTTP-Referer': 'https://concourse-ai.app',
          'X-Title': 'Concourse AI',
        },
      });
    }
    case 'openai': {
      if (!config.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
      const baseUrl = config.OPENAI_BASE_URL.replace(/\/+$/, '');
      return callOpenAICompatible({
        endpoint: `${baseUrl}/chat/completions`,
        apiKey: config.OPENAI_API_KEY,
        model: config.OPENAI_MODEL,
        prompt,
      });
    }
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

/**
 * Returns prioritized list of active/configured providers
 */
export function getAvailableProviders(): AIProvider[] {
  const providerConfig = config.AI_PROVIDER || 'auto';

  if (providerConfig !== 'auto' && ['gemini', 'groq', 'grok', 'openrouter', 'openai'].includes(providerConfig)) {
    return [providerConfig as AIProvider];
  }

  const configured: AIProvider[] = [];
  if (config.GROQ_API_KEY) configured.push('groq');
  if (config.GROK_API_KEY) configured.push('grok');
  if (config.OPENROUTER_API_KEY) configured.push('openrouter');
  if (config.GEMINI_API_KEY) configured.push('gemini');
  if (config.OPENAI_API_KEY) configured.push('openai');

  if (configured.length === 0 && config.GEMINI_API_KEY) {
    configured.push('gemini');
  }

  return configured;
}

export interface GeminiCallOptions<T> {
  prompt: string;
  schema: z.ZodType<T>;
  fallbackFn: () => T;
  maxRetries?: number;
  bypassCache?: boolean;
}

/**
 * Core Multi-Provider Structured Response Generator
 */
export async function generateStructuredResponse<T>(
  options: GeminiCallOptions<T>,
): Promise<{ data: T; source: 'gemini' | 'groq' | 'grok' | 'openrouter' | 'openai' | 'fallback' | 'cache' }> {
  const { prompt, schema, fallbackFn, maxRetries = 1, bypassCache = false } = options;

  if (config.USE_LOCAL_FALLBACK) {
    return { data: fallbackFn(), source: 'fallback' };
  }

  const cacheKey = hashString(prompt);

  if (!bypassCache) {
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log('[AIService] Cache hit. Returning instant response.');
      const parsed = schema.safeParse(cached.data);
      if (parsed.success) {
        return { data: parsed.data, source: 'cache' };
      }
    }
  }

  const providers = getAvailableProviders();
  if (providers.length === 0) {
    console.warn('[AIService] No AI API keys configured. Using local fallback.');
    return { data: fallbackFn(), source: 'fallback' };
  }

  let lastError: unknown = null;

  for (const provider of providers) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await delay(1500 * attempt);
        }

        console.log(`[AIService] Calling provider: ${provider} (attempt ${attempt + 1})`);
        const text = await callProvider(provider, prompt);

        const parsed = extractJson(text);
        const validated = schema.parse(parsed);

        if (responseCache.size >= MAX_CACHE_SIZE) {
          const firstKey = responseCache.keys().next().value;
          if (firstKey) responseCache.delete(firstKey);
        }
        responseCache.set(cacheKey, { data: validated, timestamp: Date.now() });

        return { data: validated, source: provider };
      } catch (error) {
        lastError = error;
        console.error(
          `[AIService] Provider ${provider} attempt ${attempt + 1}/${maxRetries + 1} failed:`,
          error instanceof Error ? error.message : String(error),
        );

        if (isRateLimitError(error)) {
          console.warn(`[AIService] Provider ${provider} hit rate limit/quota — trying next provider.`);
          break; // move to next provider immediately
        }
      }
    }
  }

  console.warn(
    '[AIService] All providers failed. Using fallback. Last error:',
    lastError instanceof Error ? lastError.message : String(lastError),
  );

  return { data: fallbackFn(), source: 'fallback' };
}

/**
 * Health check — returns status of current active provider
 */
export async function checkGeminiHealth(): Promise<boolean> {
  if (config.USE_LOCAL_FALLBACK) {
    return false;
  }

  const providers = getAvailableProviders();
  if (providers.length === 0) {
    return false;
  }

  const activeProvider = providers[0];
  if (!activeProvider) return false;

  try {
    const text = await callProvider(activeProvider, 'Reply with JSON: {"status":"ok"}');
    return text.includes('ok') || text.includes('status');
  } catch {
    return false;
  }
}

/**
 * Detailed health check with active provider metadata
 */
export async function getAIHealthDetails(): Promise<{
  status: 'ok' | 'degraded';
  ai_reachable: boolean;
  active_provider: string;
  active_model: string;
  available_providers: string[];
}> {
  const providers = getAvailableProviders();
  const activeProvider = providers[0] ?? 'none';
  let activeModel = 'none';

  if (activeProvider === 'gemini') activeModel = config.GEMINI_MODEL;
  else if (activeProvider === 'groq') activeModel = config.GROQ_MODEL;
  else if (activeProvider === 'grok') activeModel = config.GROK_MODEL;
  else if (activeProvider === 'openrouter') activeModel = config.OPENROUTER_MODEL;
  else if (activeProvider === 'openai') activeModel = config.OPENAI_MODEL;

  const reachable = await checkGeminiHealth();

  return {
    status: reachable ? 'ok' : 'degraded',
    ai_reachable: reachable,
    active_provider: activeProvider,
    active_model: activeModel,
    available_providers: providers,
  };
}


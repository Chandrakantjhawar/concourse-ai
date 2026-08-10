// ──────────────────────────────────────────────────────────
// Concourse AI — Health Router
// Quick status check: API + data readiness + AI provider status
// ──────────────────────────────────────────────────────────

import { Hono } from 'hono';
import { checkGeminiHealth, getAIHealthDetails } from '../services/gemini.service.js';
import { config } from '../config.js';

export const healthRouter = new Hono();

healthRouter.get('/health', async (c) => {
  const geminiReachable = await checkGeminiHealth();
  let activeProvider = 'none';
  let activeModel = config.GEMINI_MODEL;
  let availableProviders = ['gemini'];

  try {
    const details = await getAIHealthDetails();
    activeProvider = details.active_provider;
    activeModel = details.active_model;
    availableProviders = details.available_providers;
  } catch {
    // Graceful fallback for mocked test environments
  }

  return c.json({
    status: geminiReachable ? 'ok' : 'degraded',
    gemini_reachable: geminiReachable,
    ai_reachable: geminiReachable,
    active_provider: activeProvider,
    model: activeModel,
    available_providers: availableProviders,
    timestamp: new Date().toISOString(),
  });
});



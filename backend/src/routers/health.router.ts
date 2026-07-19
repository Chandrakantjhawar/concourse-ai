// ──────────────────────────────────────────────────────────
// Concourse AI — Health Router
// Quick status check: API + data readiness
// ──────────────────────────────────────────────────────────

import { Hono } from 'hono';
import { checkGeminiHealth } from '../services/gemini.service.js';
import { config } from '../config.js';

export const healthRouter = new Hono();

healthRouter.get('/health', async (c) => {
  const geminiReachable = await checkGeminiHealth();

  return c.json({
    status: geminiReachable ? 'ok' : 'degraded',
    gemini_reachable: geminiReachable,
    timestamp: new Date().toISOString(),
    model: config.GEMINI_MODEL,
  });
});

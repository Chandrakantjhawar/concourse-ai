// ──────────────────────────────────────────────────────────
// Concourse AI — Fan Concierge Router
// Multilingual Q&A grounded on stadium data
// ──────────────────────────────────────────────────────────

import { Hono } from 'hono';
import { ConciergeRequestSchema, ConciergeResponseSchema } from '../schemas/index.js';
import { generateStructuredResponse } from '../services/gemini.service.js';
import { getStadiums, getStadium, getZones } from '../services/data-loader.js';
import { buildConciergePrompt } from '../prompts/concierge.prompt.js';
import { conciergeFallback } from '../fallback/concierge.fallback.js';
import { sanitizeUserInput } from '../middleware/injection-guard.js';

export const conciergeRouter = new Hono();

// GET /api/stadiums — list all demo venues
conciergeRouter.get('/stadiums', (c) => {
  const stadiums = getStadiums();
  return c.json(stadiums);
});

// GET /api/stadiums/:id/zones — zones for a specific stadium
conciergeRouter.get('/stadiums/:id/zones', (c) => {
  const stadiumId = c.req.param('id');
  const stadium = getStadium(stadiumId);
  if (!stadium) {
    return c.json({ error: `Stadium '${stadiumId}' not found` }, 404);
  }
  const zones = getZones(stadiumId);
  return c.json({ stadium, zones });
});

// POST /api/concierge/chat — fan Q&A with Gemini
conciergeRouter.post('/concierge/chat', async (c) => {
  const body = await c.req.json();
  const parsed = ConciergeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid request', details: parsed.error.flatten() }, 400);
  }

  const { stadium_id, message, accessibility_mode, language_hint } = parsed.data;

  // Look up stadium data
  const stadium = getStadium(stadium_id);
  if (!stadium) {
    return c.json({ error: `Stadium '${stadium_id}' not found` }, 404);
  }
  const zones = getZones(stadium_id);

  // Sanitize user input (injection guard)
  const { sanitized, wasModified, strippedPatterns } = sanitizeUserInput(message);
  if (wasModified) {
    console.warn('[InjectionGuard] Stripped patterns:', strippedPatterns);
  }

  // Build prompt and call Gemini
  const prompt = buildConciergePrompt(stadium, zones, sanitized, accessibility_mode ?? 'none');

  const { data, source } = await generateStructuredResponse({
    prompt,
    schema: ConciergeResponseSchema,
    fallbackFn: () => conciergeFallback(language_hint),
  });

  return c.json({ ...data, _source: source });
});

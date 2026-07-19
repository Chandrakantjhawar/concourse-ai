// ──────────────────────────────────────────────────────────
// Concourse AI — Transit & Sustainability Router
// Fan transit recommendation with green recap
// ──────────────────────────────────────────────────────────

import { Hono } from 'hono';
import { TransitRecommendRequestSchema, TransitRecommendResponseSchema } from '../schemas/index.js';
import { generateStructuredResponse } from '../services/gemini.service.js';
import { getStadium, getShuttleLines, getParkingLots } from '../services/data-loader.js';
import { buildTransitPrompt } from '../prompts/transit.prompt.js';
import { transitFallback } from '../fallback/transit.fallback.js';

export const transitRouter = new Hono();

// POST /api/transit/recommend — transit recommendation
transitRouter.post('/transit/recommend', async (c) => {
  const body = await c.req.json();
  const parsed = TransitRecommendRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid request', details: parsed.error.flatten() }, 400);
  }

  const { stadium_id, fan_origin_area } = parsed.data;

  const stadium = getStadium(stadium_id);
  if (!stadium) {
    return c.json({ error: `Stadium '${stadium_id}' not found` }, 404);
  }

  const shuttleLines = getShuttleLines(stadium_id);
  const parkingLots = getParkingLots(stadium_id);

  const now = new Date();
  const prompt = buildTransitPrompt(
    stadium.name,
    fan_origin_area,
    '18:00', // Match kickoff time
    now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    shuttleLines,
    parkingLots,
  );

  const { data, source } = await generateStructuredResponse({
    prompt,
    schema: TransitRecommendResponseSchema,
    fallbackFn: () => transitFallback(),
  });

  return c.json({ ...data, _source: source });
});

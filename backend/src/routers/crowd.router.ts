// ──────────────────────────────────────────────────────────
// Concourse AI — Crowd Pulse Router
// Zone telemetry ingestion + AI operational briefing
// ──────────────────────────────────────────────────────────

import { Hono } from 'hono';
import { CrowdTelemetryPayloadSchema, CrowdBriefingResponseSchema } from '../schemas/index.js';
import { generateStructuredResponse } from '../services/gemini.service.js';
import { getStadium, getZones, updateZoneTelemetry } from '../services/data-loader.js';
import { buildCrowdPrompt } from '../prompts/crowd.prompt.js';
import { crowdFallback } from '../fallback/crowd.fallback.js';

export const crowdRouter = new Hono();

// POST /api/crowd/telemetry — ingest zone telemetry snapshot
crowdRouter.post('/crowd/telemetry', async (c) => {
  const body = await c.req.json();
  const parsed = CrowdTelemetryPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid telemetry payload', details: parsed.error.flatten() }, 400);
  }

  const { stadium_id, zones } = parsed.data;

  const stadium = getStadium(stadium_id);
  if (!stadium) {
    return c.json({ error: `Stadium '${stadium_id}' not found` }, 404);
  }

  // Update in-memory zone data
  updateZoneTelemetry(stadium_id, zones);

  return c.json({ ok: true, updated_zones: zones.length });
});

// GET /api/crowd/briefing — AI-generated operational briefing
crowdRouter.get('/crowd/briefing', async (c) => {
  const stadiumId = c.req.query('stadium_id');
  if (!stadiumId) {
    return c.json({ error: 'stadium_id query parameter is required' }, 400);
  }

  const stadium = getStadium(stadiumId);
  if (!stadium) {
    return c.json({ error: `Stadium '${stadiumId}' not found` }, 404);
  }

  const zones = getZones(stadiumId);
  const prompt = buildCrowdPrompt(stadium.name, zones);

  const { data, source } = await generateStructuredResponse({
    prompt,
    schema: CrowdBriefingResponseSchema,
    fallbackFn: () => crowdFallback(zones),
  });

  return c.json({ ...data, _source: source });
});

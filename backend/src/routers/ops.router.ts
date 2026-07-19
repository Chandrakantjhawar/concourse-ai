// ──────────────────────────────────────────────────────────
// Concourse AI — Volunteer Ops Router
// Shift digest + grounded Q&A from SOP snippets
// ──────────────────────────────────────────────────────────

import { Hono } from 'hono';
import { OpsAskRequestSchema, OpsResponseSchema } from '../schemas/index.js';
import { generateStructuredResponse } from '../services/gemini.service.js';
import { getStadium, getZones, getSOPSnippets } from '../services/data-loader.js';
import { buildOpsDigestPrompt, buildOpsAskPrompt } from '../prompts/ops.prompt.js';
import { opsDigestFallback, opsAskFallback } from '../fallback/ops.fallback.js';

export const opsRouter = new Hono();

// GET /api/ops/digest — shift-start briefing for a role
opsRouter.get('/ops/digest', async (c) => {
  const stadiumId = c.req.query('stadium_id');
  const role = c.req.query('role');

  if (!stadiumId || !role) {
    return c.json({ error: 'stadium_id and role query parameters are required' }, 400);
  }

  const stadium = getStadium(stadiumId);
  if (!stadium) {
    return c.json({ error: `Stadium '${stadiumId}' not found` }, 404);
  }

  const zones = getZones(stadiumId);
  const sopSnippets = getSOPSnippets(); // All SOPs for digest

  // Build contextual feed
  const contextFeed = {
    weather: 'Clear skies, 28°C (82°F), UV index high — remind fans to hydrate',
    transit_status: 'NJ Transit running on schedule. Shuttle lot B at 60% capacity.',
    crowd_forecast_summary: `Current occupancy: ${zones.reduce((sum, z) => sum + z.current_count, 0).toLocaleString()} fans across ${zones.length} zones.`,
    todays_matches: stadium.match_context,
  };

  const prompt = buildOpsDigestPrompt(
    role,
    '14:00',
    '22:00',
    contextFeed,
    sopSnippets,
  );

  const { data, source } = await generateStructuredResponse({
    prompt,
    schema: OpsResponseSchema,
    fallbackFn: () => opsDigestFallback(role),
  });

  return c.json({ ...data, _source: source });
});

// POST /api/ops/ask — staff Q&A grounded in SOPs
opsRouter.post('/ops/ask', async (c) => {
  const body = await c.req.json();
  const parsed = OpsAskRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid request', details: parsed.error.flatten() }, 400);
  }

  const { stadium_id, role, question } = parsed.data;

  const stadium = getStadium(stadium_id);
  if (!stadium) {
    return c.json({ error: `Stadium '${stadium_id}' not found` }, 404);
  }

  // Keyword-match SOPs from the question
  const keywords = question
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3);
  const sopSnippets = getSOPSnippets(keywords);

  const prompt = buildOpsAskPrompt(role, question, sopSnippets);

  const { data, source } = await generateStructuredResponse({
    prompt,
    schema: OpsResponseSchema,
    fallbackFn: () => opsAskFallback(),
  });

  return c.json({ ...data, _source: source });
});

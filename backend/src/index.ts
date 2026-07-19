// ──────────────────────────────────────────────────────────
// Concourse AI — Main Application Entry Point
// Hono server with all routers, CORS, error handling
// ──────────────────────────────────────────────────────────

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { config } from './config.js';
import { loadAllData } from './services/data-loader.js';
import { conciergeRouter } from './routers/concierge.router.js';
import { crowdRouter } from './routers/crowd.router.js';
import { opsRouter } from './routers/ops.router.js';
import { transitRouter } from './routers/transit.router.js';
import { healthRouter } from './routers/health.router.js';

const app = new Hono();

// ── Middleware ────────────────────────────────────────────

app.use('/*', cors({
  origin: '*', // Allow all origins for the hackathon deployment
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

// ── Global error handler — never leak stack traces ───────

app.onError((err, c) => {
  console.error('[Error]', err.message);
  return c.json(
    { error: 'An internal error occurred. Please try again.' },
    500,
  );
});

// ── Mount routers ────────────────────────────────────────

app.route('/api', healthRouter);
app.route('/api', conciergeRouter);
app.route('/api', crowdRouter);
app.route('/api', opsRouter);
app.route('/api', transitRouter);

// ── Root route ───────────────────────────────────────────

app.get('/', (c) => {
  return c.json({
    name: 'Concourse AI',
    description: 'GenAI Co-Pilot for FIFA World Cup 2026 Stadiums',
    version: '1.0.0',
    endpoints: [
      'GET  /api/health',
      'GET  /api/stadiums',
      'GET  /api/stadiums/:id/zones',
      'POST /api/concierge/chat',
      'POST /api/crowd/telemetry',
      'GET  /api/crowd/briefing?stadium_id=',
      'GET  /api/ops/digest?stadium_id=&role=',
      'POST /api/ops/ask',
      'POST /api/transit/recommend',
    ],
  });
});

// ── Startup ──────────────────────────────────────────────

// Load and validate all seed data before starting
try {
  loadAllData();
  console.log('[Startup] ✓ Seed data loaded and validated');
} catch (error) {
  console.error('[Startup] ✗ Failed to load seed data:', error);
  process.exit(1);
}

const port = config.PORT;
console.log(`[Startup] Concourse AI backend starting on port ${port}`);
console.log(`[Startup] Model: ${config.GEMINI_MODEL}`);
console.log(`[Startup] Fallback mode: ${config.USE_LOCAL_FALLBACK ? 'ON' : 'OFF'}`);

serve({ fetch: app.fetch, port });
console.log(`[Startup] ✓ Server running at http://localhost:${port}`);

export default app;

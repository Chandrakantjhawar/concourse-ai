import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { crowdRouter } from './crowd.router.js';
import * as geminiService from '../services/gemini.service.js';

vi.mock('../services/gemini.service.js', () => ({
  generateStructuredResponse: vi.fn(),
}));

describe('Crowd Router', () => {
  it('should return 400 for invalid query on /crowd/briefing', async () => {
    const app = new Hono();
    app.route('/', crowdRouter);

    const res = await app.request('/crowd/briefing');
    expect(res.status).toBe(400);
  });

  it('should process briefing request and return AI response', async () => {
    vi.mocked(geminiService.generateStructuredResponse).mockResolvedValueOnce({
      data: {
        overall_status: 'watch',
        summary: 'Crowds are building.',
        critical_zones: [],
        recommended_actions: []
      },
      source: 'gemini'
    });

    const app = new Hono();
    app.route('/', crowdRouter);

    const res = await app.request('/crowd/briefing?stadium_id=metlife');
    
    expect(res.status).toBe(200);
  });

  it('should process telemetry and store it in memory', async () => {
    const app = new Hono();
    app.route('/', crowdRouter);

    const res = await app.request('/crowd/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stadium_id: 'metlife',
        zones: [{
          zone_id: 'zone-1',
          current_count: 850,
          trend_last_10min: 'rising',
          nearby_incidents: []
        }]
      }),
    });
    
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

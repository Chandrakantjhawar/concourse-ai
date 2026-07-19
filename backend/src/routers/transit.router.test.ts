import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { transitRouter } from './transit.router.js';
import * as geminiService from '../services/gemini.service.js';

vi.mock('../services/gemini.service.js', () => ({
  generateStructuredResponse: vi.fn(),
}));

describe('Transit Router', () => {
  it('should return 400 for invalid request body on /transit/recommend', async () => {
    const app = new Hono();
    app.route('/', transitRouter);

    const res = await app.request('/transit/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missing_stadium_id: true }),
    });
    
    expect(res.status).toBe(400);
  });

  it('should process recommend request and return AI response', async () => {
    vi.mocked(geminiService.generateStructuredResponse).mockResolvedValueOnce({
      data: {
        recommendation: 'Take the shuttle.',
        mode_id: 'shuttle_1',
        estimated_duration_mins: 15,
        sustainability_note: 'Saves 5kg of CO2',
        departure_time_advice: 'Leave now'
      },
      source: 'gemini'
    });

    const app = new Hono();
    app.route('/', transitRouter);

    const res = await app.request('/transit/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stadium_id: 'metlife',
        fan_origin_area: 'Downtown',
        accessibility_needed: false
      }),
    });
    
    expect(res.status).toBe(200);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { opsRouter } from './ops.router.js';
import * as geminiService from '../services/gemini.service.js';

vi.mock('../services/gemini.service.js', () => ({
  generateStructuredResponse: vi.fn(),
}));

describe('Ops Router', () => {
  it('should return 400 for invalid request body on /ops/ask', async () => {
    const app = new Hono();
    app.route('/', opsRouter);

    const res = await app.request('/ops/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missing_stadium_id: true }),
    });
    
    expect(res.status).toBe(400);
  });

  it('should process ask request and return AI response', async () => {
    vi.mocked(geminiService.generateStructuredResponse).mockResolvedValueOnce({
      data: {
        text: 'SOP says to evacuate immediately.',
        relevant_sop_titles: ['Evacuation Protocol'],
        is_emergency: true
      },
      source: 'gemini'
    });

    const app = new Hono();
    app.route('/', opsRouter);

    const res = await app.request('/ops/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stadium_id: 'metlife',
        role: 'security',
        question: 'There is a fire.'
      }),
    });
    
    expect(res.status).toBe(200);
  });

  it('should return 400 for invalid query on /ops/digest', async () => {
    const app = new Hono();
    app.route('/', opsRouter);

    const res = await app.request('/ops/digest');
    expect(res.status).toBe(400);
  });
  
  it('should process digest request successfully', async () => {
    vi.mocked(geminiService.generateStructuredResponse).mockResolvedValueOnce({
      data: {
        summary: 'Shift is starting.',
        priority_tasks: [{ task: 'Check gates', importance: 'high' }],
        safety_reminders: ['Stay hydrated'],
        weather_impact: 'Clear'
      },
      source: 'gemini'
    });

    const app = new Hono();
    app.route('/', opsRouter);

    const res = await app.request('/ops/digest?stadium_id=metlife&role=security');
    
    expect(res.status).toBe(200);
  });
});

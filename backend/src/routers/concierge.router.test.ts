import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { conciergeRouter } from './concierge.router.js';
import * as geminiService from '../services/gemini.service.js';

vi.mock('../services/gemini.service.js', () => ({
  generateStructuredResponse: vi.fn(),
}));

describe('Concierge Router', () => {
  it('should return 400 for invalid request body on /concierge/chat', async () => {
    const app = new Hono();
    app.route('/', conciergeRouter);

    const res = await app.request('/concierge/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missing_stadium_id: true }),
    });
    
    expect(res.status).toBe(400);
  });

  it('should process chat request and return AI response', async () => {
    vi.mocked(geminiService.generateStructuredResponse).mockResolvedValueOnce({
      data: {
        text: 'Hello, the bathroom is near section 108.',
        language: 'en',
        text_direction: 'ltr',
        escalate_to_human: false
      },
      source: 'gemini'
    });

    const app = new Hono();
    app.route('/', conciergeRouter);

    const res = await app.request('/concierge/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stadium_id: 'metlife',
        message: 'Where is the bathroom?',
        accessibility_mode: 'none'
      }),
    });
    
    expect(res.status).toBe(200);
  });

  it('should return 404 for unknown stadium on /concierge/chat', async () => {
    const app = new Hono();
    app.route('/', conciergeRouter);

    const res = await app.request('/concierge/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stadium_id: 'nonexistent',
        message: 'Where is the bathroom?',
        accessibility_mode: 'none'
      }),
    });
    
    expect(res.status).toBe(404);
  });
});

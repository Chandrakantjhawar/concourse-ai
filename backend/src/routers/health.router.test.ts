import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { healthRouter } from './health.router.js';
import * as geminiService from '../services/gemini.service.js';

vi.mock('../services/gemini.service.js', () => ({
  checkGeminiHealth: vi.fn(),
}));

describe('Health Router', () => {
  it('should return 200 OK and correct JSON structure', async () => {
    vi.mocked(geminiService.checkGeminiHealth).mockResolvedValueOnce(true);

    const app = new Hono();
    app.route('/', healthRouter);

    const res = await app.request('/health');
    expect(res.status).toBe(200);
    
    const json = await res.json();
    expect(json).toHaveProperty('status', 'ok');
    expect(json).toHaveProperty('gemini_reachable', true);
  });

  it('should handle unreachable gemini', async () => {
    vi.mocked(geminiService.checkGeminiHealth).mockResolvedValueOnce(false);

    const app = new Hono();
    app.route('/', healthRouter);

    const res = await app.request('/health');
    expect(res.status).toBe(200);
    
    const json = await res.json();
    expect(json).toHaveProperty('status', 'degraded');
  });
});

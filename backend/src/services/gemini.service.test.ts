import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateStructuredResponse, checkGeminiHealth } from './gemini.service.js';
import { z } from 'zod';

// Mock config module to allow changing USE_LOCAL_FALLBACK
let mockUseLocalFallback = false;
vi.mock('../config.js', () => ({
  config: {
    get USE_LOCAL_FALLBACK() {
      return mockUseLocalFallback;
    },
    GEMINI_API_KEY: 'test-key',
    GEMINI_MODEL: 'test-model'
  }
}));

// Mock the GoogleGenerativeAI module
const mockGenerateContent = vi.fn();
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    })),
  };
});

describe('Gemini Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocalFallback = false;
  });

  const TestSchema = z.object({ result: z.string() });
  const fallbackFn = () => ({ result: 'fallback' });

  it('should use fallback immediately if configured globally', async () => {
    mockUseLocalFallback = true;
    const res = await generateStructuredResponse({
      prompt: 'test',
      schema: TestSchema,
      fallbackFn,
    });
    expect(res.source).toBe('fallback');
    expect(res.data.result).toBe('fallback');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('should successfully call gemini and parse JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => '```json\n{"result": "success"}\n```' },
    });

    const res = await generateStructuredResponse({
      prompt: 'hello_cache_test',
      schema: TestSchema,
      fallbackFn,
    });
    
    expect(res.source).toBe('gemini');
    expect(res.data.result).toBe('success');
  });

  it('should return from cache on subsequent identical calls', async () => {
    // First call uses cached value from previous test ('hello_cache_test')
    const res = await generateStructuredResponse({
      prompt: 'hello_cache_test',
      schema: TestSchema,
      fallbackFn,
    });
    
    expect(res.source).toBe('cache');
    expect(res.data.result).toBe('success');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('should retry on failure and eventually succeed', async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error('Transient Error'))
      .mockResolvedValueOnce({
        response: { text: () => '{"result": "retried"}' },
      });

    const res = await generateStructuredResponse({
      prompt: 'retry_test',
      schema: TestSchema,
      fallbackFn,
      maxRetries: 1,
    });
    
    expect(res.source).toBe('gemini');
    expect(res.data.result).toBe('retried');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('should fallback immediately on 429 rate limit', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('429 Too Many Requests'));

    const res = await generateStructuredResponse({
      prompt: 'rate_limit_test',
      schema: TestSchema,
      fallbackFn,
      maxRetries: 2,
    });
    
    expect(res.source).toBe('fallback');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1); // Did not retry
  });

  describe('checkGeminiHealth', () => {
    it('should return false if local fallback is forced', async () => {
      mockUseLocalFallback = true;
      const health = await checkGeminiHealth();
      expect(health).toBe(false);
    });

    it('should return true if model responds with ok', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => '{"status":"ok"}' },
      });
      const health = await checkGeminiHealth();
      expect(health).toBe(true);
    });

    it('should return false on exception', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('Network error'));
      const health = await checkGeminiHealth();
      expect(health).toBe(false);
    });
  });

  describe('Multi-Provider Resolution', () => {
    it('should list available providers correctly', async () => {
      const { getAvailableProviders } = await import('./gemini.service.js');
      const providers = getAvailableProviders();
      expect(providers).toContain('gemini');
    });
  });
});


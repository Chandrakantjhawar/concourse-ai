// ──────────────────────────────────────────────────────────
// Concourse AI — Configuration (typed env vars)
// ──────────────────────────────────────────────────────────

import 'dotenv/config';
import { cleanEnv, str, bool, port } from 'envalid';

export const config = cleanEnv(process.env, {
  AI_PROVIDER:          str({ default: 'auto', choices: ['auto', 'gemini', 'groq', 'grok', 'openrouter', 'openai'] }),
  GEMINI_API_KEY:       str({ default: '' }),
  GEMINI_MODEL:         str({ default: 'gemini-2.0-flash' }),
  GROQ_API_KEY:         str({ default: '' }),
  GROQ_MODEL:           str({ default: 'llama-3.3-70b-versatile' }),
  GROK_API_KEY:         str({ default: '' }),
  GROK_MODEL:           str({ default: 'grok-beta' }),
  OPENROUTER_API_KEY:   str({ default: '' }),
  OPENROUTER_MODEL:     str({ default: 'google/gemini-2.0-flash-exp:free' }),
  OPENAI_API_KEY:       str({ default: '' }),
  OPENAI_BASE_URL:      str({ default: 'https://api.openai.com/v1' }),
  OPENAI_MODEL:         str({ default: 'gpt-4o-mini' }),
  USE_LOCAL_FALLBACK:   bool({ default: false }),
  PORT:                 port({ default: 8080 }),
  NODE_ENV:             str({ choices: ['development', 'production', 'test'] as const, default: 'development' }),
});


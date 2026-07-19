// ──────────────────────────────────────────────────────────
// Concourse AI — Configuration (typed env vars)
// ──────────────────────────────────────────────────────────

import 'dotenv/config';
import { cleanEnv, str, bool, port } from 'envalid';

export const config = cleanEnv(process.env, {
  GEMINI_API_KEY:       str({ desc: 'Google Gemini API key' }),
  GEMINI_MODEL:         str({ default: 'gemini-2.5-flash' }),
  USE_LOCAL_FALLBACK:   bool({ default: false }),
  PORT:                 port({ default: 8080 }),
  NODE_ENV:             str({ choices: ['development', 'production', 'test'] as const, default: 'development' }),
});

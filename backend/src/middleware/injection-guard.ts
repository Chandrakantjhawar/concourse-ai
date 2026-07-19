// ──────────────────────────────────────────────────────────
// Concourse AI — Injection Guard Middleware
// Strips prompt injection attempts from user input
// ──────────────────────────────────────────────────────────

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions/gi,
  /ignore\s+(all\s+)?prior\s+instructions/gi,
  /you\s+are\s+now\s+/gi,
  /act\s+as\s+(a\s+)?/gi,
  /pretend\s+(to\s+be|you\s+are)/gi,
  /system\s*prompt/gi,
  /reveal\s+your/gi,
  /show\s+me\s+your\s+(system|instructions|prompt)/gi,
  /disregard\s+(all\s+)?/gi,
  /override\s+(your\s+)?/gi,
  /forget\s+(all\s+)?(your\s+)?instructions/gi,
  /new\s+instructions/gi,
  /jailbreak/gi,
  /DAN\s+mode/gi,
  /developer\s+mode/gi,
];

export interface SanitizeResult {
  sanitized: string;
  wasModified: boolean;
  strippedPatterns: string[];
}

/**
 * Strips known prompt-injection patterns from user input.
 * Logs stripped content but doesn't block the request —
 * the Gemini prompt itself has anti-injection clauses too.
 */
export function sanitizeUserInput(input: string): SanitizeResult {
  let sanitized = input;
  const strippedPatterns: string[] = [];

  for (const pattern of INJECTION_PATTERNS) {
    const matches = sanitized.match(pattern);
    if (matches) {
      for (const match of matches) {
        strippedPatterns.push(match);
      }
      sanitized = sanitized.replace(pattern, '[FILTERED]');
    }
  }

  return {
    sanitized,
    wasModified: strippedPatterns.length > 0,
    strippedPatterns,
  };
}

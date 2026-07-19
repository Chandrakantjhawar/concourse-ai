// ──────────────────────────────────────────────────────────
// Concourse AI — Transit Fallback
// Generic transit guidance when AI is unavailable
// ──────────────────────────────────────────────────────────

import type { TransitRecommendResponse } from '../types/index.js';

export function transitFallback(): TransitRecommendResponse {
  return {
    recommended_option: 'AI transit advisor is temporarily unavailable. Please check venue signage for shuttle departure times and locations.',
    reason: 'AI service unavailable — default guidance provided.',
    alt_options: [
      'Follow venue signage to the nearest shuttle pick-up point',
      'Ask any steward for transit directions',
    ],
    sustainability_note: 'Shared transit reduces traffic congestion and emissions — consider the shuttle or public transit when available.',
  };
}

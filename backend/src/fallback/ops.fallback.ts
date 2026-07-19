// ──────────────────────────────────────────────────────────
// Concourse AI — Volunteer Ops Fallback
// Returns honest "unavailable" for both digest and Q&A
// ──────────────────────────────────────────────────────────

import type { OpsResponse } from '../types/index.js';

export function opsDigestFallback(role: string): OpsResponse {
  return {
    answer: `AI digest is temporarily unavailable for ${role}. Please check your printed briefing sheet or radio your zone supervisor for shift updates.`,
    grounded_in_sop_ids: [],
    escalate: false,
  };
}

export function opsAskFallback(): OpsResponse {
  return {
    answer: "AI assistant is temporarily unavailable. For any procedural question, please radio your zone supervisor. For emergencies, follow your printed SOP card.",
    grounded_in_sop_ids: [],
    escalate: false,
  };
}

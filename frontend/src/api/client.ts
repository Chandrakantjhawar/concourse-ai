// ──────────────────────────────────────────────────────────
// Concourse AI — Typed API Client
// ──────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

/**
 * Generic fetch wrapper for API calls
 * @param {string} path - The API endpoint path
 * @param {RequestInit} [options] - Fetch options
 * @returns {Promise<T>} Typed response
 */
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'API error');
  }
  return res.json() as Promise<T>;
}

// ── Types (mirrored from backend) ────────────────────────

export interface Stadium {
  id: string;
  name: string;
  city: string;
  country: string;
  capacity: number;
  match_context: string;
  accessibility_features: string[];
}

export interface Zone {
  id: string;
  stadium_id: string;
  name: string;
  capacity: number;
  current_count: number;
  trend_last_10min: 'rising' | 'stable' | 'falling';
  gates: string[];
  accessible: boolean;
  elevator_nearby: string | null;
}

export interface ConciergeResponse {
  reply_text: string;
  detected_language: string;
  emergency: boolean;
  escalation_reason: string | null;
  text_direction: 'ltr' | 'rtl';
  _source: 'gemini' | 'fallback';
}

export interface CrowdBriefing {
  summary: string;
  zones: Array<{ zone_id: string; status: string; one_line_reason: string }>;
  recommended_actions: Array<{ action: string; target_zone: string; priority: number; rationale: string }>;
  sustainability?: {
    waste_diversion_rate_pct: number;
    energy_usage_status: string;
    water_usage_status: string;
  };
  _source: 'gemini' | 'fallback';
}

export interface OpsResponse {
  answer: string;
  grounded_in_sop_ids: string[];
  escalate: boolean;
  _source: 'gemini' | 'fallback';
}

export interface TransitResponse {
  recommended_option: string;
  reason: string;
  alt_options: string[];
  sustainability_note: string;
  _source: 'gemini' | 'fallback';
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  gemini_reachable: boolean;
  timestamp: string;
  model: string;
}

// ── API Functions ────────────────────────────────────────

/**
 * API Client methods
 * Handles all communication with the Concourse AI backend
 */
export const api = {
  getStadiums: () => request<Stadium[]>('/stadiums'),

  getZones: (stadiumId: string) =>
    request<{ stadium: Stadium; zones: Zone[] }>(`/stadiums/${stadiumId}/zones`),

  chatConcierge: (stadiumId: string, message: string, accessibilityMode = 'none', languageHint?: string) =>
    request<ConciergeResponse>('/concierge/chat', {
      method: 'POST',
      body: JSON.stringify({
        stadium_id: stadiumId,
        message,
        accessibility_mode: accessibilityMode,
        language_hint: languageHint,
      }),
    }),

  postTelemetry: (stadiumId: string, zones: Array<{ zone_id: string; current_count: number; trend_last_10min: string; nearby_incidents: Array<{ type: string; severity: string; time: string }> }>) =>
    request<{ ok: boolean }>('/crowd/telemetry', {
      method: 'POST',
      body: JSON.stringify({ stadium_id: stadiumId, zones }),
    }),

  getCrowdBriefing: (stadiumId: string) =>
    request<CrowdBriefing>(`/crowd/briefing?stadium_id=${stadiumId}`),

  getOpsDigest: (stadiumId: string, role: string) =>
    request<OpsResponse>(`/ops/digest?stadium_id=${stadiumId}&role=${encodeURIComponent(role)}`),

  askOps: (stadiumId: string, role: string, question: string) =>
    request<OpsResponse>('/ops/ask', {
      method: 'POST',
      body: JSON.stringify({ stadium_id: stadiumId, role, question }),
    }),

  getTransitRecommendation: (stadiumId: string, fanOriginArea: string) =>
    request<TransitResponse>('/transit/recommend', {
      method: 'POST',
      body: JSON.stringify({ stadium_id: stadiumId, fan_origin_area: fanOriginArea }),
    }),

  getHealth: () => request<HealthResponse>('/health'),
};

// ──────────────────────────────────────────────────────────
// Concourse AI — Shared Types
// All types are derived from Zod schemas in ../schemas/
// This file provides pure TS interfaces for IDE ergonomics
// ──────────────────────────────────────────────────────────

export type TextDirection = 'ltr' | 'rtl';

export type AccessibilityMode =
  | 'none'
  | 'wheelchair'
  | 'low_vision'
  | 'deaf_hard_of_hearing'
  | 'cognitive_support';

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'pt' | 'ar';

export type ZoneStatus = 'normal' | 'watch' | 'critical';
export type ZoneTrend = 'rising' | 'stable' | 'falling';
export type IncidentSeverity = 'low' | 'moderate' | 'critical';
export type IncidentStatus = 'open' | 'acknowledged' | 'resolved';
export type UsageStatus = 'normal' | 'elevated' | 'critical';

// ── Stadium & Zones ──────────────────────────────────────

export interface Stadium {
  id: string;
  name: string;
  city: string;
  country: string;
  capacity: number;
  match_context: string;
  timezone: string;
  coordinates: { lat: number; lng: number };
  accessibility_features: string[];
}

export interface Zone {
  id: string;
  stadium_id: string;
  name: string;
  capacity: number;
  current_count: number;
  trend_last_10min: ZoneTrend;
  gates: string[];
  accessible: boolean;
  elevator_nearby: string | null;
  nearby_incidents: Incident[];
}

export interface Incident {
  id?: string;
  type: string;
  severity: IncidentSeverity;
  zone_id?: string;
  description?: string;
  status?: IncidentStatus;
  timestamp?: string;
  time?: string;
}

// ── SOP Snippets ─────────────────────────────────────────

export interface SOPSnippet {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  body: string;
  escalation_required: boolean;
}

// ── Transit ──────────────────────────────────────────────

export interface ShuttleLine {
  line_id: string;
  stadium_id: string;
  name: string;
  capacity_pct: number;
  next_departure: string;
  eta_to_stadium: string;
}

export interface ParkingLot {
  lot_id: string;
  stadium_id: string;
  name: string;
  occupancy_pct: number;
}

// ── API Request / Response Types ─────────────────────────

export interface ConciergeRequest {
  stadium_id: string;
  message: string;
  accessibility_mode?: AccessibilityMode;
  language_hint?: SupportedLanguage;
}

export interface ConciergeResponse {
  reply_text: string;
  detected_language: string;
  emergency: boolean;
  escalation_reason: string | null;
  text_direction: TextDirection;
}

export interface CrowdTelemetryPayload {
  stadium_id: string;
  zones: Array<{
    zone_id: string;
    current_count: number;
    trend_last_10min: ZoneTrend;
    nearby_incidents: Array<{
      type: string;
      severity: IncidentSeverity;
      time: string;
    }>;
  }>;
}

export interface CrowdBriefingResponse {
  summary: string;
  zones: Array<{
    zone_id: string;
    status: ZoneStatus;
    one_line_reason: string;
  }>;
  recommended_actions: Array<{
    action: string;
    target_zone: string;
    priority: number;
    rationale: string;
  }>;
  sustainability: {
    waste_diversion_rate_pct: number;
    energy_usage_status: UsageStatus;
    water_usage_status: UsageStatus;
  };
}

export interface OpsDigestRequest {
  stadium_id: string;
  role: string;
}

export interface OpsAskRequest {
  stadium_id: string;
  role: string;
  question: string;
}

export interface OpsResponse {
  answer: string;
  grounded_in_sop_ids: string[];
  escalate: boolean;
}

export interface TransitRecommendRequest {
  stadium_id: string;
  fan_origin_area: string;
}

export interface TransitRecommendResponse {
  recommended_option: string;
  reason: string;
  alt_options: string[];
  sustainability_note: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  gemini_reachable: boolean;
  timestamp: string;
  model: string;
}

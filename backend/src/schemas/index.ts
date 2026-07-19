// ──────────────────────────────────────────────────────────
// Concourse AI — Zod Schemas
// Runtime validation for all API I/O
// ──────────────────────────────────────────────────────────

import { z } from 'zod';

// ── Enums ────────────────────────────────────────────────

export const AccessibilityModeSchema = z.enum([
  'none', 'wheelchair', 'low_vision',
  'deaf_hard_of_hearing', 'cognitive_support',
]);

export const SupportedLanguageSchema = z.enum(['en', 'es', 'fr', 'pt', 'ar']);
export const TextDirectionSchema = z.enum(['ltr', 'rtl']);
export const ZoneStatusSchema = z.enum(['normal', 'watch', 'critical']);
export const ZoneTrendSchema = z.enum(['rising', 'stable', 'falling']);
export const IncidentSeveritySchema = z.enum(['low', 'moderate', 'critical']);
export const IncidentStatusSchema = z.enum(['open', 'acknowledged', 'resolved']);
export const UsageStatusSchema = z.enum(['normal', 'elevated', 'critical']);

// ── Concierge ────────────────────────────────────────────

export const ConciergeRequestSchema = z.object({
  stadium_id: z.string().min(1),
  message: z.string().min(1).max(500),
  accessibility_mode: AccessibilityModeSchema.optional().default('none'),
  language_hint: SupportedLanguageSchema.optional(),
});

export const ConciergeResponseSchema = z.object({
  reply_text: z.string(),
  detected_language: z.string(),
  emergency: z.boolean(),
  escalation_reason: z.string().nullable(),
  text_direction: TextDirectionSchema,
});

// ── Crowd ────────────────────────────────────────────────

export const CrowdTelemetryPayloadSchema = z.object({
  stadium_id: z.string().min(1),
  zones: z.array(z.object({
    zone_id: z.string().min(1),
    current_count: z.number().int().min(0),
    trend_last_10min: ZoneTrendSchema,
    nearby_incidents: z.array(z.object({
      type: z.string(),
      severity: IncidentSeveritySchema,
      time: z.string(),
    })),
  })),
});

export const CrowdBriefingResponseSchema = z.object({
  summary: z.string(),
  zones: z.array(z.object({
    zone_id: z.string(),
    status: ZoneStatusSchema,
    one_line_reason: z.string(),
  })),
  recommended_actions: z.array(z.object({
    action: z.string(),
    target_zone: z.string(),
    priority: z.number().int().min(1).max(3),
    rationale: z.string(),
  })),
  sustainability: z.object({
    waste_diversion_rate_pct: z.number(),
    energy_usage_status: UsageStatusSchema,
    water_usage_status: UsageStatusSchema,
  }).optional(),
});

// ── Ops ──────────────────────────────────────────────────

export const OpsDigestRequestSchema = z.object({
  stadium_id: z.string().min(1),
  role: z.string().min(1),
});

export const OpsAskRequestSchema = z.object({
  stadium_id: z.string().min(1),
  role: z.string().min(1),
  question: z.string().min(1).max(500),
});

export const OpsResponseSchema = z.object({
  answer: z.string(),
  grounded_in_sop_ids: z.array(z.string()),
  escalate: z.boolean(),
});

// ── Transit ──────────────────────────────────────────────

export const TransitRecommendRequestSchema = z.object({
  stadium_id: z.string().min(1),
  fan_origin_area: z.string().min(1),
});

export const TransitRecommendResponseSchema = z.object({
  recommended_option: z.string(),
  reason: z.string(),
  alt_options: z.array(z.string()),
  sustainability_note: z.string(),
});

// ── Health ────────────────────────────────────────────────

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  gemini_reachable: z.boolean(),
  timestamp: z.string(),
  model: z.string(),
});

// ── Data Schemas ─────────────────────────────────────────

export const StadiumSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  country: z.string(),
  capacity: z.number().int().positive(),
  match_context: z.string(),
  timezone: z.string(),
  coordinates: z.object({ lat: z.number(), lng: z.number() }),
  accessibility_features: z.array(z.string()),
});

export const ZoneSchema = z.object({
  id: z.string(),
  stadium_id: z.string(),
  name: z.string(),
  capacity: z.number().int().positive(),
  current_count: z.number().int().min(0),
  trend_last_10min: ZoneTrendSchema,
  gates: z.array(z.string()),
  accessible: z.boolean(),
  elevator_nearby: z.string().nullable(),
  nearby_incidents: z.array(z.object({
    id: z.string().optional(),
    type: z.string(),
    severity: IncidentSeveritySchema,
    zone_id: z.string().optional(),
    description: z.string().optional(),
    status: IncidentStatusSchema.optional(),
    timestamp: z.string().optional(),
    time: z.string().optional(),
  })),
});

export const SOPSnippetSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  keywords: z.array(z.string()),
  body: z.string(),
  escalation_required: z.boolean(),
});

export const ShuttleLineSchema = z.object({
  line_id: z.string(),
  stadium_id: z.string(),
  name: z.string(),
  capacity_pct: z.number(),
  next_departure: z.string(),
  eta_to_stadium: z.string(),
});

export const ParkingLotSchema = z.object({
  lot_id: z.string(),
  stadium_id: z.string(),
  name: z.string(),
  occupancy_pct: z.number(),
});

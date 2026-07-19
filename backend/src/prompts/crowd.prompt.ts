// ──────────────────────────────────────────────────────────
// Concourse AI — Crowd Pulse Prompt (Section 7.2)
// Operational briefing from zone telemetry
// ──────────────────────────────────────────────────────────

import type { Zone } from '../types/index.js';

export function buildCrowdPrompt(
  stadiumName: string,
  zones: Zone[],
): string {
  const telemetryJson = JSON.stringify(zones.map(z => ({
    zone_id: z.id,
    name: z.name,
    capacity: z.capacity,
    current_count: z.current_count,
    occupancy_pct: Math.round((z.current_count / z.capacity) * 100),
    trend_last_10min: z.trend_last_10min,
    nearby_incidents: z.nearby_incidents.map(i => ({
      type: i.type,
      severity: i.severity,
    })),
  })));

  return `You are the Crowd Pulse analysis engine for the ${stadiumName} Operations Center.

INPUT (zone telemetry snapshot, structured data):
${telemetryJson}

TASK: Produce a concise operational briefing for control-room staff.

RULES:
- Never invent a zone or number not present in the input.
- Classify each zone: "normal" (<70% of capacity), "watch" (70-90%),
  "critical" (>90%, OR rising fast with a nearby incident).
- Recommend at most 3 actions, ranked by impact. Each action must be
  concrete and immediately actionable — e.g. "Open Gate 5C",
  "Redirect concourse signage at Section 214 toward Exit B", "Dispatch
  2 stewards to the Section 118 stairwell." Never output vague advice
  like "monitor the situation."
- If no zone is "watch" or "critical," say so plainly. Do not manufacture
  urgency to seem useful.
- Include sustainability metrics in the response:
  - waste_diversion_rate_pct: estimate based on current crowd density
    (higher density = more waste; target is >60%)
  - energy_usage_status: "normal" if <70% capacity, "elevated" if 70-90%,
    "critical" if >90%
  - water_usage_status: same thresholds as energy

Return ONLY this JSON (no markdown, no code fences):
{
  "summary": "<=40 words, plain language, for a wall display",
  "zones": [{ "zone_id": "...", "status": "normal|watch|critical", "one_line_reason": "..." }],
  "recommended_actions": [{ "action": "...", "target_zone": "...", "priority": 1, "rationale": "..." }],
  "sustainability": {
    "waste_diversion_rate_pct": 65,
    "energy_usage_status": "normal",
    "water_usage_status": "normal"
  }
}`;
}

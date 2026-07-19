// ──────────────────────────────────────────────────────────
// Concourse AI — Crowd Pulse Fallback
// Returns a safe, deterministic briefing when Gemini is down
// ──────────────────────────────────────────────────────────

import type { CrowdBriefingResponse, Zone } from '../types/index.js';

export function crowdFallback(zones: Zone[]): CrowdBriefingResponse {
  const zoneStatuses = zones.map(z => {
    const pct = z.capacity > 0 ? (z.current_count / z.capacity) * 100 : 0;
    let status: 'normal' | 'watch' | 'critical' = 'normal';
    let reason = `${Math.round(pct)}% capacity, ${z.trend_last_10min}`;

    if (pct > 90 || (pct > 70 && z.trend_last_10min === 'rising' && z.nearby_incidents.length > 0)) {
      status = 'critical';
      reason = `${Math.round(pct)}% capacity with ${z.nearby_incidents.length} incident(s)`;
    } else if (pct > 70) {
      status = 'watch';
    }

    return { zone_id: z.id, status, one_line_reason: reason };
  });

  const criticalZones = zoneStatuses.filter(z => z.status === 'critical');
  const watchZones = zoneStatuses.filter(z => z.status === 'watch');

  let summary = 'AI briefing unavailable. ';
  if (criticalZones.length > 0) {
    summary += `${criticalZones.length} zone(s) at critical capacity. Manual review required.`;
  } else if (watchZones.length > 0) {
    summary += `${watchZones.length} zone(s) at elevated capacity. Monitoring recommended.`;
  } else {
    summary += 'All zones within normal capacity.';
  }

  return {
    summary,
    zones: zoneStatuses,
    recommended_actions: criticalZones.length > 0
      ? [{ action: 'Review critical zones and dispatch stewards', target_zone: criticalZones[0]?.zone_id ?? '', priority: 1, rationale: 'AI briefing unavailable — manual assessment needed' }]
      : [],
    sustainability: {
      waste_diversion_rate_pct: 62,
      energy_usage_status: 'normal',
      water_usage_status: 'normal',
    },
  };
}

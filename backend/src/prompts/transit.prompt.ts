// ──────────────────────────────────────────────────────────
// Concourse AI — Transit & Sustainability Prompt (Section 7.4)
// Fan transit recommendation + sustainability awareness
// ──────────────────────────────────────────────────────────

import type { ShuttleLine, ParkingLot } from '../types/index.js';

export function buildTransitPrompt(
  stadiumName: string,
  fanOriginArea: string,
  kickoffTime: string,
  currentTime: string,
  shuttleLines: ShuttleLine[],
  parkingLots: ParkingLot[],
): string {
  const inputJson = JSON.stringify({
    fan_origin_area: fanOriginArea,
    kickoff_time: kickoffTime,
    current_time: currentTime,
    shuttle_lines: shuttleLines.map(s => ({
      line_id: s.line_id,
      name: s.name,
      capacity_pct: s.capacity_pct,
      next_departure: s.next_departure,
      eta_to_stadium: s.eta_to_stadium,
    })),
    parking_lots: parkingLots.map(p => ({
      lot_id: p.lot_id,
      name: p.name,
      occupancy_pct: p.occupancy_pct,
    })),
  });

  return `You are the Transit & Sustainability Advisor for fans traveling to and
from ${stadiumName}.

INPUT:
${inputJson}

TASK:
1. Recommend the single best transit option, balancing wait time,
   crowding, and walk distance. Only recommend options from the input data.
2. Add one plain sentence noting the relative sustainability impact of
   shared transit vs. driving — informative, never preachy or guilt-inducing.
3. If current_time is after the match end, recommend a departure timing
   band that avoids the immediate post-match exit surge (e.g., "concourse
   exits peak roughly 15 minutes after the final whistle — consider
   grabbing food until then").
4. Never invent transit lines, parking lots, or times not present in the input.

Return ONLY this JSON (no markdown, no code fences):
{
  "recommended_option": "...",
  "reason": "...",
  "alt_options": ["..."],
  "sustainability_note": "..."
}`;
}

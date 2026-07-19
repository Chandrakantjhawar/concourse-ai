// ──────────────────────────────────────────────────────────
// Concourse AI — Data Loader
// Loads seed JSON into in-memory store on startup
// (Firestore integration can be added later for Cloud Run)
// ──────────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { StadiumSchema, ZoneSchema, SOPSnippetSchema, ShuttleLineSchema, ParkingLotSchema } from '../schemas/index.js';
import type { Stadium, Zone, SOPSnippet, ShuttleLine, ParkingLot } from '../types/index.js';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SEED_DIR = join(__dirname, '..', '..', 'seed-data');

// ── In-memory data store ─────────────────────────────────

interface DataStore {
  stadiums: Stadium[];
  zones: Zone[];
  sopSnippets: SOPSnippet[];
  shuttleLines: ShuttleLine[];
  parkingLots: ParkingLot[];
}

let store: DataStore | null = null;

function loadJsonFile<T>(filename: string, schema: z.ZodType<T[]>): T[] {
  const filePath = join(SEED_DIR, filename);
  const raw = readFileSync(filePath, 'utf-8');
  const parsed: unknown = JSON.parse(raw);
  return schema.parse(parsed);
}

/**
 * Loads all seed data from JSON files into memory.
 * Validates every record against its Zod schema.
 * Fails loudly if any file is malformed.
 */
export function loadAllData(): DataStore {
  if (store) return store;

  console.log('[DataLoader] Loading seed data from', SEED_DIR);

  store = {
    stadiums: loadJsonFile('stadiums.json', z.array(StadiumSchema)),
    zones: loadJsonFile('zones.json', z.array(ZoneSchema)),
    sopSnippets: loadJsonFile('sop_snippets.json', z.array(SOPSnippetSchema)),
    shuttleLines: loadJsonFile('shuttle_lines.json', z.array(ShuttleLineSchema)),
    parkingLots: loadJsonFile('parking_lots.json', z.array(ParkingLotSchema)),
  };

  console.log(`[DataLoader] Loaded: ${store.stadiums.length} stadiums, ${store.zones.length} zones, ${store.sopSnippets.length} SOPs, ${store.shuttleLines.length} shuttle lines, ${store.parkingLots.length} parking lots`);

  return store;
}

// ── Query helpers ────────────────────────────────────────

export function getStadiums(): Stadium[] {
  return loadAllData().stadiums;
}

export function getStadium(id: string): Stadium | undefined {
  return loadAllData().stadiums.find(s => s.id === id);
}

export function getZones(stadiumId: string): Zone[] {
  return loadAllData().zones.filter(z => z.stadium_id === stadiumId);
}

export function getZone(zoneId: string): Zone | undefined {
  return loadAllData().zones.find(z => z.id === zoneId);
}

export function updateZoneTelemetry(
  stadiumId: string,
  updates: Array<{ zone_id: string; current_count: number; trend_last_10min: string; nearby_incidents: Array<{ type: string; severity: string; time: string }> }>,
): void {
  const data = loadAllData();
  for (const update of updates) {
    const zone = data.zones.find(z => z.id === update.zone_id && z.stadium_id === stadiumId);
    if (zone) {
      zone.current_count = update.current_count;
      zone.trend_last_10min = update.trend_last_10min as Zone['trend_last_10min'];
      zone.nearby_incidents = update.nearby_incidents.map(i => ({
        type: i.type,
        severity: i.severity as Zone['nearby_incidents'][0]['severity'],
        zone_id: update.zone_id,
        description: `${i.type} incident at ${i.time}`,
        status: 'open' as const,
        timestamp: i.time,
      }));
    }
  }
}

export function getSOPSnippets(keywords?: string[]): SOPSnippet[] {
  const snippets = loadAllData().sopSnippets;
  if (!keywords || keywords.length === 0) return snippets;

  const lowerKeywords = keywords.map(k => k.toLowerCase());
  return snippets.filter(s =>
    s.keywords.some(sk =>
      lowerKeywords.some(uk => sk.toLowerCase().includes(uk) || uk.includes(sk.toLowerCase()))
    )
  );
}

export function getShuttleLines(stadiumId: string): ShuttleLine[] {
  return loadAllData().shuttleLines.filter(s => s.stadium_id === stadiumId);
}

export function getParkingLots(stadiumId: string): ParkingLot[] {
  return loadAllData().parkingLots.filter(p => p.stadium_id === stadiumId);
}

/**
 * Reset the data store (useful for tests).
 */
export function resetDataStore(): void {
  store = null;
}

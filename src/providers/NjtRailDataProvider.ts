/**
 * NJ TRANSIT Rail Data API (via backend proxy)
 *
 * Uses backend endpoint `/api/realtime/vehicles` which itself calls:
 * - POST /api/TrainData/getToken
 * - POST /api/TrainData/isValidToken
 * - POST /api/TrainData/getVehicleData
 */

import { BaseProvider } from '../core/Provider';
import type { ProviderObservation, ProviderTrainData } from '../types/domain';

type BackendVehicleRow = {
  ID: string;
  TRAIN_LINE: string;
  DIRECTION: string;
  ICS_TRACK_CKT: string;
  LAST_MODIFIED: string;
  SCHED_DEP_TIME: string;
  SEC_LATE?: string;
  NEXT_STOP?: string;
  LONGITUDE?: string;
  LATITUDE?: string;
};

type BackendVehicleResponse = {
  source: string;
  timestamp: number;
  trains: BackendVehicleRow[];
};

function normalizeNjtDirection(direction?: string): string {
  const d = (direction || '').trim().toLowerCase();
  // NJT Rail Data API uses Eastbound/Westbound. Normalize to the app's existing scheme.
  if (d.includes('eastbound') || d === 'east') return 'TO NY';
  if (d.includes('westbound') || d === 'west') return 'OUTBOUND';
  if (d.includes('inbound')) return 'TO NY';
  if (d.includes('outbound')) return 'OUTBOUND';
  return direction || 'unknown';
}

function mapNjtLineName(njtLine: string): string {
  const n = (njtLine || '').trim().toLowerCase();

  if (n === 'main line' || n === 'bergen county line') return 'Main/Bergen';
  if (n === 'morris & essex line' || n === 'me line') return 'Morris & Essex';
  if (n === 'montclair-boonton line') return 'Montclair-Boonton';
  if (n === 'north jersey coast line') return 'North Jersey Coast';
  if (n === 'northeast corridor line') return 'Northeast Corridor';
  if (n === 'pascack valley line') return 'Pascack Valley';
  if (n === 'raritan valley line') return 'Raritan Valley';
  if (n === 'atlantic city line') return 'Atlantic City';
  if (n === 'gladstone branch') return 'Gladstone Branch';
  if (n === 'princeton branch') return 'Princeton Branch';

  // Fallback: keep original string (still usable for display/search)
  return njtLine || 'unknown';
}

function parseNumberLike(v?: string): number | null {
  if (!v) return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function parseDelaySeconds(v?: string): number | undefined {
  const n = parseNumberLike(v);
  if (n === null) return undefined;
  // API provides seconds-late as a string; round to an integer for UI formatting.
  return Math.max(0, Math.round(n));
}

function normalizeNextStop(v?: string): string | undefined {
  if (!v) return undefined;
  const raw = v.trim();
  if (!raw) return undefined;

  // Common abbreviations observed in NJT responses
  const key = raw.toLowerCase();
  const map: Record<string, string> = {
    'salisbury mls': 'Salisbury Mills',
    'salisbury mls.': 'Salisbury Mills',
    'nyp': 'New York Penn Station',
    'nwk penn': 'Newark Penn Station',
  };

  return map[key] || raw;
}

export class NjtRailDataProvider extends BaseProvider {
  readonly id = 'njt-raildata';
  readonly name = 'NJ TRANSIT Rail Data (Realtime)';
  readonly updateInterval = 15000;

  async fetchObservations(): Promise<ProviderObservation | null> {
    try {
      const res = await fetch('/api/realtime/vehicles', {
        headers: { accept: 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`Backend /api/realtime/vehicles failed: ${res.status} ${res.statusText}`);
      }

      const data: BackendVehicleResponse = await res.json();

      const trains: ProviderTrainData[] = (data.trains || [])
        .map((row) => {
          const lat = parseNumberLike(row.LATITUDE);
          const lng = parseNumberLike(row.LONGITUDE);

          return {
            trainNumber: row.ID,
            line: mapNjtLineName(row.TRAIN_LINE),
            direction: normalizeNjtDirection(row.DIRECTION),
            // getVehicleData does not include a true "destination" field; keep undefined so the
            // UI doesn't misrepresent it. (Next stop is shown separately.)
            destination: undefined,
            position: lat != null && lng != null ? { lat, lng } : undefined,
            nextStop: normalizeNextStop(row.NEXT_STOP),
            delaySeconds: parseDelaySeconds(row.SEC_LATE),
            rawData: row,
          };
        })
        .filter((t) => t.position); // only include trains that have coordinates

      this.markAvailable();
      this.updateFetchTime();

      return {
        provider: this.id,
        timestamp: data.timestamp || Date.now(),
        trains,
      };
    } catch (error) {
      this.markUnavailable(error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }
}


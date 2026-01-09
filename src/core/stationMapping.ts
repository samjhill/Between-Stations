/**
 * Station name mapping and normalization
 * Maps timetable station names to canonical station IDs and coordinates
 */

import type { Position } from '../types/domain';

/**
 * Station data with canonical ID, name, and position
 */
export interface StationData {
  id: string;
  name: string;
  position: Position;
  aliases?: string[]; // Alternative names for fuzzy matching
}

/**
 * Comprehensive station database
 * This maps station names from timetables to canonical IDs and coordinates
 */
export const STATION_DATABASE: StationData[] = [
  // Major terminals
  { id: 'NYP', name: 'New York Penn Station', position: { lat: 40.7506, lng: -73.9935 } },
  { id: 'NWK', name: 'Newark Penn Station', position: { lat: 40.7347, lng: -74.1642 }, aliases: ['Newark', 'Newark Penn'] },
  { id: 'HOB', name: 'Hoboken', position: { lat: 40.7380, lng: -74.0307 } },
  { id: 'TRE', name: 'Trenton', position: { lat: 40.2176, lng: -74.7425 }, aliases: ['Trenton Transit Center'] },
  { id: 'SEC', name: 'Secaucus Junction', position: { lat: 40.7589, lng: -74.0771 }, aliases: ['Secaucus'] },
  
  // Northeast Corridor
  { id: 'EWR', name: 'Newark Airport', position: { lat: 40.6895, lng: -74.1745 }, aliases: ['Newark Liberty International Airport', 'Newark Airport Station', 'Newark Int\'l. Airport', 'Newark International Airport'] },
  { id: 'NB', name: 'Newark Broad St', position: { lat: 40.7323, lng: -74.1705 }, aliases: ['Newark Broad Street', 'Broad St'] },
  { id: 'SUB', name: 'Suburban Station', position: { lat: 39.9534, lng: -75.1656 }, aliases: ['Suburban'] },
  { id: 'JAV', name: 'Jersey Avenue', position: { lat: 40.4753, lng: -74.4563 } },
  
  // North Jersey Coast
  { id: 'LB', name: 'Long Branch', position: { lat: 40.3043, lng: -73.9924 } },
  { id: 'BH', name: 'Bay Head', position: { lat: 40.0715, lng: -74.0460 } },
  { id: 'PPB', name: 'Point Pleasant Beach', position: { lat: 40.0879, lng: -74.0482 } },
  { id: 'MSQ', name: 'Manasquan', position: { lat: 40.1237, lng: -74.0493 } },
  { id: 'SL', name: 'Spring Lake', position: { lat: 40.1515, lng: -74.0290 } },
  { id: 'BEL', name: 'Belmar', position: { lat: 40.1784, lng: -74.0221 } },
  { id: 'BB', name: 'Bradley Beach', position: { lat: 40.2018, lng: -74.0121 } },
  { id: 'AP', name: 'Asbury Park', position: { lat: 40.2204, lng: -74.0121 } },
  { id: 'ALL', name: 'Allenhurst', position: { lat: 40.2368, lng: -74.0068 } },
  { id: 'ELB', name: 'Elberon', position: { lat: 40.2659, lng: -73.9956 } },
  { id: 'MP', name: 'Monmouth Park', position: { lat: 40.3081, lng: -73.9892 } },
  { id: 'LS', name: 'Little Silver', position: { lat: 40.3365, lng: -74.0443 } },
  { id: 'RB', name: 'Red Bank', position: { lat: 40.3470, lng: -74.0643 } },
  { id: 'MID', name: 'Middletown', position: { lat: 40.3943, lng: -74.1179 } },
  { id: 'HAZ', name: 'Hazlet', position: { lat: 40.4148, lng: -74.1905 } },
  { id: 'ABM', name: 'Aberdeen-Matawan', position: { lat: 40.4123, lng: -74.2295 } },
  { id: 'SA', name: 'South Amboy', position: { lat: 40.4776, lng: -74.2901 } },
  { id: 'PA', name: 'Perth Amboy', position: { lat: 40.5065, lng: -74.2654 } },
  { id: 'WB', name: 'Woodbridge', position: { lat: 40.5545, lng: -74.2776 } },
  { id: 'AV', name: 'Avenel', position: { lat: 40.5809, lng: -74.2854 } },
  
  // Morris & Essex / Montclair-Boonton
  { id: 'SUM', name: 'Summit', position: { lat: 40.7170, lng: -74.3595 } },
  { id: 'MOT', name: 'Morristown', position: { lat: 40.7970, lng: -74.4813 } },
  { id: 'MST', name: 'Montclair State University', position: { lat: 40.8667, lng: -74.1975 }, aliases: ['Montclair State', 'MSU'] },
  { id: 'BON', name: 'Boonton', position: { lat: 40.9023, lng: -74.4079 } },
  
  // Main/Bergen
  { id: 'RWD', name: 'Ridgewood', position: { lat: 40.9793, lng: -74.1168 } },
  { id: 'SUF', name: 'Suffern', position: { lat: 41.1148, lng: -74.1496 } },
  
  // Pascack Valley
  { id: 'WCL', name: 'Woodcliff Lake', position: { lat: 41.0234, lng: -74.0640 } },
  { id: 'SPV', name: 'Spring Valley', position: { lat: 41.1148, lng: -74.0448 }, aliases: ['METRO-NORTH STATIONSSPRING VALLEY'] },
  { id: 'PR', name: 'Park Ridge', position: { lat: 41.0376, lng: -74.0398 } },
  { id: 'MV', name: 'Montvale', position: { lat: 41.0468, lng: -74.0229 }, aliases: ['Montvale, NJ'] },
  
  // Raritan Valley
  { id: 'RSP', name: 'Roselle Park', position: { lat: 40.6650, lng: -74.2593 } },
  { id: 'WFD', name: 'Westfield', position: { lat: 40.6520, lng: -74.3473 } },
  { id: 'PLF', name: 'Plainfield', position: { lat: 40.6178, lng: -74.4187 } },
  { id: 'HB', name: 'High Bridge', position: { lat: 40.6682, lng: -74.8959 } },
  
  // Atlantic City
  { id: 'P30', name: 'Philadelphia 30th Street', position: { lat: 39.9558, lng: -75.1821 }, aliases: ['30th Street', 'Philadelphia', 'PHILADELPHIA 30TH ST.', 'PHILADELPHIA 30TH ST'] },
  { id: 'CHL', name: 'Cherry Hill', position: { lat: 39.9348, lng: -75.0306 } },
  { id: 'ATC', name: 'Atlantic City', position: { lat: 39.3643, lng: -74.4229 }, aliases: ['ATLANTIC CITY'] },
  { id: 'ABS', name: 'Absecon', position: { lat: 39.4285, lng: -74.4957 } },
  { id: 'EHC', name: 'Egg Harbor City', position: { lat: 39.5290, lng: -74.6479 } },
  { id: 'HAM', name: 'Hammonton', position: { lat: 39.6365, lng: -74.8024 } },
  { id: 'ATCO', name: 'Atco', position: { lat: 39.7690, lng: -74.8832 } },
  { id: 'LIN', name: 'Lindenwold', position: { lat: 39.8173, lng: -75.0946 } },
  { id: 'PNS', name: 'Pennsauken', position: { lat: 39.9651, lng: -75.0580 } },
  
  // Gladstone Branch
  { id: 'BER', name: 'Bernardsville', position: { lat: 40.7188, lng: -74.5699 } },
  { id: 'GLD', name: 'Gladstone', position: { lat: 40.7553, lng: -74.6624 } },
  
  // Princeton Branch
  { id: 'PJ', name: 'Princeton Junction', position: { lat: 40.3171, lng: -74.6235 }, aliases: ['Princeton Jct'] },
  { id: 'PRI', name: 'Princeton', position: { lat: 40.3495, lng: -74.6591 } },
];

/**
 * Fuzzy string matching using Levenshtein distance
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();

  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= aLower.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      if (bLower.charAt(i - 1) === aLower.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[bLower.length][aLower.length];
}

/**
 * Normalize station name for matching
 */
function normalizeStationName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:]/g, '')
    .replace(/station$/, '')
    .replace(/st\./g, 'street')
    .replace(/ave\./g, 'avenue')
    .trim();
}

/**
 * Map a timetable station name to a canonical station ID
 * Uses fuzzy matching with fallback
 */
export function mapStationName(
  timetableName: string,
  lineId?: string
): { id: string; name: string; position: Position } | null {
  const normalized = normalizeStationName(timetableName);

  // Exact match first
  for (const station of STATION_DATABASE) {
    if (normalizeStationName(station.name) === normalized) {
      return {
        id: station.id,
        name: station.name,
        position: station.position,
      };
    }

    // Check aliases
    if (station.aliases) {
      for (const alias of station.aliases) {
        if (normalizeStationName(alias) === normalized) {
          return {
            id: station.id,
            name: station.name,
            position: station.position,
          };
        }
      }
    }
  }

  // Fuzzy match with threshold
  let bestMatch: { station: StationData; distance: number } | null = null;
  const threshold = Math.min(3, Math.floor(timetableName.length * 0.3)); // Adaptive threshold

  for (const station of STATION_DATABASE) {
    const distance = levenshteinDistance(normalized, normalizeStationName(station.name));
    if (distance <= threshold) {
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { station, distance };
      }
    }

    // Check aliases
    if (station.aliases) {
      for (const alias of station.aliases) {
        const aliasDistance = levenshteinDistance(normalized, normalizeStationName(alias));
        if (aliasDistance <= threshold) {
          if (!bestMatch || aliasDistance < bestMatch.distance) {
            bestMatch = { station, distance: aliasDistance };
          }
        }
      }
    }
  }

  if (bestMatch && bestMatch.distance <= threshold) {
    return {
      id: bestMatch.station.id,
      name: bestMatch.station.name,
      position: bestMatch.station.position,
    };
  }

  // No match found - fail closed
  console.warn(`[Station Mapping] Could not map station: "${timetableName}" (line: ${lineId || 'unknown'})`);
  return null;
}

/**
 * Get all stations for a given line (for geometry interpolation)
 */
export function getLineStations(lineId: string): Array<{ id: string; name: string; position: Position }> {
  // Map line ID to known stations (from TransitLines.tsx)
  const lineStationNames: Record<string, string[]> = {
    'Northeast Corridor': ['New York Penn Station', 'Secaucus Junction', 'Newark Penn Station', 'Newark Airport', 'Trenton'],
    'North Jersey Coast': ['New York Penn Station', 'Secaucus Junction', 'Newark Penn Station', 'Long Branch', 'Bay Head'],
    'Morris & Essex': ['Hoboken', 'Secaucus Junction', 'Newark Broad St', 'Summit', 'Morristown'],
    'Montclair-Boonton': ['Hoboken', 'Newark Broad St', 'Montclair State University', 'Boonton'],
    'Main/Bergen': ['Hoboken', 'Secaucus Junction', 'Ridgewood', 'Suffern'],
    'Pascack Valley': ['Hoboken', 'Secaucus Junction', 'Woodcliff Lake', 'Spring Valley'],
    'Raritan Valley': ['Newark Penn Station', 'Roselle Park', 'Westfield', 'Plainfield', 'High Bridge'],
    'Atlantic City': ['Philadelphia 30th Street', 'Cherry Hill', 'Atlantic City'],
    'Gladstone Branch': ['Newark Broad St', 'Summit', 'Bernardsville', 'Gladstone'],
    'Princeton Branch': ['Princeton Junction', 'Princeton'],
  };

  const stationNames = lineStationNames[lineId] || [];
  const stations: Array<{ id: string; name: string; position: Position }> = [];

  for (const stationName of stationNames) {
    const mapped = mapStationName(stationName);
    if (mapped) {
      stations.push(mapped);
    }
  }

  return stations;
}

/**
 * Interpolate position between two stations
 */
export function interpolatePosition(
  fromStation: { position: Position },
  toStation: { position: Position },
  progress: number
): Position {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  return {
    lat: fromStation.position.lat + (toStation.position.lat - fromStation.position.lat) * clampedProgress,
    lng: fromStation.position.lng + (toStation.position.lng - fromStation.position.lng) * clampedProgress,
  };
}


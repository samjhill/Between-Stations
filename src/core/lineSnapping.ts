/**
 * Line Snapping Utilities
 * 
 * Snaps train positions to their corresponding line geometry,
 * accounting for corridor offsets applied to lines.
 */

import type L from 'leaflet';
import { LINE_COLORS } from '../config/lineColors';
import {
  detectCorridorsFromLines,
  applyCorridorOffsets,
} from './corridorStacking';

// Station data for all NJ Transit lines - matches TransitLines.tsx
const SAMPLE_LINES = {
  'Northeast Corridor': {
    stations: [
      { name: 'New York Penn Station', lat: 40.7506, lng: -73.9935 },
      { name: 'Secaucus Junction', lat: 40.7589, lng: -74.0771 },
      { name: 'Newark Penn Station', lat: 40.7347, lng: -74.1642 },
      { name: 'Newark Airport', lat: 40.6895, lng: -74.1745 },
      { name: 'Trenton', lat: 40.2176, lng: -74.7425 },
    ],
  },
  'North Jersey Coast': {
    stations: [
      { name: 'New York Penn Station', lat: 40.7506, lng: -73.9935 },
      { name: 'Secaucus Junction', lat: 40.7589, lng: -74.0771 },
      { name: 'Newark Penn Station', lat: 40.7347, lng: -74.1642 },
      { name: 'Long Branch', lat: 40.3043, lng: -73.9924 },
      { name: 'Bay Head', lat: 40.0715, lng: -74.0460 },
    ],
  },
  'Morris & Essex': {
    stations: [
      { name: 'Hoboken', lat: 40.7380, lng: -74.0307 },
      { name: 'Secaucus Junction', lat: 40.7589, lng: -74.0771 },
      { name: 'Newark Broad St', lat: 40.7323, lng: -74.1705 },
      { name: 'Summit', lat: 40.7170, lng: -74.3595 },
      { name: 'Morristown', lat: 40.7970, lng: -74.4813 },
    ],
  },
  'Montclair-Boonton': {
    stations: [
      { name: 'Hoboken', lat: 40.7380, lng: -74.0307 },
      { name: 'Newark Broad St', lat: 40.7323, lng: -74.1705 },
      { name: 'Montclair State University', lat: 40.8667, lng: -74.1975 },
      { name: 'Boonton', lat: 40.9023, lng: -74.4079 },
    ],
  },
  'Main/Bergen': {
    stations: [
      { name: 'Hoboken', lat: 40.7380, lng: -74.0307 },
      { name: 'Secaucus Junction', lat: 40.7589, lng: -74.0771 },
      { name: 'Ridgewood', lat: 40.9793, lng: -74.1168 },
      { name: 'Suffern', lat: 41.1148, lng: -74.1496 },
    ],
  },
  'Pascack Valley': {
    stations: [
      { name: 'Hoboken', lat: 40.7380, lng: -74.0307 },
      { name: 'Secaucus Junction', lat: 40.7589, lng: -74.0771 },
      { name: 'Woodcliff Lake', lat: 41.0234, lng: -74.0640 },
      { name: 'Spring Valley', lat: 41.1148, lng: -74.0448 },
    ],
  },
  'Raritan Valley': {
    stations: [
      { name: 'Newark Penn Station', lat: 40.7347, lng: -74.1642 },
      { name: 'Roselle Park', lat: 40.6650, lng: -74.2593 },
      { name: 'Westfield', lat: 40.6520, lng: -74.3473 },
      { name: 'Plainfield', lat: 40.6178, lng: -74.4187 },
      { name: 'High Bridge', lat: 40.6682, lng: -74.8959 },
    ],
  },
  'Atlantic City': {
    stations: [
      { name: 'Philadelphia 30th Street', lat: 39.9558, lng: -75.1821 },
      { name: 'Cherry Hill', lat: 39.9348, lng: -75.0306 },
      { name: 'Atlantic City', lat: 39.3643, lng: -74.4229 },
    ],
  },
  'Gladstone Branch': {
    stations: [
      { name: 'Newark Broad St', lat: 40.7323, lng: -74.1705 },
      { name: 'Summit', lat: 40.7170, lng: -74.3595 },
      { name: 'Bernardsville', lat: 40.7188, lng: -74.5699 },
      { name: 'Gladstone', lat: 40.7553, lng: -74.6624 },
    ],
  },
  'Princeton Branch': {
    stations: [
      { name: 'Princeton Junction', lat: 40.3171, lng: -74.6235 },
      { name: 'Princeton', lat: 40.3495, lng: -74.6591 },
    ],
  },
};

/**
 * Calculate distance between two points (simplified for small distances)
 */
function distance(p1: [number, number], p2: [number, number]): number {
  const dLat = p2[0] - p1[0];
  const dLng = p2[1] - p1[1];
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Find the closest point on a line segment to a given point
 * Returns the closest point and its distance
 */
function closestPointOnSegment(
  point: [number, number],
  segStart: [number, number],
  segEnd: [number, number]
): { point: [number, number]; distance: number; t: number } {
  const dx = segEnd[0] - segStart[0];
  const dy = segEnd[1] - segStart[1];
  const length2 = dx * dx + dy * dy;

  if (length2 < 1e-10) {
    // Segment is a point
    const dist = distance(point, segStart);
    return { point: segStart, distance: dist, t: 0 };
  }

  // Calculate t (parameter along segment: 0 = start, 1 = end)
  const t = Math.max(0, Math.min(1, 
    ((point[0] - segStart[0]) * dx + (point[1] - segStart[1]) * dy) / length2
  ));

  // Calculate closest point on segment
  const closest: [number, number] = [
    segStart[0] + t * dx,
    segStart[1] + t * dy,
  ];

  const dist = distance(point, closest);
  return { point: closest, distance: dist, t };
}

/**
 * Find the closest point on a polyline to a given point
 * Returns the closest point and the segment index
 */
function closestPointOnPolyline(
  point: [number, number],
  polyline: [number, number][]
): { point: [number, number]; segmentIndex: number; t: number } {
  if (polyline.length === 0) return { point, segmentIndex: 0, t: 0 };
  if (polyline.length === 1) return { point: polyline[0], segmentIndex: 0, t: 0 };

  let minDistance = Infinity;
  let closestPoint: [number, number] = polyline[0];
  let closestSegmentIndex = 0;
  let closestT = 0;

  // Check each segment
  for (let i = 0; i < polyline.length - 1; i++) {
    const result = closestPointOnSegment(point, polyline[i], polyline[i + 1]);
    if (result.distance < minDistance) {
      minDistance = result.distance;
      closestPoint = result.point;
      closestSegmentIndex = i;
      closestT = result.t;
    }
  }

  return { point: closestPoint, segmentIndex: closestSegmentIndex, t: closestT };
}

/**
 * Get line geometry with corridor offsets applied
 */
function getLineGeometryWithOffsets(
  lineName: string,
  map: L.Map,
  corridors: ReturnType<typeof detectCorridorsFromLines>
): [number, number][] | null {
  const lineData = SAMPLE_LINES[lineName as keyof typeof SAMPLE_LINES];
  if (!lineData) return null;

  const stations = lineData.stations.map(s => [s.lat, s.lng] as [number, number]);
  
  // Apply corridor offsets (same logic as TransitLines)
  const offsetStations = applyCorridorOffsets(lineName, stations, corridors, map);
  
  return offsetStations;
}

/**
 * Cache for corridor detection (since it doesn't depend on map state)
 */
let cachedCorridors: ReturnType<typeof detectCorridorsFromLines> | null = null;
let cachedBaseLines: Array<{ name: string; stations: [number, number][] }> | null = null;

/**
 * Get or compute corridors
 */
function getCorridors(): ReturnType<typeof detectCorridorsFromLines> {
  if (cachedCorridors && cachedBaseLines) {
    return cachedCorridors;
  }

  // Build base lines
  const allLines = Object.keys(LINE_COLORS);
  const baseLines = allLines
    .filter(lineName => SAMPLE_LINES[lineName as keyof typeof SAMPLE_LINES])
    .map((lineName) => {
      const lineData = SAMPLE_LINES[lineName as keyof typeof SAMPLE_LINES];
      return {
        name: lineName,
        stations: lineData.stations.map(s => [s.lat, s.lng] as [number, number]),
      };
    });

  cachedBaseLines = baseLines;
  cachedCorridors = detectCorridorsFromLines(baseLines);
  return cachedCorridors;
}

/**
 * Calculate bearing (angle in degrees) from point1 to point2
 * Returns angle in degrees, where 0 is north, 90 is east, etc.
 */
function calculateBearing(
  point1: [number, number],
  point2: [number, number]
): number {
  const lat1 = point1[0] * Math.PI / 180;
  const lat2 = point2[0] * Math.PI / 180;
  const dLng = (point2[1] - point1[1]) * Math.PI / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const bearing = Math.atan2(y, x);
  // Convert to degrees and normalize to 0-360
  return (bearing * 180 / Math.PI + 360) % 360;
}

/**
 * Snap a train position to its line's geometry (with corridor offsets)
 * 
 * @param lineName The name of the line
 * @param rawPosition The raw position from the inference system
 * @param map The Leaflet map instance
 * @returns The snapped position on the line, or original position if line not found
 */
export function snapTrainToLine(
  lineName: string,
  rawPosition: { lat: number; lng: number },
  map: L.Map
): { lat: number; lng: number } {
  const corridors = getCorridors();
  const lineGeometry = getLineGeometryWithOffsets(lineName, map, corridors);

  if (!lineGeometry || lineGeometry.length < 2) {
    // Line not found or invalid, return original position
    return rawPosition;
  }

  const point: [number, number] = [rawPosition.lat, rawPosition.lng];
  const snapped = closestPointOnPolyline(point, lineGeometry);

  return { lat: snapped.point[0], lng: snapped.point[1] };
}

/**
 * Get the direction angle (in degrees) for a train based on its position and direction
 * 
 * @param lineName The name of the line
 * @param position The train's position
 * @param trainDirection The train's direction string (e.g., "TO NY", "OUTBOUND")
 * @param map The Leaflet map instance
 * @returns The angle in degrees (0-360), or null if cannot be determined
 */
export function getTrainDirectionAngle(
  lineName: string,
  position: { lat: number; lng: number },
  trainDirection: string,
  map: L.Map
): number | null {
  const corridors = getCorridors();
  const lineGeometry = getLineGeometryWithOffsets(lineName, map, corridors);

  if (!lineGeometry || lineGeometry.length < 2) {
    return null;
  }

  const point: [number, number] = [position.lat, position.lng];
  const result = closestPointOnPolyline(point, lineGeometry);
  
  const segmentIndex = result.segmentIndex;
  const segmentStart = lineGeometry[segmentIndex];
  const segmentEnd = lineGeometry[segmentIndex + 1];
  
  // Determine direction along the line based on train direction
  // For NJ Transit, "TO NY" typically means towards the first station (NY Penn)
  // "OUTBOUND" means away from NY towards the end stations
  const lineData = SAMPLE_LINES[lineName as keyof typeof SAMPLE_LINES];
  if (!lineData) return null;
  
  const firstStation = lineData.stations[0];
  const lastStation = lineData.stations[lineData.stations.length - 1];
  
  // Calculate distance from segment start to first and last stations
  const distToFirstFromStart = distance([firstStation.lat, firstStation.lng], segmentStart);
  const distToLastFromStart = distance([lastStation.lat, lastStation.lng], segmentStart);
  const distToFirstFromEnd = distance([firstStation.lat, firstStation.lng], segmentEnd);
  const distToLastFromEnd = distance([lastStation.lat, lastStation.lng], segmentEnd);
  
  // Determine which direction along the segment the train is heading
  let isHeadingTowardsEnd: boolean;
  
  if (trainDirection.includes('NY') || trainDirection.includes('TO NY') || trainDirection.includes('INBOUND')) {
    // Heading towards NY (first station)
    isHeadingTowardsEnd = distToFirstFromEnd < distToFirstFromStart;
  } else {
    // Heading outbound (towards last station)
    isHeadingTowardsEnd = distToLastFromEnd < distToLastFromStart;
  }
  
  // Calculate bearing
  if (isHeadingTowardsEnd) {
    return calculateBearing(segmentStart, segmentEnd);
  } else {
    return calculateBearing(segmentEnd, segmentStart);
  }
}


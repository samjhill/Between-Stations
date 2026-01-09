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
import { getRouteCoordinates, TRAIN_ROUTES } from '../config/trainRoutes';

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
 * Uses official route coordinates from trainRoutes.ts
 */
function getLineGeometryWithOffsets(
  lineName: string,
  map: L.Map,
  corridors: ReturnType<typeof detectCorridorsFromLines>
): [number, number][] | null {
  // Get official route coordinates
  const stations = getRouteCoordinates(lineName);
  if (stations.length === 0) return null;
  
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
 * Uses official route coordinates from trainRoutes.ts
 */
function getCorridors(): ReturnType<typeof detectCorridorsFromLines> {
  if (cachedCorridors && cachedBaseLines) {
    return cachedCorridors;
  }

  // Build base lines using official routes
  const allLines = Object.keys(LINE_COLORS);
  const baseLines = allLines
    .filter(lineName => TRAIN_ROUTES[lineName])
    .map((lineName) => {
      const route = getRouteCoordinates(lineName);
      return {
        name: lineName,
        stations: route,
      };
    })
    .filter(line => line.stations.length > 0);

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
  const route = getRouteCoordinates(lineName);
  if (route.length === 0) return null;
  
  const firstStation = route[0];
  const lastStation = route[route.length - 1];
  
  // Calculate distance from segment start to first and last stations
  const distToFirstFromStart = distance(firstStation, segmentStart);
  const distToLastFromStart = distance(lastStation, segmentStart);
  const distToFirstFromEnd = distance(firstStation, segmentEnd);
  const distToLastFromEnd = distance(lastStation, segmentEnd);
  
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


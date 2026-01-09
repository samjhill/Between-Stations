/**
 * Corridor Stacking Utilities
 * 
 * Implements parallel line stacking for shared rail corridors.
 * Lines sharing segments are rendered as parallel, offset lines
 * to prevent visual overlap.
 */

import type L from 'leaflet';

/**
 * Configuration for line stacking
 */
const STACKING_CONFIG = {
  /** Fixed spacing between parallel lines in screen pixels */
  lineSpacing: 12, // 12 pixels spacing for visible separation (accounts for 12px line width)
  /** Tolerance for detecting shared segments (in degrees, roughly) */
  segmentTolerance: 0.0005, // ~55 meters at equator - tighter tolerance for better detection
  /** Minimum segment length to consider for sharing (in degrees) */
  minSegmentLength: 0.0001,
};

/**
 * Represents a line segment
 */
interface LineSegment {
  lineName: string;
  from: [number, number]; // [lat, lng]
  to: [number, number];   // [lat, lng]
  segmentIndex: number;
}

/**
 * Represents a corridor group of lines sharing segments
 */
interface CorridorGroup {
  /** Base path geometry (centered, reference path) */
  basePath: [number, number][];
  /** Lines in this corridor with their indices */
  lines: Array<{
    name: string;
    index: number; // Stable ordering: 0, 1, 2, ...
  }>;
  /** Map of line name to segment indices where this corridor exists for that line */
  segmentIndicesByLine: Map<string, Set<number>>;
}

/**
 * Check if two points are approximately equal within tolerance
 */
function pointsEqual(
  p1: [number, number],
  p2: [number, number],
  tolerance: number = STACKING_CONFIG.segmentTolerance
): boolean {
  const dLat = Math.abs(p1[0] - p2[0]);
  const dLng = Math.abs(p1[1] - p2[1]);
  return dLat < tolerance && dLng < tolerance;
}

/**
 * Check if two segments are approximately equal (same direction or reverse)
 */
function segmentsEqual(
  seg1: { from: [number, number]; to: [number, number] },
  seg2: { from: [number, number]; to: [number, number] }
): boolean {
  const tol = STACKING_CONFIG.segmentTolerance;
  // Check forward direction
  if (
    pointsEqual(seg1.from, seg2.from, tol) &&
    pointsEqual(seg1.to, seg2.to, tol)
  ) {
    return true;
  }
  // Check reverse direction
  if (
    pointsEqual(seg1.from, seg2.to, tol) &&
    pointsEqual(seg1.to, seg2.from, tol)
  ) {
    return true;
  }
  return false;
}

/**
 * Calculate distance between two points (Haversine formula, simplified for small distances)
 */
function distance(p1: [number, number], p2: [number, number]): number {
  const dLat = p2[0] - p1[0];
  const dLng = p2[1] - p1[1];
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Extract all segments from a line's station path
 */
function extractSegments(
  lineName: string,
  stations: [number, number][]
): LineSegment[] {
  const segments: LineSegment[] = [];
  for (let i = 0; i < stations.length - 1; i++) {
    const from = stations[i];
    const to = stations[i + 1];
    const segLength = distance(from, to);
    if (segLength >= STACKING_CONFIG.minSegmentLength) {
      segments.push({
        lineName,
        from,
        to,
        segmentIndex: i,
      });
    }
  }
  return segments;
}

/**
 * Detect shared segments between multiple lines
 * Returns a map of corridor groups
 */
function detectCorridors(
  lines: Array<{ name: string; stations: [number, number][] }>
): Map<string, CorridorGroup> {
  const segmentsByLine = new Map<string, LineSegment[]>();
  const corridors = new Map<string, CorridorGroup>();

  // Extract all segments
  for (const line of lines) {
    segmentsByLine.set(line.name, extractSegments(line.name, line.stations));
  }

  // Group segments into corridors
  const processedSegments = new Set<string>();

  for (const [lineName1, segments1] of segmentsByLine) {
    for (const seg1 of segments1) {
      const segKey = `${lineName1}-${seg1.segmentIndex}`;
      if (processedSegments.has(segKey)) continue;

      // Find all lines sharing this segment
      const sharingLines: Array<{ name: string; segment: LineSegment }> = [
        { name: lineName1, segment: seg1 },
      ];

      for (const [lineName2, segments2] of segmentsByLine) {
        if (lineName1 === lineName2) continue;

        for (const seg2 of segments2) {
          if (segmentsEqual(seg1, seg2)) {
            const seg2Key = `${lineName2}-${seg2.segmentIndex}`;
            if (!processedSegments.has(seg2Key)) {
              sharingLines.push({ name: lineName2, segment: seg2 });
            }
          }
        }
      }

      // If multiple lines share this segment, create/update corridor
      if (sharingLines.length > 1) {
        // Sort lines by name for stable ordering
        sharingLines.sort((a, b) => a.name.localeCompare(b.name));

        // Create corridor key from sorted line names
        const corridorKey = sharingLines.map((l) => l.name).join('|');

        if (!corridors.has(corridorKey)) {
          // Use the first line's segment as base path
          const baseSegment = sharingLines[0].segment;
          const segmentIndicesByLine = new Map<string, Set<number>>();
          
          // Initialize segment indices for each line
          for (const { name, segment } of sharingLines) {
            segmentIndicesByLine.set(name, new Set([segment.segmentIndex]));
          }
          
          corridors.set(corridorKey, {
            basePath: [baseSegment.from, baseSegment.to],
            lines: sharingLines.map((l, idx) => ({
              name: l.name,
              index: idx,
            })),
            segmentIndicesByLine,
          });
        } else {
          // Add segment index to existing corridor for each sharing line
          const corridor = corridors.get(corridorKey)!;
          for (const { name, segment } of sharingLines) {
            if (!corridor.segmentIndicesByLine.has(name)) {
              corridor.segmentIndicesByLine.set(name, new Set());
            }
            corridor.segmentIndicesByLine.get(name)!.add(segment.segmentIndex);
          }
        }

        // Mark all segments as processed
        for (const { name, segment } of sharingLines) {
          processedSegments.add(`${name}-${segment.segmentIndex}`);
        }
      }
    }
  }

  return corridors;
}

/**
 * Compute perpendicular offset for a point along a path segment
 * Uses screen pixel coordinates for accurate visual offsetting
 * 
 * @param point The point to offset [lat, lng]
 * @param from Start of the segment [lat, lng]
 * @param to End of the segment [lat, lng]
 * @param offsetPixels Offset in screen pixels (positive = right side, negative = left)
 * @param map Leaflet map instance for coordinate conversion
 */
function computePerpendicularOffset(
  point: [number, number],
  from: [number, number],
  to: [number, number],
  offsetPixels: number,
  map: L.Map
): [number, number] {
  // Convert lat/lng to screen pixel coordinates
  const fromPoint = map.latLngToContainerPoint([from[0], from[1]]);
  const toPoint = map.latLngToContainerPoint([to[0], to[1]]);
  const pointPoint = map.latLngToContainerPoint([point[0], point[1]]);

  // Calculate direction vector in screen space
  const dx = toPoint.x - fromPoint.x;
  const dy = toPoint.y - fromPoint.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length < 0.1) {
    // Segment too short, return original point
    return point;
  }

  // Normalize direction vector
  const ux = dx / length;
  const uy = dy / length;

  // Perpendicular vector (rotate 90 degrees counterclockwise)
  const perpX = -uy * offsetPixels;
  const perpY = ux * offsetPixels;

  // Apply offset in screen space
  const offsetX = pointPoint.x + perpX;
  const offsetY = pointPoint.y + perpY;

  // Convert back to lat/lng
  const offsetLatLng = map.containerPointToLatLng([offsetX, offsetY]);

  return [offsetLatLng.lat, offsetLatLng.lng];
}

/**
 * Check if a point is part of a shared corridor segment
 */
function isInCorridor(
  lineName: string,
  segmentIndex: number,
  corridors: Map<string, CorridorGroup>
): { corridorKey: string; lineIndex: number } | null {
  for (const [corridorKey, corridor] of corridors) {
    const lineInfo = corridor.lines.find((l) => l.name === lineName);
    const segmentIndices = corridor.segmentIndicesByLine.get(lineName);
    if (lineInfo && segmentIndices && segmentIndices.has(segmentIndex)) {
      return {
        corridorKey,
        lineIndex: lineInfo.index,
      };
    }
  }
  return null;
}

/**
 * Apply offsets to a line's path based on corridor stacking
 * Processes the entire line and applies offsets where segments are shared
 * 
 * @param lineName Name of the line
 * @param stations Original station coordinates
 * @param corridors Detected corridor groups
 * @param map Leaflet map instance for coordinate conversion
 */
export function applyCorridorOffsets(
  lineName: string,
  stations: [number, number][],
  corridors: Map<string, CorridorGroup>,
  map: L.Map
): [number, number][] {
  if (stations.length < 2) return stations;

  const offsetStations: [number, number][] = [];
  const N = stations.length;

  // Track which segments are in corridors and their offsets
  const segmentOffsets: Map<number, number> = new Map();

  // First pass: identify all corridor segments and their offsets
  for (let i = 0; i < N - 1; i++) {
    const corridorInfo = isInCorridor(lineName, i, corridors);
    if (corridorInfo) {
      const corridor = corridors.get(corridorInfo.corridorKey)!;
      const lineIndex = corridorInfo.lineIndex;
      const numLines = corridor.lines.length;

      // Calculate offset: center the stack around zero
      // Line 0 gets negative offset, line N-1 gets positive
      const offset = (lineIndex - (numLines - 1) / 2) * STACKING_CONFIG.lineSpacing;
      segmentOffsets.set(i, offset);
    }
  }

  // Second pass: apply offsets using actual segment geometry
  for (let i = 0; i < N; i++) {
    const current = stations[i];
    let appliedOffset: number | null = null;
    let segmentFrom: [number, number] | null = null;
    let segmentTo: [number, number] | null = null;

    // Determine which offset to use and which segment to base it on
    if (i < N - 1 && segmentOffsets.has(i)) {
      // Current segment (i -> i+1) is in a corridor
      appliedOffset = segmentOffsets.get(i)!;
      segmentFrom = stations[i];
      segmentTo = stations[i + 1];
    } else if (i > 0 && segmentOffsets.has(i - 1)) {
      // Previous segment (i-1 -> i) was in a corridor
      // Use same offset for continuity at the endpoint
      appliedOffset = segmentOffsets.get(i - 1)!;
      segmentFrom = stations[i - 1];
      segmentTo = stations[i];
    }

      if (appliedOffset !== null && segmentFrom && segmentTo) {
        // Apply perpendicular offset using the segment geometry
        const offsetPoint = computePerpendicularOffset(
          current,
          segmentFrom,
          segmentTo,
          appliedOffset,
          map
        );
        offsetStations.push(offsetPoint);
    } else {
      // No offset needed, use original point
      offsetStations.push(current);
    }
  }

  return offsetStations;
}

/**
 * Main function to process lines and detect corridors
 */
export function detectCorridorsFromLines(
  lines: Array<{ name: string; stations: [number, number][] }>
): Map<string, CorridorGroup> {
  return detectCorridors(lines);
}

/**
 * Get the line spacing configuration
 */
export function getLineSpacing(): number {
  return STACKING_CONFIG.lineSpacing;
}

/**
 * Set the line spacing (useful for zoom-based adjustments)
 */
export function setLineSpacing(spacing: number): void {
  STACKING_CONFIG.lineSpacing = spacing;
}


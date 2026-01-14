import { useMemo, memo, useState } from 'react';
import { Polyline, useMapEvents } from 'react-leaflet';
import { getLineColor, LINE_COLORS } from '../config/lineColors';
import type { FilterState } from '../types/ui';
import { getRouteCoordinates } from '../config/trainRoutes';
import type { LeafletMouseEvent, PolylineOptions } from 'leaflet';
import { applyCorridorOffsets, detectCorridorsFromLines } from '../core/corridorStacking';

interface TransitLinesProps {
  filterState?: FilterState;
  onLineClick?: (lineId: string, clickLatLng: { lat: number; lng: number }) => void;
}

/**
 * TransitLines component - renders one smooth line per train route from start to end
 * Uses official NJ Transit route sequences
 */
function TransitLines({ filterState, onLineClick }: TransitLinesProps) {
  const [mapTick, setMapTick] = useState(0);
  const map = useMapEvents({
    moveend: () => setMapTick((t) => t + 1),
    zoomend: () => setMapTick((t) => t + 1),
    resize: () => setMapTick((t) => t + 1),
  });

  // Get all lines from LINE_COLORS
  const allLines = Object.keys(LINE_COLORS);
  
  // Filter lines based on filterState
  const visibleLines = filterState?.lines && filterState.lines.length > 0
    ? allLines.filter(line => filterState.lines.includes(line))
    : allLines;

  // Detect shared corridors once from the official, un-offset routes (map-independent).
  const corridors = useMemo(() => {
    const baseLines = allLines
      .map((lineName) => ({ name: lineName, stations: getRouteCoordinates(lineName) }))
      .filter((l) => l.stations.length > 0);
    return detectCorridorsFromLines(baseLines);
  }, [allLines]);

  // Build line data using official routes
  const linesToRender = useMemo(() => {
    // Dependency used to recompute offsets on pan/zoom (screen-pixel spacing).
    void mapTick;

    return visibleLines
      .map((lineName) => {
        const route = getRouteCoordinates(lineName);
        if (route.length === 0) {
          return null;
        }
        return {
          name: lineName,
          // Spread overlapping corridor segments into parallel lines (transit-map style).
          // Recomputed on pan/zoom so spacing stays constant in screen pixels.
          stations: applyCorridorOffsets(lineName, route, corridors, map),
          color: getLineColor(lineName),
        };
      })
      .filter((line): line is NonNullable<typeof line> => line !== null);
  }, [visibleLines, corridors, map, mapTick]);

  return (
    <>
      {linesToRender.map((line, idx) => (
        <Polyline
          key={`line-${idx}-${line.name}`}
          positions={line.stations}
          pathOptions={
            {
            color: line.color,
            weight: 12,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
            smoothFactor: 1.0, // No smoothing - use exact points
            } as PolylineOptions
          }
          eventHandlers={{
            click: (e: LeafletMouseEvent) => {
              // Prevent clicks from bubbling to the map container
              e.originalEvent?.stopPropagation();
              // Polyline click includes map lat/lng
              // (kept serializable so callers don't need Leaflet types)
              const latlng = e.latlng;
              onLineClick?.(line.name, { lat: latlng.lat, lng: latlng.lng });
            },
          }}
        />
      ))}
    </>
  );
}

export default memo(TransitLines);

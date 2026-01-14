import { useMemo, memo } from 'react';
import { Polyline } from 'react-leaflet';
import { getLineColor, LINE_COLORS } from '../config/lineColors';
import type { FilterState } from '../types/ui';
import { getRouteCoordinates } from '../config/trainRoutes';
import type { LeafletMouseEvent, PolylineOptions } from 'leaflet';

interface TransitLinesProps {
  filterState?: FilterState;
  onLineClick?: (lineId: string, clickLatLng: { lat: number; lng: number }) => void;
}

/**
 * TransitLines component - renders one smooth line per train route from start to end
 * Uses official NJ Transit route sequences
 */
function TransitLines({ filterState, onLineClick }: TransitLinesProps) {
  // Get all lines from LINE_COLORS
  const allLines = Object.keys(LINE_COLORS);
  
  // Filter lines based on filterState
  const visibleLines = filterState?.lines && filterState.lines.length > 0
    ? allLines.filter(line => filterState.lines.includes(line))
    : allLines;

  // Build line data using official routes
  const linesToRender = useMemo(() => {
    return visibleLines
      .map((lineName) => {
        const route = getRouteCoordinates(lineName);
        if (route.length === 0) {
          return null;
        }
        return {
          name: lineName,
          stations: route,
          color: getLineColor(lineName),
        };
      })
      .filter((line): line is NonNullable<typeof line> => line !== null);
  }, [visibleLines]);

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

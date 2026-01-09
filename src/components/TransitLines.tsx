import { useMemo } from 'react';
import { useMap } from 'react-leaflet';
import { Polyline } from 'react-leaflet';
import { getLineColor, LINE_COLORS } from '../config/lineColors';
import type { FilterState } from '../types/ui';
import { getRouteCoordinates } from '../config/trainRoutes';

interface TransitLinesProps {
  filterState?: FilterState;
}

/**
 * TransitLines component - renders one smooth line per train route from start to end
 * Uses official NJ Transit route sequences
 */
export default function TransitLines({ filterState }: TransitLinesProps) {
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
          pathOptions={{
            color: line.color,
            weight: 12,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
            smoothFactor: 1.0, // No smoothing - use exact points
          }}
        />
      ))}
    </>
  );
}

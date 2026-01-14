import { memo } from 'react';
import { Polyline } from 'react-leaflet';
import type { FilterState } from '../types/ui';
import type { LeafletMouseEvent, PolylineOptions } from 'leaflet';

interface TransitLinesProps {
  filterState?: FilterState;
  onLineClick?: (lineId: string, clickLatLng: { lat: number; lng: number }) => void;
  linesToRender: Array<{
    name: string;
    stations: [number, number][];
    color: string;
  }>;
}

/**
 * TransitLines component - renders one smooth line per train route from start to end
 * Uses official NJ Transit route sequences
 */
function TransitLines({ filterState, onLineClick, linesToRender }: TransitLinesProps) {
  // Keep prop for backwards compatibility / future use; not needed for rendering now.
  void filterState;

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

import { useMemo, useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import { Polyline } from 'react-leaflet';
import { getLineColor, LINE_COLORS } from '../config/lineColors';
import type { FilterState } from '../types/ui';
import {
  detectCorridorsFromLines,
  applyCorridorOffsets,
} from '../core/corridorStacking';

// Station data for all NJ Transit lines - in production this would come from a data provider
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

interface TransitLinesProps {
  filterState?: FilterState;
}

/**
 * TransitLines component - renders MiniMetro-style thick rounded lines between stations
 * Respects filter state to show/hide lines
 */
export default function TransitLines({ filterState }: TransitLinesProps) {
  const map = useMap();
  const [mapView, setMapView] = useState({ center: map.getCenter(), zoom: map.getZoom() });

  // Update map view state when map moves or zooms (needed for pixel-based offsets)
  useEffect(() => {
    const updateView = () => {
      setMapView({ center: map.getCenter(), zoom: map.getZoom() });
    };

    map.on('move', updateView);
    map.on('zoom', updateView);
    map.on('viewreset', updateView);

    return () => {
      map.off('move', updateView);
      map.off('zoom', updateView);
      map.off('viewreset', updateView);
    };
  }, [map]);

  // Get all lines from LINE_COLORS to ensure all are represented
  const allLines = Object.keys(LINE_COLORS);
  
  // Filter lines based on filterState
  // If filterState.lines is empty, show all lines
  // Otherwise, only show lines that are in filterState.lines
  const visibleLines = filterState?.lines && filterState.lines.length > 0
    ? allLines.filter(line => filterState.lines.includes(line))
    : allLines;

  // Get line data from SAMPLE_LINES for visible lines
  const baseLines = useMemo(() => {
    return visibleLines
      .filter(lineName => SAMPLE_LINES[lineName as keyof typeof SAMPLE_LINES])
      .map((lineName) => {
        const lineData = SAMPLE_LINES[lineName as keyof typeof SAMPLE_LINES];
        return {
          name: lineName,
          stations: lineData.stations.map(s => [s.lat, s.lng] as [number, number]),
          color: getLineColor(lineName),
        };
      });
  }, [visibleLines]);

  // Detect corridors (shared segments)
  const corridors = useMemo(() => {
    const detected = detectCorridorsFromLines(baseLines);
    // Debug: log detected corridors
    if (detected.size > 0) {
      console.log('Detected corridors:', Array.from(detected.entries()).map(([key, corridor]) => ({
        key,
        lines: corridor.lines.map(l => l.name),
        segmentIndices: Array.from(corridor.segmentIndicesByLine.entries()).map(([name, indices]) => ({
          line: name,
          segments: Array.from(indices)
        }))
      })));
    }
    return detected;
  }, [baseLines]);

  // Apply offsets to lines that are in corridors
  // Recalculate when map view changes (zoom/pan) since offsets are pixel-based
  const linesWithOffsets = useMemo(() => {
    return baseLines.map((line) => {
      // Check if this line has any segments in corridors
      const hasCorridorSegment = Array.from(corridors.values()).some((corridor) =>
        corridor.lines.some((l) => l.name === line.name)
      );

      if (hasCorridorSegment) {
        // Apply corridor offsets using map instance for pixel-based calculation
        const offsetStations = applyCorridorOffsets(
          line.name,
          line.stations,
          corridors,
          map
        );
        console.log(`Applied offsets to ${line.name}:`, {
          original: line.stations.length,
          offset: offsetStations.length,
          changed: JSON.stringify(line.stations) !== JSON.stringify(offsetStations)
        });
        return {
          ...line,
          stations: offsetStations,
        };
      }

      // No offset needed
      return line;
    });
  }, [baseLines, corridors, map, mapView.center.lat, mapView.center.lng, mapView.zoom]);

  return (
    <>
      {linesWithOffsets.map((line, idx) => (
        <Polyline
          key={`line-${idx}-${line.name}`}
          positions={line.stations}
          pathOptions={{
            color: line.color,
            weight: 12, // Thick stroke for MiniMetro style
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      ))}
    </>
  );
}


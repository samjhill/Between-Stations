import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { MAJOR_STATIONS } from '../config/lineColors';

// Complete station data for all NJ Transit lines - matches TransitLines.tsx
// This ensures all stations shown on lines are also rendered as markers
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

interface Station {
  name: string;
  lat: number;
  lng: number;
  isMajor: boolean;
}

/**
 * StationsLayer component - renders MiniMetro-style station markers
 * - Minor stations: small white circles with dark outline
 * - Major stations: larger circles or rings with dark outline
 */
export default function StationsLayer() {
  const map = useMap();
  const [zoom, setZoom] = useState(10);

  // Track zoom level for label visibility
  useEffect(() => {
    const updateZoom = () => {
      setZoom(map.getZoom());
    };
    map.on('zoomend', updateZoom);
    updateZoom();
    return () => {
      map.off('zoomend', updateZoom);
    };
  }, [map]);

  // Collect all unique stations
  const stations = useMemo(() => {
    const stationMap = new Map<string, Station>();
    
    Object.values(SAMPLE_LINES).forEach(lineData => {
      lineData.stations.forEach(station => {
        if (!stationMap.has(station.name)) {
          stationMap.set(station.name, {
            ...station,
            isMajor: MAJOR_STATIONS.has(station.name),
          });
        }
      });
    });

    return Array.from(stationMap.values());
  }, []);

  // Show labels when zoomed in (zoom >= 10)
  const showLabels = zoom >= 10;

  return (
    <>
      {stations.map((station) => {
        // Major stations: larger radius, more prominent
        // Minor stations: smaller radius, subtle
        const radius = station.isMajor ? 10 : 4;
        const stationElements = [];
        
        // Double ring for major stations (outer ring) - more prominent
        if (station.isMajor) {
          stationElements.push(
            <CircleMarker
              key={`station-ring-outer-${station.name}`}
              center={[station.lat, station.lng]}
              radius={radius + 5}
              pathOptions={{
                fillColor: 'transparent',
                fillOpacity: 0,
                color: '#2C3E50',
                weight: 2.5,
                opacity: 0.5,
                dashArray: '4, 4',
              }}
            />
          );
          // Inner ring for major stations
          stationElements.push(
            <CircleMarker
              key={`station-ring-inner-${station.name}`}
              center={[station.lat, station.lng]}
              radius={radius + 2}
              pathOptions={{
                fillColor: 'transparent',
                fillOpacity: 0,
                color: '#2C3E50',
                weight: 2,
                opacity: 0.7,
                dashArray: '3, 3',
              }}
            />
          );
        }
        
        // Main station marker
        stationElements.push(
          <CircleMarker
            key={`station-${station.name}`}
            center={[station.lat, station.lng]}
            radius={radius}
            pathOptions={{
              fillColor: station.isMajor ? '#FFFFFF' : '#FFFFFF',
              fillOpacity: 1,
              color: '#2C3E50',
              weight: station.isMajor ? 3.5 : 1.5,
              opacity: 1,
            }}
          >
            {showLabels && (
              <Tooltip
                permanent
                direction="right"
                offset={[station.isMajor ? 12 : 6, 0]}
                className="station-label-tooltip"
                opacity={1}
              >
                <span
                  style={{
                    fontSize: station.isMajor ? '12px' : '10px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontWeight: station.isMajor ? '700' : '400',
                    color: '#2C3E50',
                    whiteSpace: 'nowrap',
                    textShadow: station.isMajor 
                      ? '0 1px 3px rgba(255, 255, 255, 0.9), 0 0 2px rgba(255, 255, 255, 0.8)' 
                      : '0 1px 2px rgba(255, 255, 255, 0.8)',
                  }}
                >
                  {station.name}
                </span>
              </Tooltip>
            )}
          </CircleMarker>
        );
        
        return stationElements;
      }).flat()}
    </>
  );
}


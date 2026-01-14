import { useEffect, useMemo, useState, memo } from 'react';
import { CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { MAJOR_STATIONS } from '../config/lineColors';
import { STATION_DATABASE } from '../core/stationMapping';

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
function StationsLayer() {
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

  // Collect all unique stations from the station database
  // This shows all stations that are mapped and available in the system
  const stations = useMemo(() => {
    const stationMap = new Map<string, Station>();
    
    // Use all stations from the station database
    STATION_DATABASE.forEach(stationData => {
      if (!stationMap.has(stationData.name)) {
        stationMap.set(stationData.name, {
          name: stationData.name,
          lat: stationData.position.lat,
          lng: stationData.position.lng,
          isMajor: MAJOR_STATIONS.has(stationData.name),
        });
      }
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
                color: 'var(--map-stroke)',
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
                color: 'var(--map-stroke)',
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
              color: 'var(--map-stroke)',
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
                    color: 'var(--map-label)',
                    whiteSpace: 'nowrap',
                    textShadow: station.isMajor 
                      ? '0 1px 3px rgba(0, 0, 0, 0.85), 0 0 2px rgba(0, 0, 0, 0.75)' 
                      : '0 1px 2px rgba(0, 0, 0, 0.75)',
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

export default memo(StationsLayer);


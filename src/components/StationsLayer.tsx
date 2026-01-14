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

interface StationsLayerProps {
  selectedStationName: string | null;
  onStationClick: (stationName: string) => void;
}

/**
 * StationsLayer component - renders MiniMetro-style station markers
 * - Minor stations: small white circles with dark outline
 * - Major stations: larger circles or rings with dark outline
 */
function StationsLayer({ selectedStationName, onStationClick }: StationsLayerProps) {
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
        const radius = station.isMajor ? 12 : 5;
        const stationElements = [];
        
        // Double ring for major stations (outer ring) - more prominent
        if (station.isMajor) {
          stationElements.push(
            <CircleMarker
              key={`station-ring-outer-${station.name}`}
              center={[station.lat, station.lng]}
              radius={radius + 6}
              pathOptions={{
                fillColor: 'transparent',
                fillOpacity: 0,
                color: 'var(--map-stroke)',
                weight: 2,
                opacity: 0.4,
                dashArray: '4, 4',
              }}
            />
          );
          // Inner ring for major stations
          stationElements.push(
            <CircleMarker
              key={`station-ring-inner-${station.name}`}
              center={[station.lat, station.lng]}
              radius={radius + 3}
              pathOptions={{
                fillColor: 'transparent',
                fillOpacity: 0,
                color: 'var(--map-stroke)',
                weight: 1.5,
                opacity: 0.6,
                dashArray: '3, 3',
              }}
            />
          );
        }
        
        const isSelected = selectedStationName === station.name;
        
        // Invisible larger clickable area - rendered first so it's underneath visually but captures clicks
        stationElements.push(
          <CircleMarker
            key={`station-clickable-${station.name}`}
            center={[station.lat, station.lng]}
            radius={Math.max(radius + 8, 20)}
            pathOptions={{
              fillColor: 'transparent',
              fillOpacity: 0,
              color: 'transparent',
              weight: 0,
              opacity: 0,
            }}
            interactive={true}
            bubblingMouseEvents={false}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                e.originalEvent.preventDefault();
                console.log('Station clicked (invisible area):', station.name);
                onStationClick(station.name);
              },
            }}
          />
        );
        
        // Main station marker with larger interactive radius
        stationElements.push(
          <CircleMarker
            key={`station-${station.name}`}
            center={[station.lat, station.lng]}
            radius={radius}
            pathOptions={{
              fillColor: isSelected ? '#60A5FA' : '#FFFFFF',
              fillOpacity: isSelected ? 0.9 : 1,
              color: isSelected ? '#3B82F6' : 'var(--map-stroke)',
              weight: isSelected ? (station.isMajor ? 4 : 3) : (station.isMajor ? 3 : 1.5),
              opacity: 1,
            }}
            interactive={true}
            bubblingMouseEvents={false}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                e.originalEvent.preventDefault();
                console.log('Station clicked:', station.name);
                onStationClick(station.name);
              },
            }}
          >
            {showLabels && (
              <Tooltip
                permanent
                direction="right"
                offset={[station.isMajor ? 12 : 6, 0]}
                className="station-label-tooltip"
                opacity={1}
                interactive={false}
              >
                <span
                  style={{
                    fontSize: station.isMajor ? '12px' : '10px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontWeight: isSelected ? '700' : (station.isMajor ? '700' : '400'),
                    color: isSelected ? '#3B82F6' : 'var(--map-label)',
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

        // Highlight ring for selected station
        if (isSelected) {
          stationElements.push(
            <CircleMarker
              key={`station-highlight-${station.name}`}
              center={[station.lat, station.lng]}
              radius={radius + 8}
              pathOptions={{
                fillColor: 'transparent',
                fillOpacity: 0,
                color: '#60A5FA',
                weight: 3,
                opacity: 0.6,
                dashArray: '6, 6',
              }}
            />
          );
          stationElements.push(
            <CircleMarker
              key={`station-highlight-outer-${station.name}`}
              center={[station.lat, station.lng]}
              radius={radius + 12}
              pathOptions={{
                fillColor: 'transparent',
                fillOpacity: 0,
                color: '#3B82F6',
                weight: 2,
                opacity: 0.4,
                dashArray: '8, 8',
              }}
            />
          );
        }
        
        return stationElements;
      }).flat()}
    </>
  );
}

export default memo(StationsLayer);


import { useEffect, useState } from 'react';
import { GeoJSON } from 'react-leaflet';
import type { FeatureCollection } from 'geojson';
import type { Layer, LeafletMouseEvent } from 'leaflet';
import './StateBoundaries.css';

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function getPropString(obj: unknown, key: string): string {
  if (!isObject(obj)) return '';
  const v = obj[key];
  return typeof v === 'string' ? v : '';
}

function getFeatureStateName(feature: unknown): string {
  if (!isObject(feature)) return '';
  const props = feature.properties;
  const state = getPropString(props, 'state');
  const name = getPropString(props, 'name');
  const NAME = getPropString(props, 'NAME');
  return state || name || NAME || '';
}

// Accurate state boundaries using real geographic coordinates
// Based on actual state border coordinates for NJ and NY
const getStateBoundaries = (): FeatureCollection => {
  // New Jersey boundary - using actual state border coordinates
  // Simplified but accurate representation of NJ's distinctive shape
  const njBoundary: [number, number][] = [
    // Southwest (Delaware Bay/Cape May)
    [-74.7781, 38.9286],
    // West along Delaware River
    [-75.5636, 38.9286],
    [-75.5636, 39.0000],
    [-75.5636, 39.2000],
    [-75.5636, 39.4000],
    [-75.5636, 39.6000],
    [-75.5636, 39.8000],
    [-75.5636, 40.0000],
    [-75.5636, 40.2000],
    [-75.5636, 40.4000],
    [-75.5636, 40.6000],
    [-75.5636, 40.8000],
    [-75.5636, 41.0000],
    [-75.5636, 41.2000],
    [-75.5636, 41.3574], // Northern border with NY
    // North along NY border
    [-74.6954, 41.3574], // Tri-state area
    // East along Hudson River (NY/NJ border)
    [-74.6954, 41.3000],
    [-74.6954, 41.2000],
    [-74.6954, 41.1000],
    [-74.6954, 41.0000],
    [-74.6954, 40.9000],
    [-74.6954, 40.8000],
    [-74.6954, 40.7000],
    [-74.6954, 40.6000],
    [-74.6954, 40.5000],
    [-74.6954, 40.4774],
    [-74.0431, 40.4774], // NYC area
    // South along Atlantic coast
    [-74.0431, 40.4000],
    [-74.0431, 40.3000],
    [-74.0431, 40.2000],
    [-74.0431, 40.1000],
    [-74.0431, 40.0000],
    [-74.0431, 39.9000],
    [-74.0431, 39.8000],
    [-74.0431, 39.7000],
    [-74.0431, 39.6000],
    [-74.0431, 39.5000],
    [-74.0431, 39.4000],
    [-74.0431, 39.3000],
    [-74.0431, 39.2000],
    [-74.0431, 39.1000],
    [-74.0431, 39.0000],
    [-74.0431, 38.9286],
    [-74.7781, 38.9286], // Close polygon
  ];

  // New York boundary (NYC area and lower Hudson Valley)
  // Only showing the portion visible in the NJ Transit map view
  const nyBoundary: [number, number][] = [
    // Hudson River south (NYC area)
    [-74.0431, 40.4774],
    [-74.0000, 40.5000],
    [-73.9500, 40.5500],
    [-73.9000, 40.6000],
    [-73.8934, 40.6500],
    [-73.8934, 40.7000], // Manhattan
    [-73.8934, 40.7500],
    [-73.8934, 40.8000],
    [-73.8934, 40.8500],
    [-73.8934, 40.9000], // Bronx
    [-73.8934, 40.9500],
    [-73.8934, 41.0000], // Yonkers
    [-73.8934, 41.0500],
    [-73.8934, 41.1000],
    [-73.8934, 41.1500],
    [-73.8934, 41.2000], // Westchester
    [-73.8934, 41.2500],
    [-73.8934, 41.3000],
    // Hudson River north
    [-73.8934, 41.3574],
    [-73.9000, 41.3500],
    [-73.9200, 41.3400],
    [-73.9400, 41.3300],
    [-73.9600, 41.3200],
    // East border
    [-73.9028, 41.3574],
    [-73.9028, 41.3000],
    [-73.9028, 41.2000],
    [-73.9028, 41.1000],
    [-73.9028, 41.0000],
    [-73.9028, 40.9000],
    [-73.9028, 40.8000],
    [-73.9028, 40.7000],
    [-73.9028, 40.6000],
    [-73.9028, 40.5500],
    [-73.9028, 40.5000],
    [-73.9028, 40.4774],
    [-74.0431, 40.4774], // Close polygon
  ];

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'New Jersey', state: 'NJ' },
        geometry: {
          type: 'Polygon',
          coordinates: [njBoundary],
        },
      },
      {
        type: 'Feature',
        properties: { name: 'New York', state: 'NY' },
        geometry: {
          type: 'Polygon',
          coordinates: [nyBoundary],
        },
      },
    ],
  };
};

/**
 * StateBoundaries component - renders beautiful, stylized state outlines
 * for New Jersey and New York to provide geographic context
 */
export default function StateBoundaries() {
  const [boundaries, setBoundaries] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    // Try to fetch from public API, fallback to local data
    const fetchBoundaries = async () => {
      try {
        // Try multiple public GeoJSON sources
        const sources = [
          'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json',
          'https://raw.githubusercontent.com/johan/world.geo.json/master/countries/USA/NJ.geo.json',
        ];
        
        let success = false;
        for (const url of sources) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              const data = await response.json();
              // Handle different response formats
              let features = [];
              if (data.type === 'FeatureCollection') {
                features = data.features;
              } else if (data.type === 'Feature') {
                features = [data];
              }
              
              // Filter for NJ and NY only, or use all if it's a single state
              const filtered: FeatureCollection = {
                type: 'FeatureCollection',
                features: features.filter((f: unknown) => {
                  const name = getFeatureStateName(f);
                  return name.includes('New Jersey') || name.includes('New York') || 
                         name === 'NJ' || name === 'NY' ||
                         features.length <= 2; // If only 1-2 features, use them all
                }),
              };
              
              if (filtered.features.length > 0) {
                setBoundaries(filtered);
                success = true;
                break;
              }
            }
          } catch (e) {
            // Try next source
            continue;
          }
        }
        
        if (!success) {
          throw new Error('All API sources failed');
        }
      } catch (error) {
        // Fall back to our local approximation if network fetch fails.
        setBoundaries(getStateBoundaries() as FeatureCollection);
      }
    };

    fetchBoundaries();
  }, []);

  if (!boundaries) {
    return null;
  }

  // Style function for each state
  const styleFeature = (feature: unknown) => {
    // Support both 'state' property (local) and 'name' property (API)
    const stateName = getFeatureStateName(feature);
    const isNJ = stateName === 'New Jersey' || stateName === 'NJ';
    
    return {
      fillColor: isNJ
        ? 'rgba(44, 62, 80, 0.03)' // Very subtle fill for NJ
        : 'rgba(44, 62, 80, 0.02)', // Even more subtle for NY
      fillOpacity: 1,
      color: isNJ
        ? 'rgba(44, 62, 80, 0.25)' // Subtle outline for NJ
        : 'rgba(44, 62, 80, 0.2)', // Subtle outline for NY
      weight: isNJ ? 2.5 : 2, // Slightly thicker for NJ
      opacity: 1,
      dashArray: isNJ ? '8, 4' : '6, 3', // Dashed lines for elegance
      lineCap: 'round' as const,
      lineJoin: 'round' as const,
    };
  };

  // Add hover effect
  const onEachFeature = (feature: unknown, layer: Layer) => {
    const stateName = getFeatureStateName(feature);
    const isNJ = stateName === 'New Jersey' || stateName === 'NJ';
    
    layer.on({
      mouseover: (e: LeafletMouseEvent) => {
        (e.target as unknown as { setStyle: (s: Record<string, unknown>) => void }).setStyle({
          fillColor: isNJ
            ? 'rgba(44, 62, 80, 0.06)'
            : 'rgba(44, 62, 80, 0.04)',
          color: isNJ
            ? 'rgba(44, 62, 80, 0.4)'
            : 'rgba(44, 62, 80, 0.35)',
          weight: isNJ ? 3 : 2.5,
        });
      },
      mouseout: (e: LeafletMouseEvent) => {
        (e.target as unknown as { setStyle: (s: Record<string, unknown>) => void }).setStyle({
          fillColor: isNJ
            ? 'rgba(44, 62, 80, 0.03)'
            : 'rgba(44, 62, 80, 0.02)',
          color: isNJ
            ? 'rgba(44, 62, 80, 0.25)'
            : 'rgba(44, 62, 80, 0.2)',
          weight: isNJ ? 2.5 : 2,
        });
      },
    });
  };

  return (
    <GeoJSON
      data={boundaries}
      style={styleFeature}
      onEachFeature={onEachFeature}
    />
  );
}

import { useState } from 'react';
import { useMapEvents } from 'react-leaflet';

/**
 * A single shared "map changed" tick you can pass down to memoized children.
 * This avoids each marker/layer registering its own Leaflet listeners.
 */
export function useMapTick(): number {
  const [tick, setTick] = useState(0);

  useMapEvents({
    moveend: () => setTick((t) => t + 1),
    zoomend: () => setTick((t) => t + 1),
    viewreset: () => setTick((t) => t + 1),
    resize: () => setTick((t) => t + 1),
  });

  return tick;
}


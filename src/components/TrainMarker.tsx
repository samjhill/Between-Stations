import { useMemo } from 'react';
import { Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Train } from '../types/domain';
import { getLineColor } from '../config/lineColors';
import {
  getDirectionAngleFromGeometry,
  snapToGeometry,
  snapTrainToLine,
  getTrainDirectionAngle,
} from '../core/lineSnapping';

interface TrainMarkerProps {
  train: Train;
  isSelected: boolean;
  onTrainClick: (train: Train) => void;
  /**
   * Precomputed (corridor-offset) polyline for this train's line at the current map view.
   * Passing this avoids recomputing offsets inside each marker.
   */
  lineGeometry?: [number, number][];
}

/**
 * Get opacity and visual treatment based on confidence level
 * MiniMetro-style: opacity and visual treatment encode confidence, not color
 */
function getConfidenceStyle(confidence: string): { opacity: number; pulse: boolean } {
  switch (confidence) {
    case 'high':
      return { opacity: 1.0, pulse: false }; // Solid, opaque, crisp
    case 'medium':
      return { opacity: 0.75, pulse: false }; // Slight transparency, softer edge
    case 'low':
      return { opacity: 0.5, pulse: true }; // More transparent, subtle pulse
    default:
      return { opacity: 0.3, pulse: true }; // Hidden-like appearance
  }
}

/**
 * Create a MiniMetro-style train icon (capsule shape)
 * @param train The train object
 * @param isSelected Whether the train is selected
 * @param rotationAngle The rotation angle in degrees (0-360), or null if no rotation
 */
function createTrainIcon(train: Train, isSelected: boolean, rotationAngle: number | null): L.Icon {
  const confidence = train.locationHypothesis?.confidence || 'unknown';
  const lineColor = getLineColor(train.line);
  const { opacity, pulse } = getConfidenceStyle(confidence);

  const scale = isSelected ? 1.3 : 1.0;
  const borderColor = isSelected ? '#000' : '#FFFFFF';
  
  // Use data attribute for pulse animation - pulse will animate from base opacity
  const pulseClass = pulse ? 'minimetro-train-pulse' : '';
  
  // Apply rotation if angle is provided
  // The icon is 24px tall, so we rotate around the center (12px from top)
  // Leaflet's rotation is clockwise, and 0 degrees is typically "up" (north)
  // We need to adjust: bearing 0 (north) should point up, bearing 90 (east) should point right
  const rotation = rotationAngle !== null ? `rotate(${rotationAngle}deg)` : '';
  const transform = rotation ? `scale(${scale}) ${rotation}` : `scale(${scale})`;

  // Add a small directional indicator (triangle) at the front end
  // The triangle points in the direction of travel
  // Since the entire div rotates, the triangle at the top will rotate with it
  const directionIndicator = rotationAngle !== null ? `
    <div style="
      position: absolute;
      top: -4px;
      left: 50%;
      margin-left: -4px;
      width: 0;
      height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 5px solid ${borderColor};
      z-index: 1;
    "></div>
  ` : '';

  return L.divIcon({
    className: `train-marker minimetro-train ${pulseClass}`,
    html: `
      <div style="
        position: relative;
        width: 16px;
        height: 24px;
        background-color: ${lineColor};
        border: 2px solid ${borderColor};
        border-radius: 12px;
        opacity: ${opacity};
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        transform: ${transform};
        transform-origin: center center;
        transition: opacity 0.3s ease, transform 0.2s ease;
        cursor: pointer;
        --base-opacity: ${opacity};
      ">
        ${directionIndicator}
      </div>
    `,
    iconSize: [16, 24],
    iconAnchor: [8, 12],
  }) as L.Icon;
}

/**
 * Train marker component that properly updates position
 * Snaps train position to its line geometry (accounting for corridor offsets)
 */
export default function TrainMarker({
  train,
  isSelected,
  onTrainClick,
  lineGeometry,
}: TrainMarkerProps) {
  const rawPosition = train.locationHypothesis?.position;
  const map = useMap();

  // Snap train position to its line (accounting for corridor offsets)
  const snappedPosition = useMemo(() => {
    if (!rawPosition) return null;
    
    try {
      // Fast path: use precomputed geometry from MapContent.
      if (lineGeometry && lineGeometry.length >= 2) {
        const snapped = snapToGeometry(rawPosition, lineGeometry);
        return { lat: snapped.lat, lng: snapped.lng };
      }

      // Fallback: compute geometry internally (slower).
      return snapTrainToLine(train.line, rawPosition, map);
    } catch (error) {
      console.warn(`Failed to snap train ${train.id} to line ${train.line}:`, error);
      return rawPosition; // Fallback to raw position
    }
  }, [rawPosition, train.line, train.id, map, lineGeometry]);

  // Calculate direction angle for the train
  const directionAngle = useMemo(() => {
    if (!snappedPosition) return null;
    
    try {
      if (lineGeometry && lineGeometry.length >= 2) {
        return getDirectionAngleFromGeometry(train.line, snappedPosition, train.direction, lineGeometry);
      }
      // Fallback: compute geometry internally (slower).
      return getTrainDirectionAngle(train.line, snappedPosition, train.direction, map);
    } catch (error) {
      console.warn(`Failed to calculate direction angle for train ${train.id}:`, error);
      return null;
    }
  }, [snappedPosition, train.line, train.direction, train.id, lineGeometry, map]);

  // Memoize icon creation to avoid recreating on every render
  const icon = useMemo(() => {
    return createTrainIcon(train, isSelected, directionAngle);
  }, [train, isSelected, directionAngle]);

  if (!snappedPosition) {
    return null;
  }

  return (
    <Marker
      key={train.id} // Stable key - position updates via useEffect
      position={[snappedPosition.lat, snappedPosition.lng]}
      icon={icon}
      eventHandlers={{
        click: () => {
          onTrainClick(train);
        },
      }}
    >
      {/* Intentionally no Leaflet Popup: click selection is handled by the app-level tooltip/sidebar */}
    </Marker>
  );
}


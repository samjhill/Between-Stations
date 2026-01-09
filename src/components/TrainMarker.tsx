import { useEffect, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Train } from '../types/domain';
import { getLineColor } from '../config/lineColors';

interface TrainMarkerProps {
  train: Train;
  isSelected: boolean;
  onTrainClick: (train: Train) => void;
  onFollowTrain: (trainId: string | null) => void;
  followState: { trainId: string | null; enabled: boolean };
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
 */
function createTrainIcon(train: Train, isSelected: boolean): L.Icon {
  const confidence = train.locationHypothesis?.confidence || 'unknown';
  const lineColor = getLineColor(train.line);
  const { opacity, pulse } = getConfidenceStyle(confidence);

  const scale = isSelected ? 1.3 : 1.0;
  const borderColor = isSelected ? '#000' : '#FFFFFF';
  
  // Use data attribute for pulse animation - pulse will animate from base opacity
  const pulseClass = pulse ? 'minimetro-train-pulse' : '';

  return L.divIcon({
    className: `train-marker minimetro-train ${pulseClass}`,
    html: `
      <div style="
        width: 16px;
        height: 24px;
        background-color: ${lineColor};
        border: 2px solid ${borderColor};
        border-radius: 12px;
        opacity: ${opacity};
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        transform: scale(${scale});
        transition: opacity 0.3s ease, transform 0.2s ease;
        cursor: pointer;
        --base-opacity: ${opacity};
      "></div>
    `,
    iconSize: [16, 24],
    iconAnchor: [8, 12],
  });
}

/**
 * Train marker component that properly updates position
 */
export default function TrainMarker({
  train,
  isSelected,
  onTrainClick,
  onFollowTrain,
  followState,
}: TrainMarkerProps) {
  const position = train.locationHypothesis?.position;
  const confidence = train.locationHypothesis?.confidence || 'unknown';
  const markerRef = useRef<L.Marker | null>(null);

  // Update marker position when it changes (without remounting)
  useEffect(() => {
    if (markerRef.current && position) {
      markerRef.current.setLatLng([position.lat, position.lng]);
    }
  }, [position?.lat, position?.lng]);

  if (!position) {
    return null;
  }

  const icon = createTrainIcon(train, isSelected);

  return (
    <Marker
      key={train.id} // Stable key - position updates via useEffect
      position={[position.lat, position.lng]}
      icon={icon}
      ref={(ref) => {
        markerRef.current = ref;
      }}
      eventHandlers={{
        click: () => {
          onTrainClick(train);
        },
      }}
    >
      <Popup>
        <div style={{ minWidth: '200px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem' }}>
            {train.trainNumber || train.id}
          </h3>
          <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
            <strong>Line:</strong> {train.line}
          </p>
          <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
            <strong>Direction:</strong> {train.direction}
          </p>
          <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
            <strong>To:</strong> {train.destination}
          </p>
          {train.delaySeconds !== undefined && train.delaySeconds > 0 && (
            <p style={{ margin: '4px 0', color: '#dc3545', fontSize: '0.9rem' }}>
              <strong>Delay:</strong> {Math.floor(train.delaySeconds / 60)} min{' '}
              {train.delaySeconds % 60} sec
            </p>
          )}
          <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#666' }}>
            <strong>Confidence:</strong> {confidence}
          </p>
          <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#666' }}>
            <strong>Next Stop:</strong> {train.nextStop || 'Unknown'}
          </p>
          <div style={{ marginTop: '8px' }}>
            <button
              onClick={() => onFollowTrain(train.id)}
              style={{
                padding: '4px 8px',
                fontSize: '0.85rem',
                backgroundColor: followState.trainId === train.id ? '#007bff' : '#f0f0f0',
                color: followState.trainId === train.id ? 'white' : 'black',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {followState.trainId === train.id ? 'Following' : 'Follow'}
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}


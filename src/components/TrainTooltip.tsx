import { useEffect, useRef } from 'react';
import type { Train } from '../types/domain';
import './TrainTooltip.css';

interface TrainTooltipProps {
  train: Train | null;
  position: { lat: number; lng: number } | null;
  onClose: () => void;
  onFollow: (trainId: string) => void;
  isFollowing: boolean;
}

export default function TrainTooltip({
  train,
  position,
  onClose,
  onFollow,
  isFollowing,
}: TrainTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!train) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        // Don't close if clicking on the map (let user click map to close)
        const target = event.target as HTMLElement;
        if (!target.closest('.leaflet-container')) {
          return;
        }
        onClose();
      }
    };

    // Close on Escape key
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [train, onClose]);

  if (!train || !position) {
    return null;
  }

  const confidence = train.locationHypothesis?.confidence || 'unknown';
  const routePosition = train.locationHypothesis?.routePosition;

  return (
    <div className="train-tooltip-overlay" onClick={onClose}>
      <div
        ref={tooltipRef}
        className="train-tooltip"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="train-tooltip-header">
          <h3>Train {train.trainNumber || train.id}</h3>
          <button className="train-tooltip-close" onClick={onClose} title="Close">
            ×
          </button>
        </div>
        
        <div className="train-tooltip-content">
          <div className="train-tooltip-row">
            <span className="train-tooltip-label">Line:</span>
            <span className="train-tooltip-value">{train.line}</span>
          </div>
          
          <div className="train-tooltip-row">
            <span className="train-tooltip-label">Direction:</span>
            <span className="train-tooltip-value">{train.direction}</span>
          </div>
          
          <div className="train-tooltip-row">
            <span className="train-tooltip-label">Destination:</span>
            <span className="train-tooltip-value">{train.destination}</span>
          </div>
          
          <div className="train-tooltip-row">
            <span className="train-tooltip-label">Next Stop:</span>
            <span className="train-tooltip-value">{train.nextStop || 'Unknown'}</span>
          </div>
          
          {routePosition && (
            <div className="train-tooltip-row">
              <span className="train-tooltip-label">Progress:</span>
              <span className="train-tooltip-value">
                {routePosition.fromStation} → {routePosition.toStation} ({Math.round(routePosition.progress * 100)}%)
              </span>
            </div>
          )}
          
          <div className="train-tooltip-row">
            <span className="train-tooltip-label">Confidence:</span>
            <span className={`train-tooltip-value confidence-${confidence}`}>
              {confidence.toUpperCase()}
            </span>
          </div>
          
          {train.delaySeconds !== undefined && train.delaySeconds > 0 && (
            <div className="train-tooltip-row">
              <span className="train-tooltip-label">Delay:</span>
              <span className="train-tooltip-value delay">
                {Math.floor(train.delaySeconds / 60)} min {train.delaySeconds % 60} sec
              </span>
            </div>
          )}
        </div>
        
        <div className="train-tooltip-actions">
          <button
            className={`train-tooltip-follow ${isFollowing ? 'active' : ''}`}
            onClick={() => onFollow(train.id)}
          >
            {isFollowing ? 'Unfollow' : 'Follow Train'}
          </button>
        </div>
      </div>
    </div>
  );
}


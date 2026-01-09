import './TrainDetails.css';
import type { Train } from '../types/domain';

interface TrainDetailsProps {
  train: Train;
  onClose: () => void;
  onFollow: () => void;
  isFollowing: boolean;
}

function formatDelay(delaySeconds: number): string {
  if (delaySeconds < 60) {
    return `${delaySeconds} seconds`;
  }
  const minutes = Math.floor(delaySeconds / 60);
  const seconds = delaySeconds % 60;
  if (seconds === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) {
    return 'Just now';
  }
  if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }
  return date.toLocaleString();
}

function getConfidenceDescription(confidence: string): string {
  switch (confidence) {
    case 'high':
      return 'High confidence - based on direct, recent positional evidence';
    case 'medium':
      return 'Medium confidence - based on multiple indirect signals';
    case 'low':
      return 'Low confidence - based on minimal or inferred signals';
    default:
      return 'Unknown - insufficient information to place the train';
  }
}

export default function TrainDetails({
  train,
  onClose,
  onFollow,
  isFollowing,
}: TrainDetailsProps) {
  const confidence = train.locationHypothesis?.confidence || 'unknown';
  const explanation = train.locationHypothesis?.explanation || 'No explanation available';
  const position = train.locationHypothesis?.position;
  const routePosition = train.locationHypothesis?.routePosition;

  return (
    <div className="train-details">
      <div className="train-details-header">
        <h2>Train Details</h2>
        <button onClick={onClose} className="close-button">
          ×
        </button>
      </div>

      <div className="train-details-content">
        <div className="train-details-section">
          <div className="detail-row">
            <span className="detail-label">Train Number:</span>
            <span className="detail-value">{train.trainNumber || train.id}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Line:</span>
            <span className="detail-value">{train.line}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Direction:</span>
            <span className="detail-value">{train.direction}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Destination:</span>
            <span className="detail-value">{train.destination}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Status:</span>
            <span className={`detail-value status-${train.status}`}>
              {train.status === 'on_time' ? 'On Time' : 
               train.status === 'delayed' ? 'Delayed' : 'Unknown'}
            </span>
          </div>
          {train.delaySeconds !== undefined && train.delaySeconds > 0 && (
            <div className="detail-row">
              <span className="detail-label">Delay:</span>
              <span className="detail-value delay">{formatDelay(train.delaySeconds)}</span>
            </div>
          )}
          <div className="detail-row">
            <span className="detail-label">Next Stop:</span>
            <span className="detail-value">{train.nextStop || 'Unknown'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">State:</span>
            <span className="detail-value">{train.state.replace('_', ' ')}</span>
          </div>
        </div>

        <div className="train-details-section">
          <h3>Location</h3>
          {position && (
            <>
              <div className="detail-row">
                <span className="detail-label">Latitude:</span>
                <span className="detail-value">{position.lat.toFixed(6)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Longitude:</span>
                <span className="detail-value">{position.lng.toFixed(6)}</span>
              </div>
            </>
          )}
          {routePosition && (
            <>
              <div className="detail-row">
                <span className="detail-label">Line:</span>
                <span className="detail-value">{routePosition.line}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Segment:</span>
                <span className="detail-value">
                  {routePosition.fromStation} → {routePosition.toStation}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Progress:</span>
                <span className="detail-value">
                  {Math.round(routePosition.progress * 100)}%
                </span>
              </div>
            </>
          )}
        </div>

        <div className="train-details-section">
          <h3>Confidence</h3>
          <div className="detail-row">
            <span className="detail-label">Level:</span>
            <span className={`detail-value confidence-${confidence}`}>
              {confidence.toUpperCase()}
            </span>
          </div>
          <div className="detail-description">
            {getConfidenceDescription(confidence)}
          </div>
          <div className="detail-explanation">
            <strong>Explanation:</strong> {explanation}
          </div>
        </div>

        <div className="train-details-section">
          <h3>Data Freshness</h3>
          <div className="detail-row">
            <span className="detail-label">Last Update:</span>
            <span className="detail-value">{formatTime(train.lastUpdateTime)}</span>
          </div>
          {train.locationHypothesis && (
            <div className="detail-row">
              <span className="detail-label">Evidence Timestamp:</span>
              <span className="detail-value">
                {formatTime(train.locationHypothesis.timestamp)}
              </span>
            </div>
          )}
          <div className="detail-row">
            <span className="detail-label">Evidence Sources:</span>
            <span className="detail-value">
              {train.locationHypothesis?.evidence
                .map((e) => e.source)
                .filter((v, i, a) => a.indexOf(v) === i)
                .join(', ') || 'None'}
            </span>
          </div>
        </div>

        <div className="train-details-actions">
          <button
            onClick={onFollow}
            className={`follow-button ${isFollowing ? 'active' : ''}`}
          >
            {isFollowing ? 'Unfollow Train' : 'Follow Train'}
          </button>
        </div>
      </div>
    </div>
  );
}



import './StationTrainsPanel.css';
import { memo } from 'react';
import type { Train } from '../types/domain';
import type { FollowState } from '../types/ui';
import { getNextStopTiming } from '../core/nextStopTiming';

interface StationTrainsPanelProps {
  stationName: string;
  trains: Train[];
  selectedTrain: Train | null;
  followState: FollowState;
  onTrainClick: (train: Train) => void;
  onFollowTrain: (trainId: string | null) => void;
  onClose: () => void;
}

const getConfidenceBadgeClass = (confidence: string): string => {
  switch (confidence) {
    case 'high':
      return 'confidence-high';
    case 'medium':
      return 'confidence-medium';
    case 'low':
      return 'confidence-low';
    default:
      return 'confidence-unknown';
  }
};

const formatDelay = (delaySeconds: number): string => {
  if (delaySeconds < 60) {
    return `${delaySeconds}s`;
  }
  const minutes = Math.floor(delaySeconds / 60);
  const seconds = delaySeconds % 60;
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
};

function StationTrainsPanel({
  stationName,
  trains,
  selectedTrain,
  followState,
  onTrainClick,
  onFollowTrain,
  onClose,
}: StationTrainsPanelProps) {
  return (
    <div className="station-trains-panel">
      <div className="station-trains-panel-header">
        <div>
          <h2 className="station-trains-panel-title">I am at</h2>
          <h3 className="station-trains-panel-station-name">{stationName}</h3>
        </div>
        <button
          className="icon-button close-sidebar"
          onClick={onClose}
          title="Close"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="5" x2="15" y2="15"/>
            <line x1="15" y1="5" x2="5" y2="15"/>
          </svg>
        </button>
      </div>
      <div className="station-trains-panel-content">
        {trains.length === 0 ? (
          <div className="station-trains-panel-empty">
            <p>No trains arriving at this station</p>
            <p className="station-trains-panel-empty-hint">
              Trains will appear here when they are scheduled to arrive at {stationName}
            </p>
          </div>
        ) : (
          <>
            <div className="station-trains-panel-count">
              {trains.length} train{trains.length !== 1 ? 's' : ''} arriving
            </div>
            <div className="station-trains-panel-list">
              {trains.map((train) => {
                const confidence = train.locationHypothesis?.confidence || 'unknown';
                const isSelected = selectedTrain?.id === train.id;
                const isFollowing = followState.trainId === train.id;
                const timing = getNextStopTiming(train);

                return (
                  <div
                    key={train.id}
                    className={`station-train-item ${isSelected ? 'selected' : ''} ${isFollowing ? 'following' : ''}`}
                    onClick={() => onTrainClick(train)}
                  >
                    <div className="station-train-item-header">
                      <div className="station-train-item-title">
                        <span className="train-number">
                          {train.trainNumber || train.id}
                        </span>
                        <span
                          className={`confidence-badge ${getConfidenceBadgeClass(confidence)}`}
                          title={train.locationHypothesis?.explanation || confidence}
                        >
                          {confidence}
                        </span>
                      </div>
                      {isFollowing && (
                        <span className="following-indicator" title="Following">
                          👁️
                        </span>
                      )}
                    </div>
                    <div className="station-train-item-details">
                      <div className="train-line">{train.line}</div>
                      <div className="train-direction">
                        {train.destination && train.destination !== 'unknown'
                          ? `${train.direction} → ${train.destination}`
                          : train.direction}
                      </div>
                      {timing && (
                        <div className="train-timing">
                          <div className="train-timing-row">
                            <span className="train-timing-label">Scheduled:</span>
                            <span className="train-timing-value">{timing.scheduledLabel}</span>
                          </div>
                          <div className="train-timing-row">
                            <span className="train-timing-label">Expected:</span>
                            <span className="train-timing-value expected">{timing.expectedLabel}</span>
                            {timing.etaLabel && (
                              <span className="train-timing-eta">({timing.etaLabel})</span>
                            )}
                          </div>
                        </div>
                      )}
                      {train.delaySeconds !== undefined && train.delaySeconds > 0 && (
                        <div className="train-delay">
                          ⏱️ {formatDelay(train.delaySeconds)} late
                        </div>
                      )}
                      {train.state === 'at_station' && (
                        <div className="train-status-at-station">
                          🚉 Currently at station
                        </div>
                      )}
                    </div>
                    <div className="station-train-item-actions">
                      <button
                        className={`follow-button ${isFollowing ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onFollowTrain(isFollowing ? null : train.id);
                        }}
                      >
                        {isFollowing ? 'Unfollow' : 'Follow'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default memo(StationTrainsPanel);

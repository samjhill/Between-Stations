import './TrainList.css';
import type { Train } from '../types/domain';
import type { FollowState } from '../types/ui';

interface TrainListProps {
  trains: Train[];
  selectedTrain: Train | null;
  followState: FollowState;
  onTrainClick: (train: Train) => void;
  onFollowTrain: (trainId: string | null) => void;
}

function getConfidenceBadgeClass(confidence: string): string {
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
}

function formatDelay(delaySeconds: number): string {
  if (delaySeconds < 60) {
    return `${delaySeconds}s`;
  }
  const minutes = Math.floor(delaySeconds / 60);
  const seconds = delaySeconds % 60;
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
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
    return `${minutes}m ago`;
  }
  return date.toLocaleTimeString();
}

export default function TrainList({
  trains,
  selectedTrain,
  followState,
  onTrainClick,
  onFollowTrain,
}: TrainListProps) {
  return (
    <div className="train-list">
      <div className="train-list-content">
        {trains.length === 0 ? (
          <div className="train-list-empty">
            <p>No trains found matching filters</p>
          </div>
        ) : (
          trains.map((train) => {
            const confidence = train.locationHypothesis?.confidence || 'unknown';
            const isSelected = selectedTrain?.id === train.id;
            const isFollowing = followState.trainId === train.id;

            return (
              <div
                key={train.id}
                className={`train-list-item ${isSelected ? 'selected' : ''} ${isFollowing ? 'following' : ''}`}
                onClick={() => onTrainClick(train)}
              >
                <div className="train-list-item-header">
                  <div className="train-list-item-title">
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
                <div className="train-list-item-details">
                  <div className="train-line">{train.line}</div>
                  <div className="train-direction">
                    {train.direction} → {train.destination}
                  </div>
                  {train.delaySeconds !== undefined && train.delaySeconds > 0 && (
                    <div className="train-delay">
                      ⏱️ {formatDelay(train.delaySeconds)} late
                    </div>
                  )}
                  {train.nextStop && (
                    <div className="train-next-stop">
                      Next: {train.nextStop}
                    </div>
                  )}
                  <div className="train-update-time">
                    Updated: {formatTime(train.lastUpdateTime)}
                  </div>
                </div>
                <div className="train-list-item-actions">
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
          })
        )}
      </div>
    </div>
  );
}


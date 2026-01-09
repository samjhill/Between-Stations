import { useEffect } from 'react';
import TrainMarker from './TrainMarker';
import TransitLines from './TransitLines';
import StationsLayer from './StationsLayer';
import StateBoundaries from './StateBoundaries';
import CameraControls from './CameraControls';
import { useCameraController } from '../hooks/useCameraController';
import type { Train } from '../types/domain';
import type { FollowState, FilterState } from '../types/ui';

interface MapContentProps {
  trains: Train[];
  selectedTrain: Train | null;
  followState: FollowState;
  filterState: FilterState;
  onTrainClick: (train: Train) => void;
  onFollowTrain: (trainId: string | null) => void;
}

export default function MapContent({
  trains,
  selectedTrain,
  followState,
  filterState,
  onTrainClick,
  onFollowTrain,
}: MapContentProps) {
  // Use camera controller hook
  const { cameraState, resetView, confidenceWarning } = useCameraController({
    trains,
    followTrainId: followState.enabled ? followState.trainId : null,
    idleThresholdMs: 75000, // 75 seconds
  });

  // Debug logging
  useEffect(() => {
    const trainsWithPositions = trains.filter((t) => t.locationHypothesis?.position);
    console.log(`MapContent: Rendering ${trainsWithPositions.length} trains with positions out of ${trains.length} total`);
  }, [trains]);

  return (
    <>
      {/* Static layers: state boundaries, lines and stations */}
      <StateBoundaries />
      <TransitLines filterState={filterState} />
      <StationsLayer />
      
      {/* Animated layer: trains */}
      {trains
        .filter((train) => train.locationHypothesis?.position)
        .map((train) => {
          const isSelected = selectedTrain?.id === train.id;
          return (
            <TrainMarker
              key={`${train.id}-${train.locationHypothesis?.position?.lat}-${train.locationHypothesis?.position?.lng}`}
              train={train}
              isSelected={isSelected}
              onTrainClick={onTrainClick}
              onFollowTrain={onFollowTrain}
              followState={followState}
            />
          );
        })}
      
      {/* Camera controls and indicators */}
      <CameraControls
        cameraMode={cameraState.mode}
        confidenceWarning={confidenceWarning}
        onResetView={resetView}
      />
    </>
  );
}


import { memo, useMemo } from 'react';
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
  onLineClick: (lineId: string, clickLatLng: { lat: number; lng: number }) => void;
}

function MapContent({
  trains,
  selectedTrain,
  followState,
  filterState,
  onTrainClick,
  onLineClick,
}: MapContentProps) {
  // Use camera controller hook
  const { cameraState, resetView, confidenceWarning } = useCameraController({
    trains,
    followTrainId: followState.enabled ? followState.trainId : null,
    idleThresholdMs: 75000, // 75 seconds
  });

  // Memoize trains with positions to avoid filtering on every render
  const trainsWithPositions = useMemo(() => {
    return trains.filter((train) => train.locationHypothesis?.position);
  }, [trains]);

  return (
    <>
      {/* Static layers: state boundaries, lines and stations */}
      <StateBoundaries />
      <TransitLines filterState={filterState} onLineClick={onLineClick} />
      <StationsLayer />
      
      {/* Animated layer: trains */}
      {trainsWithPositions.map((train) => {
        const isSelected = selectedTrain?.id === train.id;
        return (
          <TrainMarker
            key={train.id}
            train={train}
            isSelected={isSelected}
            onTrainClick={onTrainClick}
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

export default memo(MapContent);


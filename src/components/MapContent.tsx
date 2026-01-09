import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import TrainMarker from './TrainMarker';
import TransitLines from './TransitLines';
import StationsLayer from './StationsLayer';
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
  const map = useMap();

  // Follow selected train
  useEffect(() => {
    if (followState.enabled && followState.trainId) {
      const train = trains.find((t) => t.id === followState.trainId);
      if (train?.locationHypothesis?.position) {
        const position = train.locationHypothesis.position;
        map.setView([position.lat, position.lng], 14, {
          animate: true,
          duration: 1.0,
        });
      }
    }
  }, [followState, trains, map]);

  // Debug logging
  useEffect(() => {
    const trainsWithPositions = trains.filter((t) => t.locationHypothesis?.position);
    console.log(`MapContent: Rendering ${trainsWithPositions.length} trains with positions out of ${trains.length} total`);
  }, [trains]);

  return (
    <>
      {/* Static layers: lines and stations */}
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
    </>
  );
}


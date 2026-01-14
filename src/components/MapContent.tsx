import { memo, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import TrainMarker from './TrainMarker';
import TransitLines from './TransitLines';
import StationsLayer from './StationsLayer';
import StateBoundaries from './StateBoundaries';
import CameraControls from './CameraControls';
import { useCameraController } from '../hooks/useCameraController';
import { useMapTick } from '../hooks/useMapTick';
import type { Train } from '../types/domain';
import type { FollowState, FilterState } from '../types/ui';
import { LINE_COLORS, getLineColor } from '../config/lineColors';
import { getRouteCoordinates } from '../config/trainRoutes';
import { applyCorridorOffsets, detectCorridorsFromLines } from '../core/corridorStacking';

interface MapContentProps {
  trains: Train[];
  selectedTrain: Train | null;
  followState: FollowState;
  filterState: FilterState;
  selectedStationName: string | null;
  onTrainClick: (train: Train) => void;
  onLineClick: (lineId: string, clickLatLng: { lat: number; lng: number }) => void;
  onStationClick: (stationName: string) => void;
}

function MapContent({
  trains,
  selectedTrain,
  followState,
  filterState,
  selectedStationName,
  onTrainClick,
  onLineClick,
  onStationClick,
}: MapContentProps) {
  const map = useMap();
  const mapTick = useMapTick();

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

  const allLines = useMemo(() => Object.keys(LINE_COLORS), []);

  // Detect shared corridors once from the official, un-offset routes (map-independent).
  const corridors = useMemo(() => {
    const baseLines = allLines
      .map((lineName) => ({ name: lineName, stations: getRouteCoordinates(lineName) }))
      .filter((l) => l.stations.length > 0);
    return detectCorridorsFromLines(baseLines);
  }, [allLines]);

  // Precompute corridor-offset line geometries once per map view change.
  // This is reused for both line rendering and per-train snapping/heading.
  const lineGeometryByName = useMemo(() => {
    void mapTick; // pixel-based offsets depend on current zoom/transform

    const out = new Map<string, [number, number][]>();
    for (const lineName of allLines) {
      const route = getRouteCoordinates(lineName);
      if (!route || route.length < 2) continue;
      out.set(lineName, applyCorridorOffsets(lineName, route, corridors, map));
    }
    return out;
  }, [allLines, corridors, map, mapTick]);

  // Filter lines based on filterState for the rendered line layer (markers may still exist on other lines).
  const visibleLines = useMemo(() => {
    if (filterState?.lines && filterState.lines.length > 0) return filterState.lines;
    return allLines;
  }, [filterState?.lines, allLines]);

  const linesToRender = useMemo(() => {
    return visibleLines
      .map((name) => {
        const stations = lineGeometryByName.get(name);
        if (!stations || stations.length < 2) return null;
        return { name, stations, color: getLineColor(name) };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);
  }, [visibleLines, lineGeometryByName]);

  return (
    <>
      {/* Static layers: state boundaries, lines and stations */}
      <StateBoundaries />
      <TransitLines filterState={filterState} onLineClick={onLineClick} linesToRender={linesToRender} />
      {/* Stations rendered after lines so they appear on top and are clickable */}
      <StationsLayer selectedStationName={selectedStationName} onStationClick={onStationClick} />
      
      {/* Animated layer: trains */}
      {trainsWithPositions.map((train) => {
        const isSelected = selectedTrain?.id === train.id;
        return (
          <TrainMarker
            key={train.id}
            train={train}
            isSelected={isSelected}
            onTrainClick={onTrainClick}
            lineGeometry={lineGeometryByName.get(train.line)}
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


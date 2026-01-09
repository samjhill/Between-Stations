/**
 * React hook for camera controller integration
 * Manages camera state and provides methods for mode switching
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useMap } from 'react-leaflet';
import type { Map } from 'leaflet';
import {
  CameraController,
  type CameraMode,
  type CameraState,
  easeInOut,
} from '../core/cameraController';
import type { Train } from '../types/domain';

interface UseCameraControllerOptions {
  trains: Train[];
  followTrainId?: string | null;
  onModeChange?: (mode: CameraMode) => void;
  idleThresholdMs?: number;
}

interface UseCameraControllerReturn {
  cameraState: CameraState;
  setMode: (mode: CameraMode, targetTrainId?: string) => void;
  recordUserInteraction: () => void;
  resetView: () => void;
  isFollowing: boolean;
  confidenceWarning: string | null;
}

const DEFAULT_CENTER: [number, number] = [40.7178, -74.0431];
const DEFAULT_ZOOM = 10;

/**
 * Hook to manage camera controller
 */
export function useCameraController({
  trains,
  followTrainId,
  onModeChange,
  idleThresholdMs = 75000,
}: UseCameraControllerOptions): UseCameraControllerReturn {
  const map = useMap();
  const controllerRef = useRef<CameraController>(new CameraController());
  const animationFrameRef = useRef<number>();
  const lastTargetRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>(
    controllerRef.current.getState()
  );

  // Update camera position when map moves
  useEffect(() => {
    const updatePosition = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      controllerRef.current.updateCameraPosition(
        { lat: center.lat, lng: center.lng },
        zoom
      );
    };

    map.on('moveend', updatePosition);
    map.on('zoomend', updatePosition);
    updatePosition();

    return () => {
      map.off('moveend', updatePosition);
      map.off('zoomend', updatePosition);
    };
  }, [map]);

  // Get viewport size for dead zone calculations
  const getViewportSize = useCallback(() => {
    const size = map.getSize();
    return { width: size.x, height: size.y };
  }, [map]);

  // Handle follow train mode
  useEffect(() => {
    if (followTrainId) {
      controllerRef.current.setMode('follow_train', followTrainId);
      const train = trains.find((t) => t.id === followTrainId);
      if (train && controllerRef.current.canFollowTrain(train)) {
        // Initial centering
        if (train.locationHypothesis?.position) {
          map.setView(
            [train.locationHypothesis.position.lat, train.locationHypothesis.position.lng],
            14,
            { animate: true, duration: 1.5 }
          );
        }
      }
    } else {
      // If follow is disabled, switch to manual
      if (cameraState.mode === 'follow_train') {
        controllerRef.current.setMode('manual');
      }
    }
  }, [followTrainId, trains, map, cameraState.mode]);

  // Record user interactions
  const recordUserInteraction = useCallback(() => {
    controllerRef.current.recordUserInteraction();
    setCameraState(controllerRef.current.getState());
  }, []);

  // Set up user interaction listeners
  useEffect(() => {
    const handleInteraction = () => {
      recordUserInteraction();
    };

    map.on('dragstart', handleInteraction);
    map.on('zoomstart', handleInteraction);
    map.on('click', handleInteraction);

    return () => {
      map.off('dragstart', handleInteraction);
      map.off('zoomstart', handleInteraction);
      map.off('click', handleInteraction);
    };
  }, [map, recordUserInteraction]);

  // Main camera update loop - throttled to reduce CPU usage
  useEffect(() => {
    let lastTime = performance.now();
    let lastUpdateTime = 0;
    const UPDATE_INTERVAL = 100; // Update every 100ms instead of every frame

    const updateCamera = (currentTime: number) => {
      // Throttle updates to reduce CPU usage
      if (currentTime - lastUpdateTime < UPDATE_INTERVAL) {
        animationFrameRef.current = requestAnimationFrame(updateCamera);
        return;
      }
      lastUpdateTime = currentTime;

      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      const controller = controllerRef.current;
      const state = controller.getState();

      // Check if ambient mode should activate
      if (state.mode === 'manual' && controller.shouldActivateAmbient(idleThresholdMs)) {
        controller.setMode('ambient');
        const newState = controller.getState();
        setCameraState(newState);
        if (onModeChange) {
          onModeChange('ambient');
        }
      }

      // Get camera target for current mode
      const viewportSize = getViewportSize();
      const target = controller.getCameraTarget(trains, viewportSize);

      if (target) {
        const currentCenter = map.getCenter();
        const currentZoom = map.getZoom();
        const targetCenter: [number, number] = [target.center.lat, target.center.lng];
        const targetZoom = target.zoom ?? currentZoom;

        // Check if we need to animate
        const centerDiff =
          Math.abs(currentCenter.lat - target.center.lat) +
          Math.abs(currentCenter.lng - target.center.lng);
        const zoomDiff = Math.abs(currentZoom - targetZoom);

        if (centerDiff > 0.0001 || zoomDiff > 0.1) {
          // Smooth easing animation
          // Use duration from target if provided (ambient mode), otherwise use defaults
          const duration = target.duration || (state.mode === 'ambient' ? 12000 : 1500);

          // Use Leaflet's built-in animation with ease-in-out
          map.setView(targetCenter, targetZoom, {
            animate: true,
            duration: duration / 1000, // Convert to seconds
            easeLinearity: 0.25, // Ease-in-out approximation
          });

          lastTargetRef.current = { center: targetCenter, zoom: targetZoom };
        }
      }

      // Update state only if it changed
      const newState = controller.getState();
      if (newState.mode !== cameraState.mode) {
        setCameraState(newState);
        if (onModeChange) {
          onModeChange(newState.mode);
        }
      }

      animationFrameRef.current = requestAnimationFrame(updateCamera);
    };

      animationFrameRef.current = requestAnimationFrame(updateCamera);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [map, trains, cameraState.mode, idleThresholdMs, onModeChange, getViewportSize]);

  // Set mode manually
  const setMode = useCallback(
    (mode: CameraMode, targetTrainId?: string) => {
      controllerRef.current.setMode(mode, targetTrainId);
      setCameraState(controllerRef.current.getState());
      if (onModeChange) {
        onModeChange(mode);
      }
    },
    [onModeChange]
  );

  // Reset view to default
  const resetView = useCallback(() => {
    controllerRef.current.setMode('manual');
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, {
      animate: true,
      duration: 1.5,
    });
    setCameraState(controllerRef.current.getState());
    if (onModeChange) {
      onModeChange('manual');
    }
  }, [map, onModeChange]);

  // Get confidence warning for current train
  const isFollowing = cameraState.mode === 'follow_train' && !!cameraState.targetTrainId;
  const followedTrain = isFollowing
    ? trains.find((t) => t.id === cameraState.targetTrainId)
    : null;
  const confidenceWarning = followedTrain
    ? controllerRef.current.getConfidenceWarning(followedTrain)
    : null;

  return {
    cameraState,
    setMode,
    recordUserInteraction,
    resetView,
    isFollowing,
    confidenceWarning,
  };
}


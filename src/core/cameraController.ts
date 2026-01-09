/**
 * Camera Controller - Single authority for all map camera behavior
 * Implements calm, observational motion with three explicit modes:
 * - Manual: User in control
 * - Follow Train: Centers on selected train with dead zone
 * - Ambient Explore: Slow, predictable panning when idle
 */

import type { Train, ConfidenceLevel, Position } from '../types/domain';
import { STATION_DATABASE } from './stationMapping';
import { MAJOR_STATIONS } from '../config/lineColors';

export type CameraMode = 'manual' | 'follow_train' | 'ambient';

export interface CameraState {
  mode: CameraMode;
  targetTrainId?: string;
  lastUserInteractionTs: number;
  currentZoom?: number;
  currentCenter?: Position;
  ambientTargetIndex?: number;
  lastAmbientMoveTs?: number;
}

export interface CameraTarget {
  center: Position;
  zoom?: number;
  duration?: number; // Animation duration in milliseconds (for ambient mode)
}

export interface DeadZone {
  centerX: number; // 0-1, screen space
  centerY: number; // 0-1, screen space
  width: number; // 0-1, screen space
  height: number; // 0-1, screen space
}

/**
 * Ease-in-out function for smooth camera motion
 * No spring, bounce, or overshoot - just coasting
 */
export function easeInOut(t: number): number {
  // Standard ease-in-out cubic
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Calculate distance between two positions in degrees
 * (Simple approximation - sufficient for dead zone calculations)
 */
function positionDistance(p1: Position, p2: Position): number {
  const latDiff = p1.lat - p2.lat;
  const lngDiff = p1.lng - p2.lng;
  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
}

/**
 * Check if a position is within a dead zone (screen space)
 * Returns true if position is OUTSIDE the dead zone
 */
export function isOutsideDeadZone(
  trainPos: Position,
  mapCenter: Position,
  mapZoom: number,
  deadZone: DeadZone,
  viewportSize?: { width: number; height: number }
): boolean {
  // Use actual viewport size if provided, otherwise use defaults
  const viewportWidth = viewportSize?.width || 1000;
  const viewportHeight = viewportSize?.height || 800;
  
  // Convert lat/lng to screen coordinates using Leaflet's projection
  // At zoom level Z, 1 pixel = 256 * 2^Z meters at equator
  // Approximate: 1 degree lat ≈ 111km, 1 degree lng ≈ 111km * cos(lat)
  const metersPerDegreeLat = 111000;
  const metersPerDegreeLng = 111000 * Math.cos((mapCenter.lat * Math.PI) / 180);
  
  const metersPerPixel = (40075017 / (256 * Math.pow(2, mapZoom))); // World circumference / (tile size * zoom factor)
  
  const latDiffMeters = (trainPos.lat - mapCenter.lat) * metersPerDegreeLat;
  const lngDiffMeters = (trainPos.lng - mapCenter.lng) * metersPerDegreeLng;
  
  const latDiffPixels = latDiffMeters / metersPerPixel;
  const lngDiffPixels = lngDiffMeters / metersPerPixel;
  
  const screenX = viewportWidth / 2 + lngDiffPixels;
  const screenY = viewportHeight / 2 - latDiffPixels; // Y is inverted in screen space
  
  const deadZoneLeft = viewportWidth * (deadZone.centerX - deadZone.width / 2);
  const deadZoneRight = viewportWidth * (deadZone.centerX + deadZone.width / 2);
  const deadZoneTop = viewportHeight * (deadZone.centerY - deadZone.height / 2);
  const deadZoneBottom = viewportHeight * (deadZone.centerY + deadZone.height / 2);
  
  return (
    screenX < deadZoneLeft ||
    screenX > deadZoneRight ||
    screenY < deadZoneTop ||
    screenY > deadZoneBottom
  );
}

/**
 * Get dead zone based on confidence level
 */
export function getDeadZoneForConfidence(confidence: ConfidenceLevel): DeadZone {
  switch (confidence) {
    case 'high':
      return { centerX: 0.5, centerY: 0.5, width: 0.6, height: 0.6 }; // 60% center
    case 'medium':
      return { centerX: 0.5, centerY: 0.5, width: 0.8, height: 0.8 }; // 80% center
    case 'low':
      return { centerX: 0.5, centerY: 0.5, width: 0.9, height: 0.9 }; // 90% center
    case 'unknown':
      return { centerX: 0.5, centerY: 0.5, width: 1.0, height: 1.0 }; // Full screen (effectively disabled)
    default:
      return { centerX: 0.5, centerY: 0.5, width: 0.6, height: 0.6 };
  }
}

/**
 * Calculate target position to keep train in dead zone
 * Moves camera just enough to re-enter dead zone, not to exact center
 */
export function calculateFollowTarget(
  trainPos: Position,
  currentCenter: Position,
  deadZone: DeadZone,
  mapZoom: number,
  viewportSize?: { width: number; height: number }
): Position {
  // Use actual viewport size if provided, otherwise use defaults
  const viewportWidth = viewportSize?.width || 1000;
  const viewportHeight = viewportSize?.height || 800;
  
  // Convert lat/lng to screen coordinates
  const metersPerDegreeLat = 111000;
  const metersPerDegreeLng = 111000 * Math.cos((currentCenter.lat * Math.PI) / 180);
  const metersPerPixel = (40075017 / (256 * Math.pow(2, mapZoom)));
  
  const latDiffMeters = (trainPos.lat - currentCenter.lat) * metersPerDegreeLat;
  const lngDiffMeters = (trainPos.lng - currentCenter.lng) * metersPerDegreeLng;
  
  const latDiffPixels = latDiffMeters / metersPerPixel;
  const lngDiffPixels = lngDiffMeters / metersPerPixel;
  
  const screenX = viewportWidth / 2 + lngDiffPixels;
  const screenY = viewportHeight / 2 - latDiffPixels;
  
  const deadZoneLeft = viewportWidth * (deadZone.centerX - deadZone.width / 2);
  const deadZoneRight = viewportWidth * (deadZone.centerX + deadZone.width / 2);
  const deadZoneTop = viewportHeight * (deadZone.centerY - deadZone.height / 2);
  const deadZoneBottom = viewportHeight * (deadZone.centerY + deadZone.height / 2);
  
  let newLng = currentCenter.lng;
  let newLat = currentCenter.lat;
  
  // Adjust only if outside dead zone
  if (screenX < deadZoneLeft) {
    const offsetPixels = deadZoneLeft - screenX;
    const offsetMeters = offsetPixels * metersPerPixel;
    const offsetDegrees = offsetMeters / metersPerDegreeLng;
    newLng = currentCenter.lng - offsetDegrees;
  } else if (screenX > deadZoneRight) {
    const offsetPixels = screenX - deadZoneRight;
    const offsetMeters = offsetPixels * metersPerPixel;
    const offsetDegrees = offsetMeters / metersPerDegreeLng;
    newLng = currentCenter.lng + offsetDegrees;
  }
  
  if (screenY < deadZoneTop) {
    const offsetPixels = deadZoneTop - screenY;
    const offsetMeters = offsetPixels * metersPerPixel;
    const offsetDegrees = offsetMeters / metersPerDegreeLat;
    newLat = currentCenter.lat + offsetDegrees;
  } else if (screenY > deadZoneBottom) {
    const offsetPixels = screenY - deadZoneBottom;
    const offsetMeters = offsetPixels * metersPerPixel;
    const offsetDegrees = offsetMeters / metersPerDegreeLat;
    newLat = currentCenter.lat - offsetDegrees;
  }
  
  return { lat: newLat, lng: newLng };
}

/**
 * Get major hub positions for ambient mode
 */
function getMajorHubPositions(): Position[] {
  const hubs: Position[] = [];
  for (const station of STATION_DATABASE) {
    if (MAJOR_STATIONS.has(station.name)) {
      hubs.push(station.position);
    }
  }
  return hubs;
}

/**
 * Find clusters of active trains for ambient mode
 */
export function findTrainClusters(trains: Train[]): Position[] {
  const activeTrains = trains.filter(
    (t) => t.locationHypothesis?.position && t.state !== 'terminated'
  );
  
  if (activeTrains.length === 0) {
    return [];
  }
  
  // Simple clustering: group trains within ~5km of each other
  const clusters: Position[] = [];
  const processed = new Set<string>();
  
  for (const train of activeTrains) {
    if (!train.locationHypothesis?.position || processed.has(train.id)) {
      continue;
    }
    
    const cluster: Train[] = [train];
    processed.add(train.id);
    
    for (const other of activeTrains) {
      if (
        processed.has(other.id) ||
        !other.locationHypothesis?.position
      ) {
        continue;
      }
      
      const dist = positionDistance(
        train.locationHypothesis.position,
        other.locationHypothesis.position
      );
      
      // ~5km threshold (roughly 0.045 degrees)
      if (dist < 0.045) {
        cluster.push(other);
        processed.add(other.id);
      }
    }
    
    // Calculate cluster center
    if (cluster.length > 1) {
      const avgLat =
        cluster.reduce((sum, t) => sum + (t.locationHypothesis!.position!.lat), 0) /
        cluster.length;
      const avgLng =
        cluster.reduce((sum, t) => sum + (t.locationHypothesis!.position!.lng), 0) /
        cluster.length;
      clusters.push({ lat: avgLat, lng: avgLng });
    } else {
      // Single train - use its position
      clusters.push(train.locationHypothesis.position);
    }
  }
  
  return clusters;
}

/**
 * Select next ambient target
 * Priority: train clusters > major hubs > rotating viewpoints
 */
export function selectAmbientTarget(
  trains: Train[],
  lastTargetIndex: number,
  lastTargets: Position[]
): { target: Position; index: number } | null {
  const clusters = findTrainClusters(trains);
  const hubs = getMajorHubPositions();
  
  // Combine all potential targets
  const allTargets: Position[] = [...clusters, ...hubs];
  
  if (allTargets.length === 0) {
    // Fallback: default center
    return {
      target: { lat: 40.7178, lng: -74.0431 },
      index: 0,
    };
  }
  
  // Avoid revisiting the same target consecutively
  let nextIndex = (lastTargetIndex + 1) % allTargets.length;
  
  // If we've seen this target recently, skip to next
  if (lastTargets.length > 0) {
    const lastTarget = lastTargets[lastTargets.length - 1];
    const nextTarget = allTargets[nextIndex];
    const dist = positionDistance(lastTarget, nextTarget);
    
    // If too close to last target, skip
    if (dist < 0.01) {
      nextIndex = (nextIndex + 1) % allTargets.length;
    }
  }
  
  return {
    target: allTargets[nextIndex],
    index: nextIndex,
  };
}

/**
 * Camera Controller Class
 * Single authority for all camera movements
 */
export class CameraController {
  private state: CameraState;
  private ambientTargets: Position[] = [];
  private ambientMoveStartTs?: number;
  private ambientMoveDuration: number = 12000; // 12 seconds default
  
  constructor() {
    this.state = {
      mode: 'manual',
      lastUserInteractionTs: Date.now(),
    };
  }
  
  /**
   * Get current camera state
   */
  getState(): CameraState {
    return { ...this.state };
  }
  
  /**
   * Set camera mode
   */
  setMode(mode: CameraMode, targetTrainId?: string): void {
    this.state.mode = mode;
    this.state.targetTrainId = targetTrainId;
    
    if (mode === 'ambient') {
      this.state.lastAmbientMoveTs = Date.now();
      this.ambientMoveStartTs = undefined;
    } else {
      this.ambientMoveStartTs = undefined;
    }
  }
  
  /**
   * Record user interaction - switches to manual mode
   */
  recordUserInteraction(): void {
    this.state.mode = 'manual';
    this.state.targetTrainId = undefined;
    this.state.lastUserInteractionTs = Date.now();
    this.ambientMoveStartTs = undefined;
  }
  
  /**
   * Update current camera position (called by map component)
   */
  updateCameraPosition(center: Position, zoom: number): void {
    this.state.currentCenter = center;
    this.state.currentZoom = zoom;
  }
  
  /**
   * Check if ambient mode should activate
   * Activates after 60-90 seconds of no interaction
   */
  shouldActivateAmbient(idleThresholdMs: number = 75000): boolean {
    if (this.state.mode === 'follow_train') {
      return false;
    }
    
    const idleTime = Date.now() - this.state.lastUserInteractionTs;
    return idleTime >= idleThresholdMs;
  }
  
  /**
   * Get camera target for current mode
   */
  getCameraTarget(
    trains: Train[],
    viewportSize?: { width: number; height: number }
  ): CameraTarget | null {
    if (!this.state.currentCenter || !this.state.currentZoom) {
      return null;
    }
    const now = Date.now();
    
    switch (this.state.mode) {
      case 'manual':
        return null; // No automatic movement
        
      case 'follow_train': {
        if (!this.state.targetTrainId || !this.state.currentCenter || !this.state.currentZoom) {
          return null;
        }
        
        const train = trains.find((t) => t.id === this.state.targetTrainId);
        if (!train?.locationHypothesis?.position) {
          return null;
        }
        
        const confidence = train.locationHypothesis.confidence;
        
        // Freeze camera if confidence is too low
        if (confidence === 'low' || confidence === 'unknown') {
          return null; // Camera freezes
        }
        
        const deadZone = getDeadZoneForConfidence(confidence);
        
        // Check if train is outside dead zone
        if (
          isOutsideDeadZone(
            train.locationHypothesis.position,
            this.state.currentCenter,
            this.state.currentZoom,
            deadZone,
            viewportSize
          )
        ) {
          const target = calculateFollowTarget(
            train.locationHypothesis.position,
            this.state.currentCenter,
            deadZone,
            this.state.currentZoom,
            viewportSize
          );
          
          return {
            center: target,
            zoom: this.state.currentZoom, // Keep zoom fixed
          };
        }
        
        return null; // Train is in dead zone, no movement needed
      }
      
      case 'ambient': {
        // Check if we're currently in a move
        if (this.ambientMoveStartTs) {
          const moveElapsed = now - this.ambientMoveStartTs;
          if (moveElapsed < this.ambientMoveDuration) {
            // Still moving - don't return target, let animation complete
            return null;
          } else {
            // Move complete - clear and wait
            this.ambientMoveStartTs = undefined;
            this.state.lastAmbientMoveTs = now;
            return null;
          }
        }
        
        // Check if we should start a new ambient movement
        const timeSinceLastMove = this.state.lastAmbientMoveTs
          ? now - this.state.lastAmbientMoveTs
          : Infinity;
        
        // Wait at least 3 minutes between moves (pause fully between moves)
        if (timeSinceLastMove < 180000) {
          return null;
        }
        
        // Start new movement
        const target = selectAmbientTarget(
          trains,
          this.state.ambientTargetIndex || 0,
          this.ambientTargets
        );
        
        if (!target) {
          return null;
        }
        
        this.ambientTargets.push(target.target);
        if (this.ambientTargets.length > 5) {
          this.ambientTargets.shift(); // Keep only last 5
        }
        
        this.state.ambientTargetIndex = target.index;
        this.ambientMoveStartTs = now;
        
        // Randomize duration between 8-15 seconds
        this.ambientMoveDuration = 8000 + Math.random() * 7000;
        
        return {
          center: target.target,
          duration: this.ambientMoveDuration,
        };
      }
      
      default:
        return null;
    }
  }
  
  /**
   * Check if train confidence allows following
   */
  canFollowTrain(train: Train): boolean {
    const confidence = train.locationHypothesis?.confidence || 'unknown';
    return confidence !== 'unknown';
  }
  
  /**
   * Get confidence warning for follow mode
   */
  getConfidenceWarning(train: Train): string | null {
    const confidence = train.locationHypothesis?.confidence || 'unknown';
    if (confidence === 'low') {
      return 'Location uncertain';
    }
    if (confidence === 'unknown') {
      return 'Location unknown - camera frozen';
    }
    return null;
  }
}

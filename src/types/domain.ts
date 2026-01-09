/**
 * Core domain types for the NJ Transit Real-Time Rail Map
 * Based on evidence-driven, hypothesis-based architecture
 */

/**
 * Confidence levels for location hypotheses
 * Semantic levels that affect rendering, animation, and user messaging
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown';

/**
 * Train operational status
 */
export type TrainStatus = 'on_time' | 'delayed' | 'unknown';

/**
 * Inferred train state
 */
export type TrainState = 
  | 'at_station' 
  | 'departing' 
  | 'in_transit' 
  | 'terminated' 
  | 'unknown';

/**
 * Geographic position
 */
export interface Position {
  lat: number;
  lng: number;
}

/**
 * Route-relative position (used when absolute position unavailable)
 */
export interface RoutePosition {
  line: string;
  fromStation: string;
  toStation: string;
  progress: number; // 0.0 to 1.0 along segment
}

/**
 * Evidence supporting a location hypothesis
 */
export interface Evidence {
  id: string;
  type: 'direct_position' | 'station_sighting' | 'prediction' | 'schedule';
  timestamp: number; // Unix timestamp in milliseconds
  source: string; // Provider identifier
  data: Record<string, unknown>; // Provider-specific evidence data
}

/**
 * Location Hypothesis
 * Answers: "Where do we believe this train is right now, and how sure are we?"
 */
export interface LocationHypothesis {
  id: string;
  trainId: string;
  position?: Position;
  routePosition?: RoutePosition;
  timestamp: number;
  confidence: ConfidenceLevel;
  evidence: Evidence[];
  explanation: string; // Human-readable: "based on X and Y"
}

/**
 * Train entity
 */
export interface Train {
  id: string;
  trainNumber?: string;
  line: string;
  direction: string;
  destination: string;
  status: TrainStatus;
  delaySeconds?: number;
  nextStop?: string;
  locationHypothesis?: LocationHypothesis;
  lastUpdateTime: number;
  state: TrainState;
}

/**
 * Provider observation
 */
export interface ProviderObservation {
  provider: string;
  timestamp: number;
  trains: ProviderTrainData[];
}

/**
 * Raw train data from a provider
 */
export interface ProviderTrainData {
  trainNumber?: string;
  line: string;
  direction: string;
  destination?: string;
  position?: Position;
  station?: string;
  delaySeconds?: number;
  nextStop?: string;
  status?: string;
  rawData: Record<string, unknown>;
}

/**
 * Station information
 */
export interface Station {
  id: string;
  name: string;
  position: Position;
  lines: string[];
}

/**
 * Line configuration
 */
export interface Line {
  id: string;
  name: string;
  stations: Station[];
  color?: string;
}


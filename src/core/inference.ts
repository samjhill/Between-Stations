/**
 * Inference Engine
 * 
 * Infers train state and location hypotheses from evidence
 * Implements route-relative positioning and temporal reasoning
 */

import type {
  Train,
  LocationHypothesis,
  ConfidenceLevel,
  TrainState,
  TrainStatus,
  Evidence,
  ProviderObservation,
  Position,
  RoutePosition,
} from '../types/domain';

/**
 * Determines confidence level based on evidence recency and type
 */
function calculateConfidence(
  evidence: Evidence[],
  currentTime: number
): ConfidenceLevel {
  if (evidence.length === 0) return 'unknown';

  const maxAge = 5 * 60 * 1000; // 5 minutes
  const freshThreshold = 60 * 1000; // 1 minute

  const freshEvidence = evidence.filter(
    (e) => currentTime - e.timestamp < freshThreshold
  );

  const directEvidence = evidence.filter((e) => e.type === 'direct_position');
  const scheduleEvidence = evidence.filter((e) => e.type === 'schedule' || e.source === 'timetable');
  
  // Check for explicit estimated_low confidence from timetable
  const hasTimetableLowConfidence = evidence.some(
    (e) => e.data.confidence === 'estimated_low' || e.source === 'timetable'
  );

  // If only schedule evidence, return low confidence
  if (hasTimetableLowConfidence && scheduleEvidence.length > 0 && directEvidence.length === 0) {
    return 'low';
  }

  // High confidence: direct, fresh evidence
  if (
    directEvidence.length > 0 &&
    directEvidence.some((e) => currentTime - e.timestamp < freshThreshold)
  ) {
    return 'high';
  }

  // Medium confidence: multiple signals, recent, or mixed direct/indirect
  if (
    evidence.length >= 2 &&
    freshEvidence.length > 0 &&
    currentTime - evidence[evidence.length - 1].timestamp < maxAge
  ) {
    return 'medium';
  }

  // Low confidence: minimal or old evidence
  if (evidence.some((e) => currentTime - e.timestamp < maxAge)) {
    return 'low';
  }

  return 'unknown';
}

/**
 * Generates human-readable explanation for a hypothesis
 */
function generateExplanation(evidence: Evidence[]): string {
  if (evidence.length === 0) {
    return 'No evidence available';
  }

  const sources = new Set(evidence.map((e) => e.source));
  const types = new Set(evidence.map((e) => e.type));

  const parts: string[] = [];

  if (types.has('direct_position')) {
    parts.push('GPS position');
  }
  if (types.has('station_sighting')) {
    parts.push('station observation');
  }
  if (types.has('prediction')) {
    parts.push('schedule prediction');
  }
  if (types.has('schedule') || sources.has('timetable')) {
    parts.push('timetable schedule');
  }

  const sourceList = Array.from(sources).join(' and ');
  if (parts.length > 0) {
    return `Based on ${parts.join(', ')} from ${sourceList}`;
  }

  return `Based on evidence from ${sourceList}`;
}

/**
 * Infers train state from evidence
 */
function inferTrainState(
  evidence: Evidence[],
  currentTime: number
): TrainState {
  if (evidence.length === 0) return 'unknown';

  // Check for station sightings
  const stationSightings = evidence.filter(
    (e) => e.type === 'station_sighting'
  );
  const recentStationSighting = stationSightings.find(
    (e) => currentTime - e.timestamp < 2 * 60 * 1000
  );

  if (recentStationSighting) {
    const data = recentStationSighting.data;
    if (data.event === 'departure' || data.event === 'departing') {
      return 'departing';
    }
    if (data.event === 'arrival' || data.event === 'at_station') {
      return 'at_station';
    }
  }

  // Check for termination
  const terminationEvidence = evidence.find(
    (e) => e.data.terminated === true || e.data.status === 'terminated'
  );
  if (terminationEvidence) {
    return 'terminated';
  }

  // Default to in_transit if we have recent evidence
  const recentEvidence = evidence.some(
    (e) => currentTime - e.timestamp < 5 * 60 * 1000
  );
  if (recentEvidence) {
    return 'in_transit';
  }

  return 'unknown';
}

/**
 * Determines train status (on time, delayed, unknown)
 */
function inferTrainStatus(evidence: Evidence[]): TrainStatus {
  const delayEvidence = evidence.find((e) => typeof e.data.delaySeconds === 'number');
  
  if (delayEvidence) {
    const delay = delayEvidence.data.delaySeconds as number;
    return delay > 60 ? 'delayed' : 'on_time';
  }

  return 'unknown';
}

/**
 * Merges multiple position estimates into a single hypothesis
 */
function mergePositions(
  evidence: Evidence[]
): { position?: Position; routePosition?: RoutePosition } {
  // Prefer direct positions
  const directPositions = evidence
    .filter((e) => e.type === 'direct_position' && e.data.position)
    .map((e) => ({
      position: e.data.position as Position,
      timestamp: e.timestamp,
      weight: 1.0 / (1 + (Date.now() - e.timestamp) / (60 * 1000)), // Decay with age
    }));

  if (directPositions.length > 0) {
    // Weighted average of direct positions
    const totalWeight = directPositions.reduce((sum, p) => sum + p.weight, 0);
    const avgLat =
      directPositions.reduce(
        (sum, p) => sum + p.position.lat * p.weight,
        0
      ) / totalWeight;
    const avgLng =
      directPositions.reduce(
        (sum, p) => sum + p.position.lng * p.weight,
        0
      ) / totalWeight;

    return { position: { lat: avgLat, lng: avgLng } };
  }

  // Fallback to route-relative positioning
  const routeEvidence = evidence.find(
    (e) =>
      e.type === 'prediction' &&
      e.data.line &&
      e.data.fromStation &&
      e.data.toStation
  );

  if (routeEvidence) {
    return {
      routePosition: {
        line: routeEvidence.data.line as string,
        fromStation: routeEvidence.data.fromStation as string,
        toStation: routeEvidence.data.toStation as string,
        progress: (routeEvidence.data.progress as number) || 0.5,
      },
    };
  }

  return {};
}

/**
 * Creates a location hypothesis from evidence
 */
export function createLocationHypothesis(
  trainId: string,
  evidence: Evidence[]
): LocationHypothesis | null {
  if (evidence.length === 0) return null;

  const currentTime = Date.now();
  const confidence = calculateConfidence(evidence, currentTime);
  const { position, routePosition } = mergePositions(evidence);

  // Need at least some position information
  if (!position && !routePosition) {
    return null;
  }

  // Sort evidence by timestamp (most recent first)
  const sortedEvidence = [...evidence].sort(
    (a, b) => b.timestamp - a.timestamp
  );

  return {
    id: `hyp-${trainId}-${currentTime}`,
    trainId,
    position,
    routePosition,
    timestamp: sortedEvidence[0].timestamp,
    confidence,
    evidence: sortedEvidence,
    explanation: generateExplanation(sortedEvidence),
  };
}

/**
 * Merge multiple provider observations into train entities
 */
export function mergeObservations(
  observations: ProviderObservation[]
): Train[] {
  console.log('mergeObservations: Received observations:', observations.length);
  
  // Group observations by train ID
  const trainMap = new Map<string, Evidence[]>();

  for (const observation of observations) {
    console.log(`mergeObservations: Processing observation from ${observation.provider} with ${observation.trains.length} trains`);
    
    for (const trainData of observation.trains) {
      const trainId =
        trainData.trainNumber || `${trainData.line}-${trainData.direction}`;

      if (!trainMap.has(trainId)) {
        trainMap.set(trainId, []);
      }

      console.log(`mergeObservations: Train ${trainId} has position:`, trainData.position);

      // Determine evidence type
      let evidenceType: Evidence['type'] = 'prediction';
      if (trainData.position) {
        evidenceType = 'direct_position';
      } else if (trainData.station) {
        evidenceType = 'station_sighting';
      } else if (observation.provider === 'timetable' || trainData.rawData.source === 'timetable') {
        evidenceType = 'schedule';
      }

      const evidence: Evidence = {
        id: `ev-${observation.provider}-${observation.timestamp}-${trainId}`,
        type: evidenceType,
        timestamp: observation.timestamp,
        source: observation.provider,
        data: {
          ...trainData.rawData,
          position: trainData.position,
          station: trainData.station,
          delaySeconds: trainData.delaySeconds,
          nextStop: trainData.nextStop,
          line: trainData.line,
          direction: trainData.direction,
          destination: trainData.destination,
        },
      };

      trainMap.get(trainId)!.push(evidence);
    }
  }

  console.log('mergeObservations: Grouped into', trainMap.size, 'unique trains');

  // Create trains from merged evidence
  const trains: Train[] = [];

  for (const [trainId, evidence] of trainMap.entries()) {
    console.log(`mergeObservations: Creating hypothesis for train ${trainId} with ${evidence.length} evidence items`);
    const locationHypothesis = createLocationHypothesis(trainId, evidence);
    
    if (!locationHypothesis) {
      console.warn(`mergeObservations: No location hypothesis for train ${trainId}`);
      continue; // Skip trains without position
    }

    console.log(`mergeObservations: Train ${trainId} has hypothesis with position:`, locationHypothesis.position);

    const mostRecentEvidence = evidence[0];
    const data = mostRecentEvidence.data;

    const status = inferTrainStatus(evidence);
    const state = inferTrainState(evidence, Date.now());

    trains.push({
      id: trainId,
      trainNumber: data.trainNumber as string | undefined,
      line: (data.line as string) || 'unknown',
      direction: (data.direction as string) || 'unknown',
      destination: (data.destination as string) || 'unknown',
      status,
      delaySeconds: data.delaySeconds as number | undefined,
      nextStop: data.nextStop as string | undefined,
      locationHypothesis,
      lastUpdateTime: Date.now(),
      state,
    });
  }

  console.log('mergeObservations: Returning', trains.length, 'trains');
  return trains;
}


/**
 * Timetable Provider
 * 
 * Extrapolates train positions from official PDF timetables.
 * Uses scheduled times to determine where trains should be at any given moment.
 * 
 * Confidence: "estimated_low" - schedule-based, no real-time delays
 */

import { BaseProvider } from '../core/Provider';
import type { ProviderObservation, ProviderTrainData } from '../types/domain';
import type { ScheduledTrip, ScheduledStop } from '../types/schedule';
import { getCurrentTimeSeconds, isWeekday } from '../core/timeUtils';
import { interpolatePosition, mapStationName } from '../core/stationMapping';

/**
 * Load schedules from JSON files
 * These should be pre-processed from PDFs using the build script
 */
async function loadSchedules(): Promise<ScheduledTrip[]> {
  try {
    const scheduleType = isWeekday() ? 'weekday' : 'weekend';
    
    // Try to load from public/schedules/ directory
    // In Vite, public files are served from the root
    const response = await fetch(`/schedules/${scheduleType}.json`);
    
    if (!response.ok) {
      console.warn(`[TimetableProvider] Could not load ${scheduleType} schedules: ${response.statusText}`);
      return [];
    }
    
    const trips: ScheduledTrip[] = await response.json();
    return trips;
  } catch (error) {
    console.warn('[TimetableProvider] Error loading schedules:', error);
    return [];
  }
}

/**
 * Find active trips at the current time
 */
function findActiveTrips(trips: ScheduledTrip[], currentTimeSeconds: number): ScheduledTrip[] {
  return trips.filter(trip => {
    if (trip.stops.length === 0) return false;

    const firstStopTime = trip.stops[0].arrival_time;
    const lastStopTime = trip.stops[trip.stops.length - 1].arrival_time;

    // Trip is active if current time is between first and last stop
    // Account for overnight trips (lastStopTime might be next day)
    const lastStopAdjusted = lastStopTime < firstStopTime 
      ? lastStopTime + 86400 // Next day
      : lastStopTime;

    return currentTimeSeconds >= firstStopTime && currentTimeSeconds <= lastStopAdjusted;
  });
}

/**
 * Find the current segment for an active trip
 */
function findCurrentSegment(
  trip: ScheduledTrip,
  currentTimeSeconds: number
): { fromStop: ScheduledStop; toStop: ScheduledStop; progress: number } | null {
  if (trip.stops.length < 2) return null;

  // Handle overnight: if current time is before first stop, it might be next day
  let adjustedCurrentTime = currentTimeSeconds;
  if (currentTimeSeconds < trip.stops[0].arrival_time) {
    // Check if we're in an overnight window (after midnight but before first stop)
    // For simplicity, if current time is < 6 AM, treat as next day
    if (currentTimeSeconds < 21600) { // 6 AM = 6 * 3600
      adjustedCurrentTime += 86400; // Add 24 hours
    }
  }

  // Find consecutive stops where current time is between them
  for (let i = 0; i < trip.stops.length - 1; i++) {
    const fromStop = trip.stops[i];
    let toStop = trip.stops[i + 1];
    
    // Handle overnight: if toStop time is less than fromStop, it's next day
    let toStopTime = toStop.arrival_time;
    if (toStopTime < fromStop.arrival_time) {
      toStopTime += 86400;
    }

    if (adjustedCurrentTime >= fromStop.arrival_time && adjustedCurrentTime <= toStopTime) {
      // Calculate progress along segment
      const segmentDuration = toStopTime - fromStop.arrival_time;
      const elapsed = adjustedCurrentTime - fromStop.arrival_time;
      const progress = segmentDuration > 0 ? elapsed / segmentDuration : 0;
      
      return {
        fromStop,
        toStop,
        progress: Math.max(0, Math.min(1, progress)), // Clamp to [0, 1]
      };
    }
  }

  // If we're before first stop, return first segment with 0 progress
  if (adjustedCurrentTime < trip.stops[0].arrival_time) {
    return {
      fromStop: trip.stops[0],
      toStop: trip.stops[1],
      progress: 0,
    };
  }

  // If we're after last stop, return last segment with 1.0 progress
  if (adjustedCurrentTime > trip.stops[trip.stops.length - 1].arrival_time) {
    const lastIndex = trip.stops.length - 1;
    return {
      fromStop: trip.stops[lastIndex - 1],
      toStop: trip.stops[lastIndex],
      progress: 1.0,
    };
  }

  return null;
}

/**
 * Calculate position for an active trip
 */
function calculateTripPosition(trip: ScheduledTrip, segment: { fromStop: ScheduledStop; toStop: ScheduledStop; progress: number }): { position?: { lat: number; lng: number }; routePosition?: any } | null {
  // Get station coordinates
  const fromMapped = mapStationName(segment.fromStop.station_name, trip.line_id);
  const toMapped = mapStationName(segment.toStop.station_name, trip.line_id);

  if (!fromMapped || !toMapped) {
    return null;
  }

  // Interpolate position
  const position = interpolatePosition(
    { position: fromMapped.position },
    { position: toMapped.position },
    segment.progress
  );

  return {
    position,
    routePosition: {
      line: trip.line_id,
      fromStation: segment.fromStop.stop_id,
      toStation: segment.toStop.stop_id,
      progress: segment.progress,
    },
  };
}

export class TimetableProvider extends BaseProvider {
  readonly id = 'timetable';
  readonly name = 'Timetable Schedule';
  readonly updateInterval = 10000; // Update every 10 seconds for smooth movement

  private schedules: ScheduledTrip[] = [];
  private schedulesLoaded = false;

  constructor() {
    super();
    this.loadSchedules();
  }

  private async loadSchedules() {
    try {
      // Try to load from JSON files (would be pre-processed from PDFs)
      // For now, use empty array - in production these would be loaded
      this.schedules = await loadSchedules();
      this.markAvailable();
      this.schedulesLoaded = true;
      console.log(`[TimetableProvider] Loaded ${this.schedules.length} scheduled trips`);
    } catch (error) {
      console.warn('[TimetableProvider] Could not load schedules:', error);
      this.markUnavailable(error instanceof Error ? error : new Error(String(error)));
      this.schedulesLoaded = true; // Mark as loaded even if empty to avoid retries
    }
  }

  async fetchObservations(): Promise<ProviderObservation | null> {
    if (!this.schedulesLoaded) {
      await this.loadSchedules();
    }

    if (this.schedules.length === 0) {
      // No schedules loaded yet - return empty observation (not an error)
      return {
        provider: this.id,
        timestamp: Date.now(),
        trains: [],
      };
    }

    const currentTimeSeconds = getCurrentTimeSeconds();
    const isWeekend = !isWeekday();

    // Filter trips by service type
    const applicableTrips = this.schedules.filter(
      trip => trip.service_type === (isWeekend ? 'weekend' : 'weekday')
    );

    // Find active trips
    const activeTrips = findActiveTrips(applicableTrips, currentTimeSeconds);

    const trains: ProviderTrainData[] = [];

    for (const trip of activeTrips) {
      const segment = findCurrentSegment(trip, currentTimeSeconds);
      
      if (!segment) {
        continue; // Skip if we can't determine position
      }

      const positionData = calculateTripPosition(trip, segment);
      
      if (!positionData || !positionData.position) {
        continue; // Skip if we can't calculate position
      }

      // Determine next stop
      const nextStopIndex = trip.stops.findIndex(s => s.stop_id === segment.toStop.stop_id);
      const nextStop = nextStopIndex >= 0 && nextStopIndex < trip.stops.length - 1
        ? trip.stops[nextStopIndex + 1].station_name
        : segment.toStop.station_name;

      trains.push({
        trainNumber: trip.train_id,
        line: trip.line_id,
        direction: trip.direction === 'inbound' ? 'TO NY' : 'OUTBOUND',
        destination: trip.stops[trip.stops.length - 1].station_name,
        position: positionData.position,
        nextStop: nextStop,
        rawData: {
          source: 'timetable',
          trip_id: `${trip.line_id}-${trip.train_id}`,
          fromStop: segment.fromStop.stop_id,
          toStop: segment.toStop.stop_id,
          progress: segment.progress,
          confidence: 'estimated_low',
        },
      });
    }

    this.markAvailable();
    this.updateFetchTime();

    return {
      provider: this.id,
      timestamp: Date.now(),
      trains,
    };
  }
}


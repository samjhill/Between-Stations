/**
 * Mock NJ Transit Provider
 * 
 * Simulates NJ Transit train data for development/testing
 * In production, this would be replaced with actual API integration
 */

import { BaseProvider } from '../core/Provider';
import type { ProviderObservation, ProviderTrainData } from '../types/domain';

// Sample train routes with approximate coordinates for NJ Transit lines
const SAMPLE_LINES = {
  'Northeast Corridor': {
    stations: [
      { name: 'New York Penn Station', lat: 40.7506, lng: -73.9935 },
      { name: 'Newark Penn Station', lat: 40.7347, lng: -74.1642 },
      { name: 'Newark Airport', lat: 40.6895, lng: -74.1745 },
      { name: 'Trenton', lat: 40.2176, lng: -74.7425 },
    ],
  },
  'North Jersey Coast': {
    stations: [
      { name: 'New York Penn Station', lat: 40.7506, lng: -73.9935 },
      { name: 'Long Branch', lat: 40.3043, lng: -73.9924 },
      { name: 'Bay Head', lat: 40.0715, lng: -74.0460 },
    ],
  },
  'Morris & Essex': {
    stations: [
      { name: 'Hoboken', lat: 40.7380, lng: -74.0307 },
      { name: 'Newark Broad St', lat: 40.7323, lng: -74.1705 },
      { name: 'Summit', lat: 40.7170, lng: -74.3595 },
    ],
  },
};

/**
 * Generate a mock train position based on line and direction
 */
function generateMockPosition(
  line: string,
  direction: string,
  trainId: number,
  timeOffset: number
): { lat: number; lng: number } {
  const lineData = SAMPLE_LINES[line as keyof typeof SAMPLE_LINES];
  
  // Fallback to first line if line not found
  const stations = lineData?.stations || SAMPLE_LINES['Northeast Corridor'].stations;
  
  if (stations.length < 2) {
    // Fallback position if insufficient stations
    return { lat: 40.7178, lng: -74.0431 };
  }

  // Use time offset and train ID to simulate train movement
  // Each train moves at a different speed based on its ID
  const cycleTime = 120000; // 2 minutes for full cycle
  const speedMultiplier = 0.5 + (trainId % 5) * 0.2; // Different speeds per train (0.5x to 1.5x)
  const adjustedTime = (timeOffset * speedMultiplier) % cycleTime;
  
  // Convert to seconds for easier math
  const totalSegments = stations.length - 1;
  const segmentDuration = cycleTime / totalSegments;
  const currentSegment = Math.floor(adjustedTime / segmentDuration);
  const progressInSegment = Math.max(0, Math.min(1, (adjustedTime % segmentDuration) / segmentDuration));

  // Determine if going north or south
  const isNorthbound = direction === 'North' || direction === 'TO NY';
  
  let fromIndex: number;
  let toIndex: number;
  
  if (isNorthbound) {
    // Moving from higher index to lower index (northbound)
    // Start at the end (higher index) and move towards start (lower index)
    const segment = currentSegment % totalSegments;
    fromIndex = stations.length - 1 - segment;
    toIndex = fromIndex - 1;
  } else {
    // Moving from lower index to higher index (southbound)
    const segment = currentSegment % totalSegments;
    fromIndex = segment;
    toIndex = segment + 1;
  }

  // Ensure valid indices
  fromIndex = Math.max(0, Math.min(stations.length - 1, fromIndex));
  toIndex = Math.max(0, Math.min(stations.length - 1, toIndex));
  
  // If indices are same or invalid, use current station position
  if (fromIndex === toIndex || (isNorthbound && fromIndex < toIndex) || (!isNorthbound && fromIndex > toIndex)) {
    const station = stations[fromIndex];
    return { lat: station.lat, lng: station.lng };
  }

  const from = stations[fromIndex];
  const to = stations[toIndex];

  return {
    lat: from.lat + (to.lat - from.lat) * progressInSegment,
    lng: from.lng + (to.lng - from.lng) * progressInSegment,
  };
}

export class MockNJTransitProvider extends BaseProvider {
  readonly id = 'mock-nj-transit';
  readonly name = 'Mock NJ Transit';
  readonly updateInterval = 5000; // 5 seconds for smoother movement

  private trainSeed = 0;

  constructor() {
    super();
    // Start as available since we can always generate mock data
    this.markAvailable();
  }

  async fetchObservations(): Promise<ProviderObservation | null> {
    try {
      const timestamp = Date.now();
      const trains: ProviderTrainData[] = [];

      // Generate 8-12 mock trains so there are always trains visible
      const numTrains = 8 + (this.trainSeed % 5);
      
      const lines = Object.keys(SAMPLE_LINES);
      const directions = ['North', 'South', 'TO NY', 'TO TRENTON'];

      for (let i = 0; i < numTrains; i++) {
        const line = lines[(this.trainSeed * 2 + i) % lines.length];
        const direction = directions[(this.trainSeed * 3 + i * 2) % directions.length];
        const trainNumber = 1000 + i + ((this.trainSeed % 10) * 10);
        
        // Each train gets a unique time offset based on train ID
        // This ensures trains are at different positions
        const trainTimeOffset = timestamp + (i * 15000) + (this.trainSeed * 5000);
        const position = generateMockPosition(line, direction, trainNumber, trainTimeOffset);

        const delaySeconds = Math.random() > 0.7 ? Math.floor(Math.random() * 300) : 0;

        // Determine next stop based on position
        const lineData = SAMPLE_LINES[line as keyof typeof SAMPLE_LINES];
        const stations = lineData?.stations || [];
        const isNorthbound = direction === 'North' || direction === 'TO NY';
        let nextStop = 'Unknown';
        
        if (stations.length > 0) {
          // Pick a reasonable next stop
          const currentIndex = Math.floor((i * 2) % stations.length);
          if (isNorthbound && currentIndex > 0) {
            nextStop = stations[currentIndex - 1].name;
          } else if (!isNorthbound && currentIndex < stations.length - 1) {
            nextStop = stations[currentIndex + 1].name;
          } else {
            nextStop = stations[Math.max(0, Math.min(stations.length - 1, currentIndex))].name;
          }
        }

        trains.push({
          trainNumber: trainNumber.toString(),
          line,
          direction,
          destination: direction.includes('NY') ? 'New York Penn Station' : 
                       direction.includes('TRENTON') ? 'Trenton' :
                       direction === 'North' ? 'New York Penn Station' : 'Bay Head',
          position,
          delaySeconds: delaySeconds > 0 ? delaySeconds : undefined,
          nextStop,
          rawData: {
            mock: true,
            seed: this.trainSeed + i,
            trainId: trainNumber,
          },
        });
      }

      this.trainSeed++;
      this.markAvailable();
      this.updateFetchTime();

      return {
        provider: this.id,
        timestamp,
        trains,
      };
    } catch (error) {
      this.markUnavailable(error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }
}


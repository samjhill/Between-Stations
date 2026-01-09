/**
 * Schedule domain types for timetable-driven train position extrapolation
 */

/**
 * A scheduled stop along a train route
 */
export interface ScheduledStop {
  stop_id: string;        // Canonical station ID (mapped to GTFS)
  station_name: string;   // Original timetable station name
  arrival_time: number;   // Seconds since midnight
  departure_time?: number; // Optional departure time
}

/**
 * A scheduled trip (train run) from the timetable
 */
export interface ScheduledTrip {
  train_id: string;       // Train number from timetable
  line_id: string;        // Line identifier
  direction: 'inbound' | 'outbound';
  stops: ScheduledStop[]; // Ordered sequence of stops
  service_type: 'weekday' | 'weekend'; // When this schedule applies
}

/**
 * Line name mapping from PDF filenames to canonical line names
 */
export const LINE_NAME_MAP: Record<string, string> = {
  'AC': 'Atlantic City',
  'MB': 'Montclair-Boonton',
  'MC': 'Main/Bergen',
  'ME': 'Morris & Essex',
  'NEC': 'Northeast Corridor',
  'NJCL': 'North Jersey Coast',
  'PV': 'Pascack Valley',
  'RVL': 'Raritan Valley',
};

/**
 * Direction mapping from timetable conventions
 */
export const DIRECTION_MAP: Record<string, 'inbound' | 'outbound'> = {
  'TO NY': 'inbound',
  'TO TRENTON': 'outbound',
  'TO HOBOKEN': 'inbound',
  'TO BAY HEAD': 'outbound',
  'TO SUFFERN': 'outbound',
  'TO HIGH BRIDGE': 'outbound',
  'TO ATLANTIC CITY': 'outbound',
  'INBOUND': 'inbound',
  'OUTBOUND': 'outbound',
  'NORTH': 'inbound',
  'SOUTH': 'outbound',
  'EAST': 'outbound',
  'WEST': 'inbound',
};



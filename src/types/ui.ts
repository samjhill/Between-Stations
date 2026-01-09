/**
 * UI state and filter types
 */

export interface FilterState {
  lines: string[]; // Empty array means "all lines"
  directions: string[]; // Empty array means "all directions"
  confidenceMin: 'high' | 'medium' | 'low' | 'unknown' | 'all';
  searchQuery: string;
}

export interface FollowState {
  trainId: string | null;
  enabled: boolean;
}

export interface ViewState {
  center: [number, number]; // [lat, lng]
  zoom: number;
  following: FollowState;
}


import { useEffect, useState, useCallback } from 'react';
import { MapContainer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ProviderManager } from '../core/Provider';
import { TimetableProvider } from '../providers/TimetableProvider';
import { mergeObservations } from '../core/inference';
import type { Train } from '../types/domain';
import type { FilterState, FollowState } from '../types/ui';
import MapContent from './MapContent';
import TrainList from './TrainList';
import Filters from './Filters';
import TrainDetails from './TrainDetails';
import TrainTooltip from './TrainTooltip';
import '../App.css';

// Center on New Jersey/New York area
const DEFAULT_CENTER: [number, number] = [40.7178, -74.0431];
const DEFAULT_ZOOM = 10;

export default function MapView() {
  const [trains, setTrains] = useState<Train[]>([]);
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);
  const [filterState, setFilterState] = useState<FilterState>({
    lines: [],
    directions: [],
    confidenceMin: 'all',
    searchQuery: '',
  });
  const [followState, setFollowState] = useState<FollowState>({
    trainId: null,
    enabled: false,
  });
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Initialize provider manager
  const [providerManager] = useState(() => {
    const manager = new ProviderManager();
    // Register timetable provider (schedule-based position extrapolation)
    const timetableProvider = new TimetableProvider();
    manager.register(timetableProvider);
    return manager;
  });

  // Fetch train data
  const fetchTrains = useCallback(async () => {
    try {
      const observations = await providerManager.fetchAllObservations();
      console.log('Observations received:', observations.length, observations);
      const mergedTrains = mergeObservations(observations);
      console.log('Merged trains:', mergedTrains.length, mergedTrains);
      setTrains(mergedTrains);
    } catch (error) {
      console.error('Error fetching trains:', error);
    }
  }, [providerManager]);

  // Initial fetch and set up polling
  useEffect(() => {
    fetchTrains();
    
    const providers = providerManager.getProviders();
    const minInterval = Math.min(...providers.map(p => p.updateInterval));
    
    const interval = setInterval(() => {
      fetchTrains();
    }, minInterval);

    return () => clearInterval(interval);
  }, [fetchTrains, providerManager]);

  // Filter trains
  const filteredTrains = trains.filter((train) => {
    if (filterState.lines.length > 0 && !filterState.lines.includes(train.line)) {
      return false;
    }
    if (filterState.directions.length > 0 && !filterState.directions.includes(train.direction)) {
      return false;
    }
    if (filterState.confidenceMin !== 'all') {
      const confidenceOrder = { high: 3, medium: 2, low: 1, unknown: 0 };
      const trainConfidence = train.locationHypothesis?.confidence || 'unknown';
      const minConfidence = filterState.confidenceMin;
      if (confidenceOrder[trainConfidence] < confidenceOrder[minConfidence]) {
        return false;
      }
    }
    if (filterState.searchQuery) {
      const query = filterState.searchQuery.toLowerCase();
      const matches =
        train.trainNumber?.toLowerCase().includes(query) ||
        train.line.toLowerCase().includes(query) ||
        train.destination.toLowerCase().includes(query) ||
        train.nextStop?.toLowerCase().includes(query);
      if (!matches) return false;
    }
    return true;
  });

  // Camera controller now handles follow mode - no need for this effect

  const handleTrainClick = (train: Train) => {
    setSelectedTrain(train);
    // Don't open sidebar - tooltip will show instead
  };

  const handleFollowTrain = (trainId: string | null) => {
    setFollowState({
      trainId,
      enabled: trainId !== null,
    });
  };

  return (
    <div className="app">
      {/* Minimal floating header with actions */}
      <div className="app-header-actions-overlay">
        <div className="app-header-actions-container">
          <button
            className={`icon-button ${filtersOpen ? 'active' : ''}`}
            onClick={() => setFiltersOpen(!filtersOpen)}
            title="Filters"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="4" x2="17" y2="4"/>
              <line x1="7" y1="10" x2="17" y2="10"/>
              <line x1="11" y1="16" x2="17" y2="16"/>
              <circle cx="3" cy="4" r="1.5"/>
              <circle cx="7" cy="10" r="1.5"/>
              <circle cx="11" cy="16" r="1.5"/>
            </svg>
          </button>
          <button
            className={`icon-button ${sidebarOpen ? 'active' : ''}`}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Train List"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="16" y2="6"/>
              <line x1="4" y1="10" x2="16" y2="10"/>
              <line x1="4" y1="14" x2="16" y2="14"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Floating filters panel */}
      {filtersOpen && (
        <div className="filters-panel">
          <Filters
            trains={trains}
            filterState={filterState}
            onFilterChange={setFilterState}
            onClose={() => setFiltersOpen(false)}
          />
        </div>
      )}
      
      <div className="app-content">
        {/* Sidebar backdrop */}
        {sidebarOpen && (
          <div
            className={`sidebar-backdrop ${sidebarOpen ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="app-map">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
            attributionControl={false}
          >
            {/* No TileLayer - using flat MiniMetro-style background */}
            <MapContent
              trains={filteredTrains}
              selectedTrain={selectedTrain}
              followState={followState}
              filterState={filterState}
              onTrainClick={handleTrainClick}
              onFollowTrain={handleFollowTrain}
            />
          </MapContainer>
        </div>

        {/* Slide-in sidebar */}
        <div className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h2>Trains ({filteredTrains.length})</h2>
            <button
              className="icon-button close-sidebar"
              onClick={() => setSidebarOpen(false)}
              title="Close"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="5" x2="15" y2="15"/>
                <line x1="15" y1="5" x2="5" y2="15"/>
              </svg>
            </button>
          </div>
          <div className="sidebar-content">
            <TrainList
              trains={filteredTrains}
              selectedTrain={selectedTrain}
              followState={followState}
              onTrainClick={(train) => {
                handleTrainClick(train);
              }}
              onFollowTrain={handleFollowTrain}
            />
            {selectedTrain && (
              <TrainDetails
                train={selectedTrain}
                onClose={() => setSelectedTrain(null)}
                onFollow={() => handleFollowTrain(selectedTrain.id)}
                isFollowing={followState.enabled && followState.trainId === selectedTrain.id}
              />
            )}
          </div>
        </div>
      </div>

      {/* Train count badge */}
      {filteredTrains.length > 0 && (
        <div className="train-count-badge">
          {filteredTrains.length} train{filteredTrains.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Train tooltip - floating popup */}
      {selectedTrain && selectedTrain.locationHypothesis?.position && (
        <TrainTooltip
          train={selectedTrain}
          position={selectedTrain.locationHypothesis.position}
          onClose={() => setSelectedTrain(null)}
          onFollow={(trainId) => handleFollowTrain(trainId)}
          isFollowing={followState.enabled && followState.trainId === selectedTrain.id}
        />
      )}
    </div>
  );
}


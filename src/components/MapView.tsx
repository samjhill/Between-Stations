import { useEffect, useState, useCallback, useMemo } from 'react';
import { MapContainer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ProviderManager } from '../core/Provider';
import { TimetableProvider } from '../providers/TimetableProvider';
import { NjtRailDataProvider } from '../providers/NjtRailDataProvider';
import { mergeObservations } from '../core/inference';
import type { Train } from '../types/domain';
import type { FilterState, FollowState } from '../types/ui';
import MapContent from './MapContent';
import TrainList from './TrainList';
import Filters from './Filters';
import TrainDetails from './TrainDetails';
import TrainTooltip from './TrainTooltip';
import LineTooltip, { type LineTooltipStats } from './LineTooltip';
import StationTrainsPanel from './StationTrainsPanel';
import '../App.css';
import { TRAIN_ROUTES } from '../config/trainRoutes';
import { getLineColor } from '../config/lineColors';
import { STATION_DATABASE } from '../core/stationMapping';

// Center on New Jersey/New York area
const DEFAULT_CENTER: [number, number] = [40.7178, -74.0431];
const DEFAULT_ZOOM = 10;

type ProviderMode = 'realtime' | 'hybrid' | 'timetable';

function getProviderMode(): ProviderMode {
  const raw = (import.meta.env.VITE_PROVIDER_MODE || '').toString().trim().toLowerCase();
  if (raw === 'realtime' || raw === 'hybrid' || raw === 'timetable') return raw;
  // Default to realtime so testing uses only true API locations (no schedule-extrapolated positions).
  return 'realtime';
}

export default function MapView() {
  const providerMode = getProviderMode();
  const [trains, setTrains] = useState<Train[]>([]);
  const [selectedTrainId, setSelectedTrainId] = useState<string | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [selectedStationName, setSelectedStationName] = useState<string | null>(null);
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
  const [mapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom] = useState(DEFAULT_ZOOM);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [stationPanelOpen, setStationPanelOpen] = useState(false);

  // Initialize provider manager
  const [providerManager] = useState(() => {
    const manager = new ProviderManager();
    if (providerMode === 'timetable' || providerMode === 'hybrid') {
      // Register timetable provider (schedule-based position extrapolation)
      const timetableProvider = new TimetableProvider();
      manager.register(timetableProvider);
    }

    if (providerMode === 'realtime' || providerMode === 'hybrid') {
      // Register realtime provider (via backend proxy).
      const realtimeProvider = new NjtRailDataProvider();
      manager.register(realtimeProvider);
    }

    return manager;
  });

  // Fetch train data
  const fetchTrains = useCallback(async () => {
    try {
      const observations = await providerManager.fetchAllObservations();
      const mergedTrains = mergeObservations(observations);
      setTrains((prev) => {
        if (prev.length === 0) return mergedTrains;
        const prevById = new Map(prev.map((t) => [t.id, t] as const));

        const samePos = (
          a?: { lat: number; lng: number } | null,
          b?: { lat: number; lng: number } | null
        ) => {
          if (!a && !b) return true;
          if (!a || !b) return false;
          // ~1m-ish tolerance in degrees (good enough to avoid churn from float noise).
          const eps = 1e-5;
          return Math.abs(a.lat - b.lat) < eps && Math.abs(a.lng - b.lng) < eps;
        };

        const equivalent = (a: Train, b: Train) => {
          if (a.id !== b.id) return false;
          if (a.line !== b.line) return false;
          if (a.direction !== b.direction) return false;
          if (a.destination !== b.destination) return false;
          if (a.status !== b.status) return false;
          if (a.state !== b.state) return false;
          if (a.delaySeconds !== b.delaySeconds) return false;
          if (a.nextStop !== b.nextStop) return false;

          const aHyp = a.locationHypothesis;
          const bHyp = b.locationHypothesis;
          if (!!aHyp !== !!bHyp) return false;
          if (aHyp && bHyp) {
            if (aHyp.confidence !== bHyp.confidence) return false;
            if (!samePos(aHyp.position || null, bHyp.position || null)) return false;
          }

          return true;
        };

        let changed = false;
        const reconciled = mergedTrains.map((nextTrain) => {
          const prevTrain = prevById.get(nextTrain.id);
          if (!prevTrain) {
            changed = true;
            return nextTrain;
          }
          if (equivalent(prevTrain, nextTrain)) {
            return prevTrain;
          }
          changed = true;
          return nextTrain;
        });

        return changed ? reconciled : prev;
      });
    } catch (error) {
      console.error('Error fetching trains:', error);
    }
  }, [providerManager]);

  // Initial fetch and set up polling
  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const providers = providerManager.getProviders();
    const minInterval = providers.length > 0 ? Math.min(...providers.map((p) => p.updateInterval)) : 15000;

    const schedule = () => {
      if (cancelled) return;

      // Avoid doing background work when the tab isn't visible.
      if (document.hidden) {
        timer = window.setTimeout(schedule, minInterval);
        return;
      }

      void fetchTrains().finally(() => {
        if (cancelled) return;
        timer = window.setTimeout(schedule, minInterval);
      });
    };

    const onVisibilityChange = () => {
      if (cancelled) return;
      if (!document.hidden) {
        // When coming back, refresh ASAP.
        if (timer !== null) window.clearTimeout(timer);
        timer = window.setTimeout(schedule, 0);
      }
    };

    // Kick off immediately
    timer = window.setTimeout(schedule, 0);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [fetchTrains, providerManager]);

  // Filter trains - memoized to avoid recalculation on every render
  const filteredTrains = useMemo(() => {
    return trains.filter((train) => {
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
  }, [trains, filterState.lines, filterState.directions, filterState.confidenceMin, filterState.searchQuery]);

  // Camera controller now handles follow mode - no need for this effect

  const handleTrainClick = useCallback((train: Train) => {
    setSelectedTrainId(train.id);
    setSelectedLineId(null);
    // Don't open sidebar - tooltip will show instead
  }, []);

  const handleLineClick = useCallback((lineId: string, clickLatLng: { lat: number; lng: number }) => {
    void clickLatLng;
    setSelectedLineId(lineId);
    setSelectedTrainId(null);
  }, []);

  const handleStationClick = useCallback((stationName: string) => {
    console.log('handleStationClick called with:', stationName);
    if (selectedStationName === stationName) {
      // Toggle off if clicking the same station
      console.log('Toggling off station');
      setSelectedStationName(null);
      setStationPanelOpen(false);
    } else {
      console.log('Setting station and opening panel');
      setSelectedStationName(stationName);
      setStationPanelOpen(true);
      // Clear other selections and close train list sidebar
      setSelectedTrainId(null);
      setSelectedLineId(null);
      setSidebarOpen(false);
    }
  }, [selectedStationName]);

  const handleFollowTrain = useCallback((trainId: string | null) => {
    setFollowState({
      trainId,
      enabled: trainId !== null,
    });
  }, []);

  const selectedLineStats: LineTooltipStats | null = useMemo(() => {
    if (!selectedLineId) return null;

    const stations = TRAIN_ROUTES[selectedLineId] || [];
    const color = getLineColor(selectedLineId);

    const totalOnLine = trains.filter((t) => t.line === selectedLineId);
    const visibleOnLine = filteredTrains.filter((t) => t.line === selectedLineId);

    const countDirections = (list: Train[]) => {
      const counts: Record<string, number> = {};
      for (const t of list) {
        const key = (t.direction || 'Unknown').toString();
        counts[key] = (counts[key] || 0) + 1;
      }
      return counts;
    };

    return {
      lineId: selectedLineId,
      color,
      stations,
      totalTrains: totalOnLine.length,
      visibleTrains: visibleOnLine.length,
      directionCountsTotal: countDirections(totalOnLine),
      directionCountsVisible: countDirections(visibleOnLine),
    };
  }, [selectedLineId, trains, filteredTrains]);

  const selectedTrain = useMemo(() => {
    if (!selectedTrainId) return null;
    return trains.find((t) => t.id === selectedTrainId) || null;
  }, [selectedTrainId, trains]);

  // Helper function to normalize and match station names
  const normalizeStationName = useCallback((name: string): string[] => {
    const normalized = name.toLowerCase().trim();
    const matches: string[] = [normalized];
    
    // Find station in database and add canonical name and aliases
    const stationData = STATION_DATABASE.find(
      (s) => s.name.toLowerCase() === normalized || 
             s.aliases?.some(alias => alias.toLowerCase() === normalized)
    );
    
    if (stationData) {
      matches.push(stationData.name.toLowerCase());
      if (stationData.aliases) {
        stationData.aliases.forEach(alias => {
          matches.push(alias.toLowerCase());
        });
      }
    }
    
    return [...new Set(matches)]; // Remove duplicates
  }, []);

  // Filter trains arriving at the selected station
  const trainsAtStation = useMemo(() => {
    if (!selectedStationName) return [];
    
    const stationNameVariants = normalizeStationName(selectedStationName);
    const matchesStation = (name: string | undefined): boolean => {
      if (!name) return false;
      const normalized = name.toLowerCase().trim();
      return stationNameVariants.some(variant => normalized === variant || normalized.includes(variant) || variant.includes(normalized));
    };
    
    return trains.filter((train) => {
      // Train is arriving at this station (nextStop matches)
      if (train.nextStop && matchesStation(train.nextStop)) {
        return true;
      }
      // Train is currently at this station
      if (train.state === 'at_station' && train.nextStop && matchesStation(train.nextStop)) {
        return true;
      }
      // Check if train's route includes this station (for timetable-based predictions)
      const routePosition = train.locationHypothesis?.routePosition;
      if (routePosition) {
        if (routePosition.fromStation && matchesStation(routePosition.fromStation)) {
          return true;
        }
        if (routePosition.toStation && matchesStation(routePosition.toStation)) {
          return true;
        }
      }
      return false;
    }).sort((a, b) => {
      // Sort by nextStop timing if available, otherwise by line
      const aMatches = a.nextStop && matchesStation(a.nextStop);
      const bMatches = b.nextStop && matchesStation(b.nextStop);
      
      if (aMatches && bMatches) {
        // Both are heading to this station, sort by delay/status
        const aDelay = a.delaySeconds || 0;
        const bDelay = b.delaySeconds || 0;
        return aDelay - bDelay;
      }
      return a.line.localeCompare(b.line);
    });
  }, [trains, selectedStationName, normalizeStationName]);

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
        {(sidebarOpen || stationPanelOpen) && (
          <div
            className={`sidebar-backdrop ${(sidebarOpen || stationPanelOpen) ? 'active' : ''}`}
            onClick={() => {
              setSidebarOpen(false);
              setStationPanelOpen(false);
              setSelectedStationName(null);
            }}
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
              selectedStationName={selectedStationName}
              onTrainClick={handleTrainClick}
              onLineClick={handleLineClick}
              onStationClick={handleStationClick}
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
              onTrainClick={handleTrainClick}
              onFollowTrain={handleFollowTrain}
            />
            {sidebarOpen && selectedTrain && (
              <TrainDetails
                train={selectedTrain}
                onClose={() => setSelectedTrainId(null)}
                onFollow={() => handleFollowTrain(selectedTrain.id)}
                isFollowing={followState.enabled && followState.trainId === selectedTrain.id}
              />
            )}
          </div>
        </div>

        {/* Station trains panel */}
        {stationPanelOpen && selectedStationName && (
          <div className={`app-sidebar station-panel ${stationPanelOpen ? 'open' : ''}`}>
            <StationTrainsPanel
              stationName={selectedStationName}
              trains={trainsAtStation}
              selectedTrain={selectedTrain}
              followState={followState}
              onTrainClick={handleTrainClick}
              onFollowTrain={handleFollowTrain}
              onClose={() => {
                setStationPanelOpen(false);
                setSelectedStationName(null);
              }}
            />
          </div>
        )}
      </div>

      {/* Train count badge */}
      {filteredTrains.length > 0 && (
        <div className="train-count-badge">
          {filteredTrains.length} train{filteredTrains.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Train tooltip - floating popup */}
      {!sidebarOpen && selectedTrain && selectedTrain.locationHypothesis?.position && (
        <TrainTooltip
          train={selectedTrain}
          position={selectedTrain.locationHypothesis.position}
          onClose={() => setSelectedTrainId(null)}
          onFollow={(trainId) => handleFollowTrain(trainId)}
          isFollowing={followState.enabled && followState.trainId === selectedTrain.id}
        />
      )}

      {/* Line tooltip - floating popup */}
      {selectedLineStats && (
        <LineTooltip
          stats={selectedLineStats}
          onClose={() => setSelectedLineId(null)}
        />
      )}
    </div>
  );
}


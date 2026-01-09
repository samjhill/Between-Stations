import './Filters.css';
import { memo, useMemo } from 'react';
import { LINE_COLORS } from '../config/lineColors';
import type { Train } from '../types/domain';
import type { FilterState } from '../types/ui';

interface FiltersProps {
  trains: Train[];
  filterState: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClose?: () => void;
}

function Filters({
  trains,
  filterState,
  onFilterChange,
  onClose,
}: FiltersProps) {
  // Get all lines from LINE_COLORS to ensure all NJ Transit lines are represented
  const allLines = useMemo(() => Object.keys(LINE_COLORS).sort(), []);
  // Get unique directions from trains - memoized
  const directions = useMemo(() => {
    return Array.from(new Set(trains.map((t) => t.direction))).sort();
  }, [trains]);

  const handleLineToggle = (line: string) => {
    const newLines = filterState.lines.includes(line)
      ? filterState.lines.filter((l) => l !== line)
      : [...filterState.lines, line];
    onFilterChange({ ...filterState, lines: newLines });
  };

  const handleDirectionToggle = (direction: string) => {
    const newDirections = filterState.directions.includes(direction)
      ? filterState.directions.filter((d) => d !== direction)
      : [...filterState.directions, direction];
    onFilterChange({ ...filterState, directions: newDirections });
  };

  const handleConfidenceChange = (confidence: FilterState['confidenceMin']) => {
    onFilterChange({ ...filterState, confidenceMin: confidence });
  };

  const handleSearchChange = (query: string) => {
    onFilterChange({ ...filterState, searchQuery: query });
  };

  const clearFilters = () => {
    onFilterChange({
      lines: [],
      directions: [],
      confidenceMin: 'all',
      searchQuery: '',
    });
  };

  const hasActiveFilters =
    filterState.lines.length > 0 ||
    filterState.directions.length > 0 ||
    filterState.confidenceMin !== 'all' ||
    filterState.searchQuery.length > 0;

  return (
    <div className="filters">
      <div className="filters-header">
        <h3>Filters</h3>
        {onClose && (
          <button onClick={onClose} className="icon-button-close" title="Close">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="5" x2="15" y2="15"/>
              <line x1="15" y1="5" x2="5" y2="15"/>
            </svg>
          </button>
        )}
      </div>
      <div className="filters-content">
        <div className="filters-row">
          <div className="filter-group">
            <input
              id="search"
              type="text"
              placeholder="Search trains, lines, stations..."
              value={filterState.searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="filter-input"
            />
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="clear-filters-button">
              Clear
            </button>
          )}
        </div>

        <div className="filters-section">
          <label className="filter-section-label">Lines</label>
          <div className="filter-chips">
            {allLines.map((line) => (
              <button
                key={line}
                onClick={() => handleLineToggle(line)}
                className={`filter-chip ${filterState.lines.includes(line) ? 'active' : ''}`}
                style={filterState.lines.includes(line) ? {
                  backgroundColor: LINE_COLORS[line] || '#95A5A6',
                  borderColor: LINE_COLORS[line] || '#95A5A6',
                } : {}}
              >
                {line}
              </button>
            ))}
          </div>
        </div>

        <div className="filters-section">
          <label className="filter-section-label">Directions</label>
          <div className="filter-chips">
            {directions.map((direction) => (
              <button
                key={direction}
                onClick={() => handleDirectionToggle(direction)}
                className={`filter-chip ${filterState.directions.includes(direction) ? 'active' : ''}`}
              >
                {direction}
              </button>
            ))}
          </div>
        </div>

        <div className="filters-section">
          <label className="filter-section-label">Min Confidence</label>
          <select
            value={filterState.confidenceMin}
            onChange={(e) =>
              handleConfidenceChange(e.target.value as FilterState['confidenceMin'])
            }
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="unknown">Unknown+</option>
            <option value="low">Low+</option>
            <option value="medium">Medium+</option>
            <option value="high">High Only</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default memo(Filters);


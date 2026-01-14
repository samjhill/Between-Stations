import { useEffect, useMemo, useRef } from 'react';
import './LineTooltip.css';

export interface LineTooltipStats {
  lineId: string;
  color: string;
  stations: string[];
  totalTrains: number;
  visibleTrains: number;
  directionCountsTotal: Record<string, number>;
  directionCountsVisible: Record<string, number>;
}

interface LineTooltipProps {
  stats: LineTooltipStats | null;
  onClose: () => void;
}

function formatDirectionCounts(counts: Record<string, number>): string {
  const entries = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return 'None';
  return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
}

export default function LineTooltip({ stats, onClose }: LineTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!stats) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('.leaflet-container')) {
          return;
        }
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [stats, onClose]);

  const termini = useMemo(() => {
    if (!stats || stats.stations.length === 0) return null;
    return {
      from: stats.stations[0],
      to: stats.stations[stats.stations.length - 1],
    };
  }, [stats]);

  if (!stats) return null;

  return (
    <div className="line-tooltip-overlay" onClick={onClose}>
      <div
        ref={tooltipRef}
        className="line-tooltip"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="line-tooltip-header">
          <div className="line-tooltip-header-left">
            <span className="line-tooltip-swatch" style={{ backgroundColor: stats.color }} />
            <h3>{stats.lineId}</h3>
          </div>
          <button className="line-tooltip-close" onClick={onClose} title="Close">
            ×
          </button>
        </div>

        <div className="line-tooltip-content">
          {termini && (
            <div className="line-tooltip-row">
              <span className="line-tooltip-label">Termini:</span>
              <span className="line-tooltip-value">
                {termini.from} → {termini.to}
              </span>
            </div>
          )}

          <div className="line-tooltip-row">
            <span className="line-tooltip-label">Stations:</span>
            <span className="line-tooltip-value">{stats.stations.length || 'Unknown'}</span>
          </div>

          <div className="line-tooltip-row">
            <span className="line-tooltip-label">Trains:</span>
            <span className="line-tooltip-value">
              {stats.totalTrains}
              {stats.visibleTrains !== stats.totalTrains ? ` (visible: ${stats.visibleTrains})` : ''}
            </span>
          </div>

          <div className="line-tooltip-row">
            <span className="line-tooltip-label">Directions:</span>
            <span className="line-tooltip-value">
              {formatDirectionCounts(stats.directionCountsTotal)}
              {formatDirectionCounts(stats.directionCountsVisible) !== formatDirectionCounts(stats.directionCountsTotal)
                ? ` (visible: ${formatDirectionCounts(stats.directionCountsVisible)})`
                : ''}
            </span>
          </div>

          {stats.stations.length > 0 && (
            <div className="line-tooltip-stops">
              <div className="line-tooltip-stops-title">Stops</div>
              <ol className="line-tooltip-stops-list">
                {stats.stations.map((name, i) => (
                  <li key={`${stats.lineId}-${i}-${name}`}>{name}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


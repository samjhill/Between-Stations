import './CameraControls.css';
import type { CameraMode } from '../core/cameraController';

interface CameraControlsProps {
  cameraMode: CameraMode;
  confidenceWarning: string | null;
  onResetView: () => void;
}

export default function CameraControls({
  cameraMode,
  confidenceWarning,
  onResetView,
}: CameraControlsProps) {
  const getModeLabel = (mode: CameraMode): string => {
    switch (mode) {
      case 'manual':
        return '';
      case 'follow_train':
        return 'Following';
      case 'ambient':
        return 'Auto';
      default:
        return '';
    }
  };

  const modeLabel = getModeLabel(cameraMode);

  return (
    <div className="camera-controls">
      {/* Camera mode indicator */}
      {modeLabel && (
        <div className={`camera-mode-indicator mode-${cameraMode}`}>
          <span className="camera-mode-dot"></span>
          <span className="camera-mode-label">{modeLabel}</span>
        </div>
      )}

      {/* Confidence warning */}
      {confidenceWarning && (
        <div className="camera-confidence-warning">
          {confidenceWarning}
        </div>
      )}

      {/* Reset view button */}
      <button
        className="camera-reset-button"
        onClick={onResetView}
        title="Reset view to default"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 2 L8 6 M8 10 L8 14 M2 8 L6 8 M10 8 L14 8" strokeLinecap="round"/>
          <circle cx="8" cy="8" r="5" fill="none"/>
        </svg>
      </button>
    </div>
  );
}



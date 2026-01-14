import type { Train } from '../types/domain';
import { formatTime as formatSecondsSinceMidnight, getCurrentTimeSeconds, parseTime } from './timeUtils';

export type NextStopTiming = {
  scheduledLabel: string;
  expectedLabel: string;
  etaLabel?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function findMostRecentEvidenceData(train: Train): Record<string, unknown> | null {
  const evidence = train.locationHypothesis?.evidence;
  if (!evidence || evidence.length === 0) return null;
  const d = evidence[0]?.data;
  return isRecord(d) ? d : null;
}

function parseScheduledTimeFromEvidence(data: Record<string, unknown>): {
  scheduledSeconds?: number;
  scheduledTimestampMs?: number;
} {
  const seconds = data.nextStopScheduledTimeSeconds;
  if (typeof seconds === 'number' && Number.isFinite(seconds)) {
    return { scheduledSeconds: seconds };
  }

  const ts = data.nextStopScheduledTimestampMs;
  if (typeof ts === 'number' && Number.isFinite(ts)) {
    return { scheduledTimestampMs: ts };
  }

  // Fallback: try the raw NJT field if present
  const raw = data.SCHED_DEP_TIME;
  if (typeof raw === 'string' && raw.trim()) {
    const dateParsed = Date.parse(raw);
    if (Number.isFinite(dateParsed)) {
      return { scheduledTimestampMs: dateParsed };
    }

    const parsedSeconds = parseTime(raw);
    if (typeof parsedSeconds === 'number') {
      return { scheduledSeconds: parsedSeconds };
    }
  }

  return {};
}

function formatEtaFromSeconds(expectedSeconds: number): string | undefined {
  const now = getCurrentTimeSeconds();
  let expected = expectedSeconds;
  if (expected < now) expected += 86400; // overnight
  const delta = expected - now;
  if (!Number.isFinite(delta) || delta < 0) return undefined;
  if (delta < 60) return 'in <1 min';
  const mins = Math.round(delta / 60);
  return `in ${mins} min`;
}

function formatEtaFromTimestampMs(expectedMs: number): string | undefined {
  const deltaMs = expectedMs - Date.now();
  if (!Number.isFinite(deltaMs) || deltaMs < 0) return undefined;
  if (deltaMs < 60_000) return 'in <1 min';
  const mins = Math.round(deltaMs / 60_000);
  return `in ${mins} min`;
}

export function getNextStopTiming(train: Train): NextStopTiming | null {
  const data = findMostRecentEvidenceData(train);
  if (!data) return null;

  const { scheduledSeconds, scheduledTimestampMs } = parseScheduledTimeFromEvidence(data);
  const delay = typeof train.delaySeconds === 'number' && Number.isFinite(train.delaySeconds) ? train.delaySeconds : 0;

  if (typeof scheduledTimestampMs === 'number') {
    const scheduledDate = new Date(scheduledTimestampMs);
    const expectedDate = new Date(scheduledTimestampMs + delay * 1000);
    const scheduledLabel = scheduledDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const expectedLabel = expectedDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const etaLabel = formatEtaFromTimestampMs(expectedDate.getTime());
    return { scheduledLabel, expectedLabel, etaLabel };
  }

  if (typeof scheduledSeconds === 'number') {
    const scheduledLabel = formatSecondsSinceMidnight(scheduledSeconds);
    const expectedSeconds = scheduledSeconds + delay;
    const expectedLabel = formatSecondsSinceMidnight(expectedSeconds);
    const etaLabel = formatEtaFromSeconds(expectedSeconds);
    return { scheduledLabel, expectedLabel, etaLabel };
  }

  return null;
}


type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type NjtEnv = 'test' | 'prod';

// Ensure backend/.env is loaded BEFORE we snapshot process.env into `env`.
// (ESM imports evaluate before `server.ts` runtime code.)
import { loadDotenv } from './dotenv';
loadDotenv();

function readRequired(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[env] Missing required env var: ${name}`);
  return v;
}

function readOptional(name: string, fallback = ''): string {
  const v = process.env[name];
  return v ?? fallback;
}

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    throw new Error(`[env] ${name} must be a non-negative integer (got "${raw}")`);
  }
  return n;
}

function readLogLevel(name: string, fallback: LogLevel): LogLevel {
  const v = process.env[name];
  if (!v) return fallback;
  if (v === 'debug' || v === 'info' || v === 'warn' || v === 'error') return v;
  throw new Error(`[env] ${name} must be one of debug|info|warn|error (got "${v}")`);
}

function readNjtEnv(name: string, fallback: NjtEnv): NjtEnv {
  const v = process.env[name];
  if (!v) return fallback;
  if (v === 'test' || v === 'prod') return v;
  throw new Error(`[env] ${name} must be "test" or "prod" (got "${v}")`);
}

export const env = {
  // Server
  PORT: readInt('PORT', 8787),
  NODE_ENV: readOptional('NODE_ENV', 'development'),
  CORS_ORIGIN: readOptional('CORS_ORIGIN', 'http://localhost:5173'),

  // NJ TRANSIT Rail Data API credentials
  NJT_ENV: readNjtEnv('NJT_ENV', 'test'),
  NJT_USERNAME: readOptional('NJT_USERNAME'),
  NJT_PASSWORD: readOptional('NJT_PASSWORD'),

  // Behavior
  UPSTREAM_TIMEOUT_MS: readInt('UPSTREAM_TIMEOUT_MS', 10_000),
  VEHICLE_CACHE_TTL_MS: readInt('VEHICLE_CACHE_TTL_MS', 15_000),
  USER_AGENT: readOptional('USER_AGENT', 'nj-transit-realtime-map/1.0'),

  // Logging
  LOG_LEVEL: readLogLevel('LOG_LEVEL', 'info'),
};

export function getRailDataApiBaseUrl(): string {
  return env.NJT_ENV === 'prod'
    ? 'https://raildata.njtransit.com'
    : 'https://testraildata.njtransit.com';
}


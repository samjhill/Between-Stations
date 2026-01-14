import http from 'node:http';
import crypto from 'node:crypto';
import { URL } from 'node:url';

import { env } from './env';
import { NjtRailDataClient } from './njtRailDataClient';

const client = new NjtRailDataClient();

type CacheEntry<T> = { value: T; expiresAt: number };
let vehicleCache: CacheEntry<unknown> | null = null;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function getFetchedAtMs(v: unknown): number | null {
  if (!isObject(v)) return null;
  const fetchedAt = v.fetchedAt;
  return typeof fetchedAt === 'number' ? fetchedAt : null;
}

function parseNjtLastModifiedMs(s: string | undefined): number | null {
  if (!s) return null;
  // Example: "13-Jan-2026 09:51:08 PM"
  const m = s.trim().match(
    /^(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)$/i
  );
  if (!m) return null;
  const day = Number(m[1]);
  const mon = m[2].toLowerCase();
  const year = Number(m[3]);
  let hour = Number(m[4]);
  const min = Number(m[5]);
  const sec = Number(m[6]);
  const ampm = m[7].toUpperCase();

  const months: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };
  const monthIndex = months[mon];
  if (monthIndex == null) return null;

  if (ampm === 'PM' && hour < 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;

  const d = new Date(year, monthIndex, day, hour, min, sec);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : null;
}

type ApiErrorCode =
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'CORS_NOT_ALLOWED'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR';

function getRequestId(req: http.IncomingMessage): string {
  const existing = req.headers['x-request-id'];
  if (typeof existing === 'string' && existing.trim()) return existing.trim();
  return crypto.randomUUID();
}

function getOrigin(req: http.IncomingMessage): string | null {
  const o = req.headers.origin;
  return typeof o === 'string' ? o : null;
}

function getAllowedOrigins(): string[] {
  const raw = env.CORS_ORIGINS?.trim();
  if (raw) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return env.CORS_ORIGIN ? [env.CORS_ORIGIN] : [];
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // non-browser / same-origin fetch without Origin
  const allowed = getAllowedOrigins();
  return allowed.includes(origin);
}

function getClientIp(req: http.IncomingMessage): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

type RateState = { count: number; resetAt: number };
const rate = new Map<string, RateState>();

function isRateLimited(req: http.IncomingMessage): { limited: boolean; resetInMs: number } {
  const ip = getClientIp(req);
  const now = Date.now();
  const windowMs = env.RATE_LIMIT_WINDOW_MS;
  const limit = env.RATE_LIMIT_MAX;

  const existing = rate.get(ip);
  if (!existing || existing.resetAt <= now) {
    rate.set(ip, { count: 1, resetAt: now + windowMs });
    return { limited: false, resetInMs: windowMs };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return { limited: true, resetInMs: Math.max(0, existing.resetAt - now) };
  }

  return { limited: false, resetInMs: Math.max(0, existing.resetAt - now) };
}

function requireApiKey(req: http.IncomingMessage): boolean {
  if (!env.BACKEND_API_KEY) return true;
  const h = req.headers['x-api-key'];
  return typeof h === 'string' && h === env.BACKEND_API_KEY;
}

function json(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {}
) {
  const data = JSON.stringify(body);
  const requestId = getRequestId(req);
  const origin = getOrigin(req);
  const allowOrigin = origin && isOriginAllowed(origin) ? origin : '';

  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...(allowOrigin ? { 'access-control-allow-origin': allowOrigin } : {}),
    'access-control-allow-methods': 'GET,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'x-request-id': requestId,
    // Basic security headers
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'permissions-policy': 'geolocation=(), microphone=(), camera=()',
    ...extraHeaders,
  });
  res.end(data);
}

function error(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  status: number,
  code: ApiErrorCode,
  message: string,
  extraHeaders: Record<string, string> = {}
) {
  json(req, res, status, { error: { code, message } }, extraHeaders);
}

function notFound(req: http.IncomingMessage, res: http.ServerResponse) {
  error(req, res, 404, 'NOT_FOUND', 'Not found');
}

const server = http.createServer(async (req, res) => {
  const start = Date.now();
  const requestId = getRequestId(req);

  try {
    if (!req.url) return notFound(req, res);

    // Preflight
    if (req.method === 'OPTIONS') {
      const origin = getOrigin(req);
      if (origin && !isOriginAllowed(origin)) {
        return error(req, res, 403, 'CORS_NOT_ALLOWED', 'Origin not allowed');
      }
      res.writeHead(204, {
        ...(origin ? { 'access-control-allow-origin': origin } : {}),
        'access-control-allow-methods': 'GET,OPTIONS',
        'access-control-allow-headers': 'content-type,x-api-key',
        'access-control-max-age': '600',
        'x-request-id': requestId,
      });
      return res.end();
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      const now = Date.now();
      const fetchedAt = vehicleCache ? getFetchedAtMs(vehicleCache.value) : null;
      const cacheAgeMs = fetchedAt != null ? now - fetchedAt : null;

      return json(req, res, 200, {
        ok: true,
        now,
        njtEnv: env.NJT_ENV,
        cache: {
          hasVehicles: Boolean(vehicleCache && vehicleCache.expiresAt > now),
          ttlMs: env.VEHICLE_CACHE_TTL_MS,
          ageMs: cacheAgeMs,
        },
        token: client.getDebugState(),
      });
    }

    // Basic CORS check for browser requests
    const origin = getOrigin(req);
    if (origin && !isOriginAllowed(origin)) {
      return error(req, res, 403, 'CORS_NOT_ALLOWED', 'Origin not allowed');
    }

    // Rate limit /api/* only (don’t block health checks)
    if (url.pathname.startsWith('/api/')) {
      if (!requireApiKey(req)) {
        return error(req, res, 401, 'UNAUTHORIZED', 'Missing or invalid API key');
      }

      const rl = isRateLimited(req);
      if (rl.limited) {
        return error(
          req,
          res,
          429,
          'RATE_LIMITED',
          'Too many requests',
          { 'retry-after': String(Math.ceil(rl.resetInMs / 1000)) }
        );
      }
    }

    if (req.method === 'GET' && url.pathname === '/api/realtime/vehicles') {
      const now = Date.now();
      if (vehicleCache && vehicleCache.expiresAt > now) {
        return json(req, res, 200, vehicleCache.value, { 'x-cache': 'HIT' });
      }

      const trains = await client.getVehicleData();
      // Best-effort upstream timestamp: use the most recent LAST_MODIFIED if parseable and plausible.
      // Fall back to fetch time if parsing fails or looks wildly off.
      const parsed = trains
        .map((t) => parseNjtLastModifiedMs(t.LAST_MODIFIED))
        .filter((n): n is number => typeof n === 'number');
      const upstreamLastModifiedMs = parsed.length > 0 ? Math.max(...parsed) : null;
      const plausible =
        upstreamLastModifiedMs != null && Math.abs(now - upstreamLastModifiedMs) < 12 * 60 * 60 * 1000;

      const payload = {
        source: 'njt-raildata',
        fetchedAt: now,
        timestamp: plausible && upstreamLastModifiedMs != null ? upstreamLastModifiedMs : now,
        upstreamLastModifiedMs: upstreamLastModifiedMs,
        trains,
      };

      vehicleCache = { value: payload, expiresAt: now + env.VEHICLE_CACHE_TTL_MS };
      return json(req, res, 200, payload, { 'x-cache': 'MISS' });
    }

    if (req.method !== 'GET') {
      return error(req, res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    }

    return notFound(req, res);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.log(
      JSON.stringify({
        level: 'error',
        requestId,
        path: req.url,
        ms: Date.now() - start,
        message,
      })
    );
    return error(req, res, 502, 'UPSTREAM_ERROR', message);
  } finally {
    console.log(
      JSON.stringify({
        level: 'info',
        requestId,
        method: req.method,
        path: req.url,
        ms: Date.now() - start,
      })
    );
  }
});

server.listen(env.PORT, () => {
  console.log(
    `[backend] listening on http://localhost:${env.PORT} (NJT_ENV=${env.NJT_ENV})`
  );
});


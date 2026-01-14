import http from 'node:http';
import { URL } from 'node:url';

import { env } from './env';
import { NjtRailDataClient } from './njtRailDataClient';

const client = new NjtRailDataClient();

type CacheEntry<T> = { value: T; expiresAt: number };
let vehicleCache: CacheEntry<unknown> | null = null;

function json(res: http.ServerResponse, status: number, body: unknown) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': env.CORS_ORIGIN,
    'access-control-allow-methods': 'GET,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(data);
}

function notFound(res: http.ServerResponse) {
  json(res, 404, { error: 'Not found' });
}

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) return notFound(res);

    // Preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': env.CORS_ORIGIN,
        'access-control-allow-methods': 'GET,OPTIONS',
        'access-control-allow-headers': 'content-type',
        'access-control-max-age': '600',
      });
      return res.end();
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, { ok: true });
    }

    if (req.method === 'GET' && url.pathname === '/api/realtime/vehicles') {
      const now = Date.now();
      if (vehicleCache && vehicleCache.expiresAt > now) {
        return json(res, 200, vehicleCache.value);
      }

      const trains = await client.getVehicleData();
      const payload = {
        source: 'njt-raildata',
        timestamp: now,
        trains,
      };

      vehicleCache = { value: payload, expiresAt: now + env.VEHICLE_CACHE_TTL_MS };
      return json(res, 200, payload);
    }

    return notFound(res);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json(res, 500, { error: message });
  }
});

server.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[backend] listening on http://localhost:${env.PORT} (NJT_ENV=${env.NJT_ENV})`
  );
});


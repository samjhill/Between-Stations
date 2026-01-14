import path from 'node:path';
import { env, getRailDataApiBaseUrl } from './env';
import { TokenStateStore } from './tokenStateStore';

type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue };

export type NjtVehicleDataRow = {
  ID: string;
  TRAIN_LINE: string;
  DIRECTION: string;
  ICS_TRACK_CKT: string;
  LAST_MODIFIED: string;
  SCHED_DEP_TIME: string;
  SEC_LATE?: string;
  NEXT_STOP?: string;
  LONGITUDE?: string;
  LATITUDE?: string;
};

type TokenResponse =
  | { Authenticated: 'True' | 'False'; UserToken: string }
  | { errorMessage: string }
  | null;

type ValidTokenResponse =
  | { validToken: boolean; userID: string | null }
  | { errorMessage: string }
  | null;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function todayKey(d = new Date()): string {
  // daily API limits reset at midnight (assume server local time)
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export class NjtRailDataClient {
  private token: string | null = null;
  private tokenCheckedDay: string | null = null;
  private tokenFetchAttemptsDay: string | null = null;
  private tokenFetchAttempts = 0;
  private tokenBackoffUntilMs = 0;
  private readonly store: TokenStateStore;

  constructor(private readonly baseUrl = getRailDataApiBaseUrl()) {
    const file = path.join(env.TOKEN_STATE_DIR, `njt-token-${env.NJT_ENV}.json`);
    this.store = new TokenStateStore(file);

    const saved = this.store.load();
    if (saved) {
      this.token = saved.token;
      this.tokenCheckedDay = saved.tokenCheckedDay;
      this.tokenFetchAttemptsDay = saved.tokenFetchAttemptsDay;
      this.tokenFetchAttempts = saved.tokenFetchAttempts;
      this.tokenBackoffUntilMs = saved.tokenBackoffUntilMs;
    }
  }

  getDebugState(): {
    tokenPresent: boolean;
    tokenCheckedDay: string | null;
    tokenFetchAttemptsDay: string | null;
    tokenFetchAttempts: number;
    tokenBackoffUntilMs: number;
  } {
    return {
      tokenPresent: Boolean(this.token),
      tokenCheckedDay: this.tokenCheckedDay,
      tokenFetchAttemptsDay: this.tokenFetchAttemptsDay,
      tokenFetchAttempts: this.tokenFetchAttempts,
      tokenBackoffUntilMs: this.tokenBackoffUntilMs,
    };
  }

  private persist(): void {
    this.store.save({
      token: this.token,
      tokenCheckedDay: this.tokenCheckedDay,
      tokenFetchAttemptsDay: this.tokenFetchAttemptsDay,
      tokenFetchAttempts: this.tokenFetchAttempts,
      tokenBackoffUntilMs: this.tokenBackoffUntilMs,
    });
  }

  private async postForm(endpointPath: string, fields: Record<string, string>): Promise<unknown> {
    const url = `${this.baseUrl}${endpointPath}`;

    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) {
      form.append(k, v);
    }

    let lastError: unknown = null;
    const attempts = Math.max(1, env.UPSTREAM_MAX_RETRIES + 1);

    for (let attempt = 1; attempt <= attempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), env.UPSTREAM_TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            accept: 'text/plain',
            'user-agent': env.USER_AGENT,
          },
          body: form,
          signal: controller.signal,
        });

        const text = await res.text();
        if (!text) return null;

        // The API returns JSON-like responses but content-type is often text/plain
        const parsed = safeJsonParse(text);
        return parsed ?? text;
      } catch (e) {
        lastError = e;
        // Only retry on network/timeout-ish failures
        if (attempt < attempts) {
          await new Promise((r) => setTimeout(r, 250 * attempt));
          continue;
        }
      } finally {
        clearTimeout(timer);
      }
      break;
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private async getToken(): Promise<string | null> {
    if (!env.NJT_USERNAME || !env.NJT_PASSWORD) {
      throw new Error('[njt] Missing NJT_USERNAME / NJT_PASSWORD in backend env');
    }

    const day = todayKey();
    if (this.tokenFetchAttemptsDay !== day) {
      this.tokenFetchAttemptsDay = day;
      this.tokenFetchAttempts = 0;
      this.tokenBackoffUntilMs = 0;
      this.persist();
    }

    if (Date.now() < this.tokenBackoffUntilMs) {
      throw new Error('[njt] Token fetch is in backoff window; try again shortly');
    }

    // Docs: daily usage limit is 10 for getToken.
    if (this.tokenFetchAttempts >= 10) {
      throw new Error('[njt] Token fetch daily limit guard reached (10). Refusing further getToken calls today.');
    }

    this.tokenFetchAttempts += 1;
    this.persist();

    const raw = await this.postForm('/api/TrainData/getToken', {
      username: env.NJT_USERNAME,
      password: env.NJT_PASSWORD,
    });

    if (raw === null) return null;
    if (!isObject(raw)) throw new Error(`[njt] Unexpected getToken response: ${String(raw)}`);

    if (typeof raw.errorMessage === 'string') {
      throw new Error(`[njt] getToken error: ${raw.errorMessage}`);
    }

    const tr = raw as TokenResponse;
    if (tr && tr.Authenticated === 'True' && typeof tr.UserToken === 'string' && tr.UserToken) {
      return tr.UserToken;
    }

    // Auth failed: back off a bit to avoid hammering the daily limit in a tight loop.
    this.tokenBackoffUntilMs = Date.now() + 60_000;
    this.persist();
    if (tr && tr.Authenticated === 'False') {
      throw new Error('[njt] getToken rejected credentials (Authenticated=False)');
    }
    throw new Error('[njt] getToken authentication failed (unexpected response)');
  }

  private async isValidToken(token: string): Promise<boolean> {
    const day = todayKey();
    if (this.tokenCheckedDay === day) {
      // We already checked "today"; assume still OK to avoid hitting daily limit.
      return true;
    }

    const raw = await this.postForm('/api/TrainData/isValidToken', { token });
    this.tokenCheckedDay = day;
    this.persist();

    if (raw === null) return false;
    if (!isObject(raw)) return false;

    if (typeof raw.errorMessage === 'string') {
      // Treat as invalid; caller may attempt getToken
      return false;
    }

    const vr = raw as ValidTokenResponse;
    return Boolean(vr && vr.validToken === true);
  }

  private async ensureToken(): Promise<string> {
    if (this.token) {
      const ok = await this.isValidToken(this.token);
      if (ok) return this.token;
      this.token = null;
      this.persist();
    }

    const token = await this.getToken();
    if (!token) throw new Error('[njt] Failed to obtain token');
    this.token = token;
    this.persist();
    return token;
  }

  /**
   * getVehicleData: provides realtime position/next stop/delay for trains moved in last ~5 minutes.
   * Docs: `POST` multipart/form-data with only `token`.
   */
  async getVehicleData(): Promise<NjtVehicleDataRow[]> {
    const token = await this.ensureToken();
    const raw = await this.postForm('/api/TrainData/getVehicleData', { token });

    if (raw === null) return [];
    if (Array.isArray(raw)) return raw as unknown as NjtVehicleDataRow[];

    if (isObject(raw) && typeof raw.errorMessage === 'string') {
      // Invalid token is the common case; clear + retry once
      if (raw.errorMessage.toLowerCase().includes('invalid token')) {
        this.token = null;
        this.persist();
        const token2 = await this.ensureToken();
        const raw2 = await this.postForm('/api/TrainData/getVehicleData', { token: token2 });
        if (Array.isArray(raw2)) return raw2 as unknown as NjtVehicleDataRow[];
      }
      throw new Error(`[njt] getVehicleData error: ${raw.errorMessage}`);
    }

    // Some failure modes are "Null" or plain text
    if (typeof raw === 'string' && raw.trim().toLowerCase() === 'null') return [];

    throw new Error(`[njt] Unexpected getVehicleData response: ${JSON.stringify(raw as JsonValue)}`);
  }
}


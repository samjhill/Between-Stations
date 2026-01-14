import fs from 'node:fs';
import path from 'node:path';

export type PersistedTokenState = {
  token: string | null;
  tokenCheckedDay: string | null;
  tokenFetchAttemptsDay: string | null;
  tokenFetchAttempts: number;
  tokenBackoffUntilMs: number;
  savedAtMs: number;
};

function safeParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export class TokenStateStore {
  constructor(private readonly filename: string) {}

  load(): PersistedTokenState | null {
    try {
      if (!fs.existsSync(this.filename)) return null;
      const raw = fs.readFileSync(this.filename, 'utf8');
      const parsed = safeParseJson<PersistedTokenState>(raw);
      if (!parsed) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  save(state: Omit<PersistedTokenState, 'savedAtMs'>): void {
    const dir = path.dirname(this.filename);
    fs.mkdirSync(dir, { recursive: true });

    const payload: PersistedTokenState = { ...state, savedAtMs: Date.now() };
    const tmp = `${this.filename}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(payload), 'utf8');
    fs.renameSync(tmp, this.filename);
  }
}


/**
 * Data Provider Abstraction
 * 
 * Providers supply evidence, not truth.
 * Each provider produces observations about trains and stations.
 * Multiple providers can be fused together.
 */

import type { ProviderObservation } from '../types/domain';

export interface IDataProvider {
  /**
   * Unique identifier for this provider
   */
  readonly id: string;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * Whether this provider is currently available
   */
  isAvailable(): boolean;

  /**
   * Fetch the latest observations
   * Returns null if unavailable or if fetch fails
   */
  fetchObservations(): Promise<ProviderObservation | null>;

  /**
   * Update interval in milliseconds
   */
  readonly updateInterval: number;
}

/**
 * Base provider implementation with common functionality
 */
export abstract class BaseProvider implements IDataProvider {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly updateInterval: number;

  protected _available = false;
  protected _lastFetchTime: number | null = null;
  protected _lastError: Error | null = null;

  isAvailable(): boolean {
    return this._available;
  }

  abstract fetchObservations(): Promise<ProviderObservation | null>;

  /**
   * Get the age of the most recent data in milliseconds
   */
  getDataAge(): number | null {
    if (this._lastFetchTime === null) return null;
    return Date.now() - this._lastFetchTime;
  }

  /**
   * Get the last error, if any
   */
  getLastError(): Error | null {
    return this._lastError;
  }

  protected markAvailable() {
    this._available = true;
    this._lastError = null;
  }

  protected markUnavailable(error?: Error) {
    this._available = false;
    if (error) {
      this._lastError = error;
    }
  }

  protected updateFetchTime() {
    this._lastFetchTime = Date.now();
  }
}

/**
 * Provider manager that coordinates multiple providers
 */
export class ProviderManager {
  private providers: Map<string, IDataProvider> = new Map();
  private fetchPromises: Map<string, Promise<ProviderObservation | null>> = new Map();

  /**
   * Register a provider
   */
  register(provider: IDataProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Unregister a provider
   */
  unregister(providerId: string): void {
    this.providers.delete(providerId);
  }

  /**
   * Fetch observations from all providers
   * Providers that fail will mark themselves unavailable
   */
  async fetchAllObservations(): Promise<ProviderObservation[]> {
    const providers = Array.from(this.providers.values());
    
    const observations = await Promise.allSettled(
      providers.map(async (provider) => {
        // Deduplicate concurrent fetches
        const existing = this.fetchPromises.get(provider.id);
        if (existing) return existing;
        
        const promise = provider.fetchObservations();
        this.fetchPromises.set(provider.id, promise);
        
        try {
          const result = await promise;
          return result;
        } finally {
          this.fetchPromises.delete(provider.id);
        }
      })
    );

    const results: ProviderObservation[] = [];
    for (const result of observations) {
      if (result.status === 'fulfilled' && result.value !== null) {
        results.push(result.value);
      }
    }

    return results;
  }

  /**
   * Get all registered providers
   */
  getProviders(): IDataProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get a specific provider
   */
  getProvider(id: string): IDataProvider | undefined {
    return this.providers.get(id);
  }
}


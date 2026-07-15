import { SearchResponse } from '../types';

export class SearchCache {
  private static instance: SearchCache | null = null;

  private queryCache: Map<string, { response: SearchResponse; expiry: number }> = new Map();
  private autocompleteCache: Map<string, string[]> = new Map();
  
  private ttlMs = 30 * 1000; // 30 seconds default cache TTL

  private constructor() {}

  public static getInstance(): SearchCache {
    if (!this.instance) {
      this.instance = new SearchCache();
    }
    return this.instance;
  }

  /**
   * Retrieves a cached search response if valid.
   */
  public getQueryResult(queryHash: string): SearchResponse | null {
    const cached = this.queryCache.get(queryHash);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.queryCache.delete(queryHash);
      return null;
    }

    return cached.response;
  }

  /**
   * Saves a search response in cache.
   */
  public setQueryResult(queryHash: string, response: SearchResponse): void {
    this.queryCache.set(queryHash, {
      response,
      expiry: Date.now() + this.ttlMs
    });
  }

  /**
   * Returns suggestions matching a partial keyword.
   */
  public getAutocomplete(prefix: string): string[] | null {
    return this.autocompleteCache.get(prefix.toLowerCase()) || null;
  }

  /**
   * Caches autocomplete lists.
   */
  public setAutocomplete(prefix: string, list: string[]): void {
    this.autocompleteCache.set(prefix.toLowerCase(), list);
  }

  /**
   * Clears the caches.
   */
  public clear(): void {
    this.queryCache.clear();
    this.autocompleteCache.clear();
  }
}

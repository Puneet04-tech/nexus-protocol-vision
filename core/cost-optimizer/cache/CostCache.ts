interface CacheEntry<T> {
  value: T;
  expiry: number;
}

export class CostCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTtlMs: number;

  constructor(defaultTtlMs: number = 300000) { // Default 5 minutes
    this.defaultTtlMs = defaultTtlMs;
  }

  public get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  public set<T>(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs !== undefined ? ttlMs : this.defaultTtlMs;
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }

  public cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }
}
export const defaultCostCache = new CostCache();

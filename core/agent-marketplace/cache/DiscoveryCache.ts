interface CacheEntry<T> {
  value: T;
  expiry: number;
}

export class DiscoveryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTtlMs = 60000; // 1 minute default TTL

  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  public set<T>(key: string, value: T, ttlMs: number = this.defaultTtlMs): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs
    });
  }

  public clear(): void {
    this.cache.clear();
  }
}

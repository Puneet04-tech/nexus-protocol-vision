interface CacheEntry<T> {
  value: T;
  expiry: number;
}

export class IncidentCache {
  private static instance: IncidentCache | null = null;
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTtlMs = 15000; // 15 seconds default in-memory TTL for quick SRE dashboard loops

  private constructor() {}

  public static getInstance(): IncidentCache {
    if (!this.instance) {
      this.instance = new IncidentCache();
    }
    return this.instance;
  }

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

  public invalidate(key: string): void {
    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }
}

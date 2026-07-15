import { ModelMetadata } from '../types';

export class RegistryCache {
  private static instance: RegistryCache | null = null;
  private cache: Map<string, { model: ModelMetadata; expiry: number }> = new Map();
  private readonly CACHE_TTL_MS = 60000; // 1 minute expiration

  private constructor() {}

  public static getInstance(): RegistryCache {
    if (!this.instance) {
      this.instance = new RegistryCache();
    }
    return this.instance;
  }

  public get(id: string): ModelMetadata | null {
    const entry = this.cache.get(id);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(id);
      return null;
    }

    return entry.model;
  }

  public set(id: string, model: ModelMetadata): void {
    const expiry = Date.now() + this.CACHE_TTL_MS;
    this.cache.set(id, { model, expiry });
  }

  public invalidate(id: string): void {
    this.cache.delete(id);
  }

  public clear(): void {
    this.cache.clear();
  }
}

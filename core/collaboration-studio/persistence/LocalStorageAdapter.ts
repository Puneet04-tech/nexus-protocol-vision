export class LocalStorageAdapter {
  public static get<T>(key: string): T[] {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return [];
    }
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`Error reading key ${key} from LocalStorage:`, e);
      return [];
    }
  }

  public static set<T>(key: string, value: T[]): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing key ${key} to LocalStorage:`, e);
    }
  }

  public static getOne<T>(key: string, predicate: (item: T) => boolean): T | null {
    const list = this.get<T>(key);
    return list.find(predicate) || null;
  }

  public static upsert<T>(key: string, item: T, identify: (x: T) => boolean): void {
    const list = this.get<T>(key);
    const index = list.findIndex(identify);
    if (index > -1) {
      list[index] = item;
    } else {
      list.push(item);
    }
    this.set(key, list);
  }

  public static delete<T>(key: string, identify: (x: T) => boolean): boolean {
    const list = this.get<T>(key);
    const filtered = list.filter(x => !identify(x));
    if (filtered.length !== list.length) {
      this.set(key, filtered);
      return true;
    }
    return false;
  }

  public static clear(key: string): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
}

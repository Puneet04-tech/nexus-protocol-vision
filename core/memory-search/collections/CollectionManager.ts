import { Memory, MemoryCollection, SearchQuery } from '../types';
import { MemoryRepository } from '../repository/MemoryRepository';

export class CollectionManager {
  private static instance: CollectionManager | null = null;
  private repository = MemoryRepository.getInstance();

  private constructor() {}

  public static getInstance(): CollectionManager {
    if (!this.instance) {
      this.instance = new CollectionManager();
    }
    return this.instance;
  }

  /**
   * Toggles bookmark state for a memory.
   */
  public toggleBookmark(memoryId: string): boolean {
    const memory = this.repository.getMemory(memoryId);
    if (!memory) return false;
    memory.isBookmarked = !memory.isBookmarked;
    memory.updatedAt = Date.now();
    this.repository.saveMemory(memory);
    return memory.isBookmarked;
  }

  /**
   * Toggles favorite state for a memory.
   */
  public toggleFavorite(memoryId: string): boolean {
    const memory = this.repository.getMemory(memoryId);
    if (!memory) return false;
    memory.isFavorite = !memory.isFavorite;
    memory.updatedAt = Date.now();
    this.repository.saveMemory(memory);
    return memory.isFavorite;
  }

  /**
   * Toggles pinned state for a memory.
   */
  public togglePin(memoryId: string): boolean {
    const memory = this.repository.getMemory(memoryId);
    if (!memory) return false;
    memory.isPinned = !memory.isPinned;
    memory.updatedAt = Date.now();
    this.repository.saveMemory(memory);
    return memory.isPinned;
  }

  /**
   * Creates a static or smart collection folder.
   */
  public createCollection(name: string, description: string, memoryIds: string[] = [], isSmart = false, filterCriteria?: SearchQuery): MemoryCollection {
    const now = Date.now();
    const id = `col_${now}_${Math.random().toString(36).substr(2, 5)}`;
    
    const col: MemoryCollection = {
      id,
      name,
      description,
      memoryIds: isSmart ? [] : memoryIds,
      isSmart,
      filterCriteria,
      createdAt: now,
      updatedAt: now
    };

    this.repository.saveCollection(col);
    return col;
  }

  /**
   * Adds memories to a static collection folder.
   */
  public addMemoriesToCollection(collectionId: string, memoryIds: string[]): boolean {
    const col = this.repository.getCollection(collectionId);
    if (!col || col.isSmart) return false;

    // Filter duplicates
    const updatedIds = Array.from(new Set([...col.memoryIds, ...memoryIds]));
    col.memoryIds = updatedIds;
    col.updatedAt = Date.now();
    
    this.repository.saveCollection(col);
    return true;
  }

  /**
   * Removes memories from a static collection folder.
   */
  public removeMemoriesFromCollection(collectionId: string, memoryIds: string[]): boolean {
    const col = this.repository.getCollection(collectionId);
    if (!col || col.isSmart) return false;

    col.memoryIds = col.memoryIds.filter(id => !memoryIds.includes(id));
    col.updatedAt = Date.now();

    this.repository.saveCollection(col);
    return true;
  }
}

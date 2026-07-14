import { MemoryItem } from './types';

export class MemoryArchiveService {
  /**
   * Archive a memory item.
   * Pinned memories will throw an error or be protected.
   */
  archive(item: MemoryItem): boolean {
    if (item.isPinned) {
      throw new Error(`Cannot archive memory ${item.id} because it is pinned.`);
    }

    if (item.status === 'archived') {
      return false; // Already archived
    }

    item.status = 'archived';
    item.lastOptimizedTime = Date.now();
    return true;
  }

  /**
   * Restore an archived memory item.
   */
  restore(item: MemoryItem): boolean {
    if (item.status === 'active') {
      return false; // Already active
    }

    item.status = 'active';
    item.lastAccessed = Date.now(); // Mark as recently accessed upon restoration
    item.accessCount = (item.accessCount || 0) + 1; // Increment access count for active use
    item.lastOptimizedTime = Date.now();
    return true;
  }
}

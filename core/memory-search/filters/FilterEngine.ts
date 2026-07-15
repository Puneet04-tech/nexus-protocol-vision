import { Memory, SearchQuery } from '../types';
import { MemoryRepository } from '../repository/MemoryRepository';

export class FilterEngine {
  private static instance: FilterEngine | null = null;
  private repository = MemoryRepository.getInstance();

  private constructor() {}

  public static getInstance(): FilterEngine {
    if (!this.instance) {
      this.instance = new FilterEngine();
    }
    return this.instance;
  }

  /**
   * Filters a list of memories based on the specified SearchQuery parameters.
   */
  public filterMemories(memories: Memory[], query: SearchQuery): Memory[] {
    return memories.filter(memory => {
      // 1. Text category checks
      if (query.categories && query.categories.length > 0) {
        if (!query.categories.includes(memory.category)) {
          return false;
        }
      }

      // 2. Source checks
      if (query.sources && query.sources.length > 0) {
        if (!query.sources.includes(memory.source)) {
          return false;
        }
      }

      // 3. Tag intersection checks (match all tags if provided)
      if (query.tags && query.tags.length > 0) {
        const hasAllTags = query.tags.every(t => memory.tags.includes(t));
        if (!hasAllTags) {
          return false;
        }
      }

      // 4. Date range filter
      if (query.dateRange) {
        const { start, end } = query.dateRange;
        if (start !== undefined && memory.recency < start) {
          return false;
        }
        if (end !== undefined && memory.recency > end) {
          return false;
        }
      }

      // 5. Agent ID checks
      if (query.agentIds && query.agentIds.length > 0) {
        if (!memory.agentId || !query.agentIds.includes(memory.agentId)) {
          return false;
        }
      }

      // 6. Importance check (minimum limit)
      if (query.minImportance !== undefined) {
        if (memory.importance < query.minImportance) {
          return false;
        }
      }

      // 7. Favorite toggle check
      if (query.isFavorite !== undefined) {
        if (memory.isFavorite !== query.isFavorite) {
          return false;
        }
      }

      // 8. Bookmark toggle check
      if (query.isBookmarked !== undefined) {
        if (memory.isBookmarked !== query.isBookmarked) {
          return false;
        }
      }

      // 9. Pinned toggle check
      if (query.isPinned !== undefined) {
        if (memory.isPinned !== query.isPinned) {
          return false;
        }
      }

      // 10. Collection ID check
      if (query.collectionId) {
        const collection = this.repository.getCollection(query.collectionId);
        if (collection) {
          if (collection.isSmart) {
            // For Smart Folders, check if it matches the collection's criteria
            if (collection.filterCriteria) {
              const matched = this.filterMemories([memory], {
                ...collection.filterCriteria,
                collectionId: undefined // avoid infinite recursion
              });
              if (matched.length === 0) {
                return false;
              }
            }
          } else {
            // Standard static collection: check if this ID is in the list
            if (!collection.memoryIds.includes(memory.id)) {
              return false;
            }
          }
        } else {
          // If collection specified but not found, fail filter
          return false;
        }
      }

      return true;
    });
  }
}

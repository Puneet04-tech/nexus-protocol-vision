import { Memory, SearchQuery, SearchResponse } from '../types';
import { MemoryRepository } from '../repository/MemoryRepository';
import { MemoryIndexer } from '../indexing/MemoryIndexer';
import { MemoryRetriever } from '../retrieval/MemoryRetriever';
import { SearchCache } from '../cache/SearchCache';

export class MemorySearchService {
  private static instance: MemorySearchService | null = null;

  private repository = MemoryRepository.getInstance();
  private indexer = MemoryIndexer.getInstance();
  private retriever = MemoryRetriever.getInstance();
  private cache = SearchCache.getInstance();

  private constructor() {}

  public static getInstance(): MemorySearchService {
    if (!this.instance) {
      this.instance = new MemorySearchService();
    }
    return this.instance;
  }

  /**
   * Ingests a raw/partial memory. Indexes metadata, assigns tags/importance heuristics, generates embeddings, and saves it.
   */
  public async ingestMemory(memory: Partial<Memory>): Promise<Memory> {
    // 1. Index the memory (computes tags, importance, embeddings)
    const indexed = await this.indexer.indexMemory(memory);

    // 2. Commit to storage
    this.repository.saveMemory(indexed);

    // 3. Invalidate search cache
    this.cache.clear();

    return indexed;
  }

  /**
   * Performs query search. Consults cache first.
   */
  public async query(searchQuery: SearchQuery): Promise<SearchResponse> {
    // Compile hash representing current query configuration
    const queryHash = JSON.stringify(searchQuery);
    
    // Check cache
    const cachedResponse = this.cache.getQueryResult(queryHash);
    if (cachedResponse) {
      return {
        ...cachedResponse,
        timeTakenMs: 0 // cached speed indicator
      };
    }

    // Retrieve fresh results
    const response = await this.retriever.retrieve(searchQuery);

    // Cache results
    this.cache.setQueryResult(queryHash, response);

    return response;
  }

  /**
   * Deletes a memory and invalidates cache.
   */
  public deleteMemory(id: string): boolean {
    const success = this.repository.deleteMemory(id);
    if (success) {
      this.cache.clear();
    }
    return success;
  }
}

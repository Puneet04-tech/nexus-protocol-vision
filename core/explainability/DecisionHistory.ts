import { TraceFilters, PaginatedTraces, DecisionTrace } from './ExplainabilityTypes';
import { DecisionStorage } from './DecisionStorage';
import { DecisionFilters } from './DecisionFilters';

export class DecisionHistory {
  private storage: DecisionStorage;

  constructor() {
    this.storage = DecisionStorage.getInstance();
  }

  /**
   * Queries and returns a filtered, sorted, paginated set of decision traces.
   */
  public query(filters: TraceFilters = {}): PaginatedTraces {
    const allTraces = this.storage.getAllTraces();
    const filtered = DecisionFilters.filterTraces(allTraces, filters);

    // Pagination
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, filters.limit || 10);
    const total = filtered.length;
    const pages = Math.ceil(total / limit);

    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    return {
      items: paginatedItems,
      total,
      page,
      limit,
      pages
    };
  }

  /**
   * Save or update a trace.
   */
  public record(trace: DecisionTrace): void {
    this.storage.saveTrace(trace);
  }

  /**
   * Retrieve a trace by its specific ID.
   */
  public get(id: string): DecisionTrace | undefined {
    return this.storage.getTraceById(id);
  }

  /**
   * Reset database back to default seed records.
   */
  public reset(): void {
    this.storage.resetToSeeds();
  }

  /**
   * Purge all items.
   */
  public clear(): void {
    this.storage.clearAll();
  }

  /**
   * Get unique decision types for dropdown filters.
   */
  public getUniqueTypes(): string[] {
    const traces = this.storage.getAllTraces();
    const types = new Set(traces.map(t => t.decisionType));
    return Array.from(types);
  }

  /**
   * Get unique persona IDs for dropdown filters.
   */
  public getUniquePersonas(): string[] {
    const traces = this.storage.getAllTraces();
    const personas = new Set(traces.map(t => t.personaId));
    return Array.from(personas);
  }
}

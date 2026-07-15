import { AgentRepository } from '../repository/AgentRepository';
import { DiscoveryCache } from '../cache/DiscoveryCache';
import { SearchCriteria, SearchResult } from '../types';

export class AgentDiscovery {
  private repository: AgentRepository;
  private cache: DiscoveryCache;

  constructor(repository: AgentRepository, cache: DiscoveryCache) {
    this.repository = repository;
    this.cache = cache;
  }

  /**
   * Search agents based on complex criteria. Caches search queries.
   */
  public search(criteria: SearchCriteria): SearchResult {
    const cacheKey = JSON.stringify(criteria);
    const cached = this.cache.get<SearchResult>(cacheKey);
    if (cached) {
      return cached;
    }

    let results = this.repository.list();

    // 1. Full-text search query
    if (criteria.query) {
      const q = criteria.query.toLowerCase().trim();
      results = results.filter(agent =>
        agent.name.toLowerCase().includes(q) ||
        agent.description.toLowerCase().includes(q) ||
        agent.publisher.name.toLowerCase().includes(q) ||
        agent.tags.some(t => t.toLowerCase().includes(q)) ||
        agent.capabilities.some(c => c.toLowerCase().includes(q))
      );
    }

    // 2. Capabilities filter
    if (criteria.capabilities && criteria.capabilities.length > 0) {
      results = results.filter(agent =>
        criteria.capabilities!.every(req =>
          agent.capabilities.some(c => c.toLowerCase() === req.toLowerCase())
        )
      );
    }

    // 3. Categories filter
    if (criteria.categories && criteria.categories.length > 0) {
      results = results.filter(agent =>
        criteria.categories!.every(req =>
          agent.categories.some(c => c.toLowerCase() === req.toLowerCase())
        )
      );
    }

    // 4. Tags filter
    if (criteria.tags && criteria.tags.length > 0) {
      results = results.filter(agent =>
        criteria.tags!.every(req =>
          agent.tags.some(t => t.toLowerCase() === req.toLowerCase())
        )
      );
    }

    // 5. Publisher filter
    if (criteria.publisher) {
      const p = criteria.publisher.toLowerCase();
      results = results.filter(agent => agent.publisher.name.toLowerCase().includes(p));
    }

    // 6. Sorting
    const sortBy = criteria.sortBy || 'downloads';
    const sortOrder = criteria.sortOrder || 'desc';
    const modifier = sortOrder === 'desc' ? -1 : 1;

    results.sort((a, b) => {
      switch (sortBy) {
        case 'downloads':
          return (a.downloadCount - b.downloadCount) * modifier;
        case 'rating':
          return (a.rating - b.rating) * modifier;
        case 'newest':
          return (new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()) * modifier;
        case 'alphabetical':
          return a.name.localeCompare(b.name) * modifier;
        default:
          return 0;
      }
    });

    // 7. Pagination
    const totalCount = results.length;
    const page = criteria.page || 1;
    const pageSize = criteria.pageSize || 10;
    const totalPages = Math.ceil(totalCount / pageSize);
    
    const startIndex = (page - 1) * pageSize;
    const paginatedResults = results.slice(startIndex, startIndex + pageSize);

    const searchResult: SearchResult = {
      agents: paginatedResults,
      totalCount,
      page,
      pageSize,
      totalPages
    };

    // Cache the result for 30 seconds
    this.cache.set(cacheKey, searchResult, 30000);

    return searchResult;
  }
}

import { Memory, SearchQuery, SearchResult, SearchResponse } from '../types';
import { SimilarityEngine } from '../semantic-search/SimilarityEngine';
import { FilterEngine } from '../filters/FilterEngine';
import { MemoryRepository } from '../repository/MemoryRepository';
import { MemoryValidator } from '../validators';

export class MemoryRetriever {
  private static instance: MemoryRetriever | null = null;
  
  private similarityEngine = SimilarityEngine.getInstance();
  private filterEngine = FilterEngine.getInstance();
  private repository = MemoryRepository.getInstance();

  private constructor() {}

  public static getInstance(): MemoryRetriever {
    if (!this.instance) {
      this.instance = new MemoryRetriever();
    }
    return this.instance;
  }

  /**
   * Performs semantic, keyword, or hybrid retrieval on memories matching query filters.
   */
  public async retrieve(query: SearchQuery): Promise<SearchResponse> {
    const startTimer = Date.now();

    // 1. Validate query
    const validation = MemoryValidator.validateSearchQuery(query);
    if (!validation.valid) {
      throw new Error(`Invalid Search Query: ${validation.errors.join(', ')}`);
    }

    // 2. Fetch and apply Boolean filters
    let memories = this.repository.listMemories();
    memories = this.filterEngine.filterMemories(memories, query);

    if (memories.length === 0) {
      return {
        results: [],
        totalCount: 0,
        timeTakenMs: Date.now() - startTimer
      };
    }

    // Sanitized search query text
    const queryText = query.text ? MemoryValidator.sanitizeQueryText(query.text) : '';
    const searchType = query.searchType || 'hybrid';

    // 3. Compute relevance scores
    let relevanceScores: number[] = new Array(memories.length).fill(1.0); // Default to 1.0 if query text is empty
    let queryExpanded = '';

    if (queryText) {
      if (searchType === 'semantic') {
        const queryEmbedding = await this.similarityEngine.getEmbedding(queryText);
        
        if (queryEmbedding) {
          // Perform vector cosine similarity
          relevanceScores = memories.map(memory => {
            if (memory.embedding) {
              return this.similarityEngine.calculateCosineSimilarity(queryEmbedding, memory.embedding);
            }
            // Fallback for individual memories missing embeddings
            return this.similarityEngine.calculateLocalSimilarity(queryText, [memory.content])[0];
          });
          queryExpanded = `[Vector Semantic Model: text-embedding-004] "${queryText}"`;
        } else {
          // Local fallback
          relevanceScores = this.similarityEngine.calculateLocalSimilarity(queryText, memories.map(m => m.content));
          queryExpanded = `[Local Semantic Fallback] "${queryText}" expanded with tech synonyms`;
        }
      } else if (searchType === 'keyword') {
        // Keyword overlap similarity without synonym expansions (direct match only)
        // We simulate this by passing the text without expansion or using direct text matching
        relevanceScores = memories.map(m => {
          const mTokens = m.content.toLowerCase().split(/\W+/);
          const qTokens = queryText.toLowerCase().split(/\W+/).filter(t => t.length > 2);
          if (qTokens.length === 0) return 1.0;
          
          let matches = 0;
          qTokens.forEach(t => {
            if (mTokens.includes(t)) matches++;
          });
          return matches / qTokens.length;
        });
        queryExpanded = `[Exact Keyword Match] "${queryText}"`;
      } else {
        // Hybrid mode (Weighted blend of semantic fallbacks + direct keyword matches)
        const localSem = this.similarityEngine.calculateLocalSimilarity(queryText, memories.map(m => m.content));
        const queryEmbedding = await this.similarityEngine.getEmbedding(queryText);
        
        let semanticScores = localSem;
        if (queryEmbedding) {
          semanticScores = memories.map((m, idx) => {
            if (m.embedding) {
              return this.similarityEngine.calculateCosineSimilarity(queryEmbedding, m.embedding);
            }
            return localSem[idx];
          });
          queryExpanded = `[Hybrid Vector + Keyword] "${queryText}"`;
        } else {
          queryExpanded = `[Hybrid Synonym-TF-IDF] "${queryText}"`;
        }

        relevanceScores = memories.map((m, idx) => {
          // Direct sub-string check boost
          const cleanQ = queryText.toLowerCase();
          const cleanC = m.content.toLowerCase();
          const hasDirectSubstring = cleanC.includes(cleanQ) ? 0.3 : 0.0;
          
          // Blend semantic similarity (70%) and substring presence (30%)
          return Math.min(1.0, (semanticScores[idx] * 0.7) + hasDirectSubstring);
        });
      }
    }

    // 4. Compute recency scores (normalize timestamps of filtered memories to [0,1])
    let minTime = Date.now();
    let maxTime = 0;
    memories.forEach(m => {
      if (m.recency < minTime) minTime = m.recency;
      if (m.recency > maxTime) maxTime = m.recency;
    });

    const timeDiff = maxTime - minTime;
    const recencyScores = memories.map(m => {
      if (timeDiff === 0) return 1.0;
      return (m.recency - minTime) / timeDiff; // newer = closer to 1
    });

    // 5. Compile and rank SearchResult items
    const sortBy = query.sortBy || 'relevance';
    const sortOrder = query.sortOrder || 'desc';

    // Weights configuration based on sorting request
    let wRel = 0.55;
    let wImp = 0.25;
    let wRec = 0.20;

    if (sortBy === 'recency') {
      wRel = 0.20;
      wImp = 0.10;
      wRec = 0.70;
    } else if (sortBy === 'importance') {
      wRel = 0.20;
      wImp = 0.70;
      wRec = 0.10;
    }

    let results: SearchResult[] = memories.map((memory, index) => {
      const relevance = relevanceScores[index];
      const recency = recencyScores[index];
      const importance = memory.importance;

      // Composite scoring formula
      const score = (relevance * wRel) + (importance * wImp) + (recency * wRec);

      // Create reasoning audit
      const matchReasons: string[] = [];
      if (relevance > 0.4) matchReasons.push(`Strong text similarity (${Math.round(relevance * 100)}%)`);
      if (importance >= 0.75) matchReasons.push(`High significance level (${Math.round(importance * 100)}%)`);
      if (recency >= 0.8) matchReasons.push('Recent event');
      if (memory.isPinned) matchReasons.push('Pinned memory priority');

      if (matchReasons.length === 0) {
        matchReasons.push('Matched metadata parameters');
      }

      return {
        memory,
        score: parseFloat(score.toFixed(4)),
        relevanceScore: parseFloat(relevance.toFixed(4)),
        importanceScore: parseFloat(importance.toFixed(4)),
        recencyScore: parseFloat(recency.toFixed(4)),
        matchReasons
      };
    });

    // 6. Sort results
    results.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'alphabetical') {
        comparison = a.memory.content.localeCompare(b.memory.content);
      } else {
        comparison = a.score - b.score;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // 7. Apply Pagination (limit/offset)
    const totalCount = results.length;
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    results = results.slice(offset, offset + limit);

    // 8. Generate dynamic suggestions based on matched content tags
    const matchedTags = new Set<string>();
    results.forEach(res => res.memory.tags.forEach(t => matchedTags.add(t)));
    const suggestions = Array.from(matchedTags).slice(0, 3).map(tag => `Show files on ${tag}`);

    return {
      results,
      totalCount,
      queryExpanded: queryExpanded || undefined,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      timeTakenMs: Date.now() - startTimer
    };
  }
}

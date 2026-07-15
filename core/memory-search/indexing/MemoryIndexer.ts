import { Memory } from '../types';
import { SimilarityEngine } from '../semantic-search/SimilarityEngine';

export class MemoryIndexer {
  private static instance: MemoryIndexer | null = null;
  private similarityEngine = SimilarityEngine.getInstance();

  private keyTagMapping: Record<string, string[]> = {
    react: ['react', 'web-development', 'frontend'],
    routing: ['routing', 'navigation'],
    vite: ['vite', 'bundler', 'esm'],
    security: ['security', 'threat-mitigation', 'firewall'],
    privacy: ['privacy', 'cryptography', 'data-retention'],
    zkp: ['zkp', 'cryptography', 'zero-knowledge'],
    carbon: ['carbon-aware', 'green-compute', 'sustainability'],
    budget: ['budgets', 'alerts'],
    orchestrator: ['orchestration', 'multi-agent', 'pipelines'],
    marketplace: ['marketplace', 'plugins', 'registry'],
    collaboration: ['collaboration', 'conflict-resolution'],
    benchmark: ['benchmark', 'metrics', 'llm-eval']
  };

  private constructor() {}

  public static getInstance(): MemoryIndexer {
    if (!this.instance) {
      this.instance = new MemoryIndexer();
    }
    return this.instance;
  }

  /**
   * Processes a memory: extracts tags, computes importance factors, and triggers embedding updates.
   */
  public async indexMemory(memory: Partial<Memory>): Promise<Memory> {
    const now = Date.now();
    const content = memory.content || '';
    
    // Auto-extract tags based on content keywords
    const extractedTags = this.autoExtractTags(content);
    const existingTags = memory.tags || [];
    const combinedTags = Array.from(new Set([...existingTags, ...extractedTags]));

    // Determine category based on keywords if absent
    let category = memory.category;
    if (!category) {
      category = this.heuristicClassifyCategory(content);
    }

    // Determine source if absent
    let source = memory.source;
    if (!source) {
      source = this.heuristicClassifySource(content);
    }

    // Automatically adjust importance based on keywords
    let importance = memory.importance !== undefined ? memory.importance : 0.5;
    importance = this.calculateHeuristicImportance(content, importance);

    // Auto-generate Cognitive Graph Associations
    const associations = memory.associations || [];
    const extractedAssociations = this.autoExtractAssociations(content);
    
    // Merge associations
    const mergedAssociationsMap = new Map<string, number>();
    associations.forEach(a => mergedAssociationsMap.set(a.concept, a.strength));
    extractedAssociations.forEach(a => {
      const existing = mergedAssociationsMap.get(a.concept);
      if (!existing || existing < a.strength) {
        mergedAssociationsMap.set(a.concept, a.strength);
      }
    });
    
    const mergedAssociations = Array.from(mergedAssociationsMap.entries()).map(([concept, strength]) => ({
      concept,
      strength
    }));

    // Trigger asynchronous embedding generation (runs synchronously in wait-block if API is active)
    let embedding = memory.embedding;
    try {
      const freshEmbedding = await this.similarityEngine.getEmbedding(content);
      if (freshEmbedding) {
        embedding = freshEmbedding;
      }
    } catch (e) {
      console.warn('Embedding generation skipped during indexing:', e);
    }

    const indexedMemory: Memory = {
      id: memory.id || `mem_${now}_${Math.random().toString(36).substr(2, 5)}`,
      content,
      embedding,
      importance,
      recency: memory.recency || now,
      tags: combinedTags,
      category,
      source,
      agentId: memory.agentId,
      metadata: {
        ...(memory.metadata || {}),
        indexedAt: now,
        contentLength: content.length,
        privacyLevel: memory.metadata?.privacyLevel || 'selective'
      },
      isFavorite: !!memory.isFavorite,
      isBookmarked: !!memory.isBookmarked,
      isPinned: !!memory.isPinned,
      associations: mergedAssociations,
      createdAt: memory.createdAt || now,
      updatedAt: now
    };

    return indexedMemory;
  }

  /**
   * Scans content text for keywords to assign tags automatically.
   */
  private autoExtractTags(content: string): string[] {
    const text = content.toLowerCase();
    const tags: string[] = [];

    // Parse hashtags if any
    const hashtagRegex = /#(\w+)/g;
    let match;
    while ((match = hashtagRegex.exec(content)) !== null) {
      tags.push(match[1].toLowerCase());
    }

    // Keyword lookup
    Object.entries(this.keyTagMapping).forEach(([key, mappedTags]) => {
      if (text.includes(key)) {
        tags.push(...mappedTags);
      }
    });

    return Array.from(new Set(tags));
  }

  /**
   * Classifies memories into categories if not explicitly set.
   */
  private heuristicClassifyCategory(content: string): 'conversation' | 'knowledge' | 'interaction' | 'system' {
    const text = content.toLowerCase();
    if (text.includes('blocked') || text.includes('unauthorized') || text.includes('rebuilt') || text.includes('system immune')) {
      return 'system';
    }
    if (text.includes('user query') || text.includes('user:') || text.includes('prompt:') || text.includes('conversation')) {
      return 'conversation';
    }
    if (text.includes('negotiator') || text.includes('negotiated') || text.includes('cooperated') || text.includes('conflict')) {
      return 'interaction';
    }
    return 'knowledge';
  }

  /**
   * Guess the source of the memory.
   */
  private heuristicClassifySource(content: string): 'Sovereign Persona' | 'Cognitive Graph' | 'Workflow Orchestrator' | 'AI Marketplace' | 'Collaboration Studio' | 'System' {
    const text = content.toLowerCase();
    if (text.includes('carbon') || text.includes('footprint') || text.includes('solar')) return 'System'; // Carbon aware
    if (text.includes('persona') || text.includes('preferences') || text.includes('ethical boundary')) return 'Sovereign Persona';
    if (text.includes('cognitive') || text.includes('nodes') || text.includes('assimilated concept')) return 'Cognitive Graph';
    if (text.includes('privacy') || text.includes('zkp') || text.includes('zero-knowledge')) return 'System'; // Privacy Negotiator
    if (text.includes('orchestration') || text.includes('pipeline') || text.includes('failover')) return 'Workflow Orchestrator';
    if (text.includes('marketplace') || text.includes('plugin') || text.includes('registry')) return 'AI Marketplace';
    if (text.includes('collaboration') || text.includes('debate') || text.includes('specs')) return 'Collaboration Studio';
    return 'System';
  }

  /**
   * Calculates importance multipliers.
   * If text contains keywords like "violation", "blocked", "failure", "unauthorized", we boost importance.
   */
  private calculateHeuristicImportance(content: string, baseImportance: number): number {
    const text = content.toLowerCase();
    let score = baseImportance;

    // Critical boosts
    if (text.includes('blocked') || text.includes('unauthorized') || text.includes('leakage') || text.includes('vulnerability')) {
      score = Math.max(score, 0.9);
    } else if (text.includes('fail') || text.includes('failure') || text.includes('timeout') || text.includes('warning')) {
      score = Math.max(score, 0.75);
    } else if (text.includes('assimilated') || text.includes('concept') || text.includes('negotiated')) {
      score = Math.max(score, 0.6);
    }

    return parseFloat(score.toFixed(2));
  }

  /**
   * Extracts associations dynamically based on technical concept matching.
   */
  private autoExtractAssociations(content: string): Array<{ concept: string; strength: number }> {
    const text = content.toLowerCase();
    const associations: Array<{ concept: string; strength: number }> = [];

    if (text.includes('zero-knowledge') || text.includes('zkp')) {
      associations.push({ concept: 'Zero Knowledge Proofs', strength: 0.95 });
    }
    if (text.includes('carbon') || text.includes('co2e')) {
      associations.push({ concept: 'Carbon Footprint Target', strength: 0.9 });
    }
    if (text.includes('react') || text.includes('suspense')) {
      associations.push({ concept: 'React Ecosystem', strength: 0.85 });
    }
    if (text.includes('plugin') || text.includes('sandbox')) {
      associations.push({ concept: 'Plugin Sandboxing', strength: 0.8 });
    }
    if (text.includes('negotiation') || text.includes('negotiated')) {
      associations.push({ concept: 'Data Privacy', strength: 0.85 });
    }

    return associations;
  }
}

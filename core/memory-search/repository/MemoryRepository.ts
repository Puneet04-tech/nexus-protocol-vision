import { Memory, MemoryCollection } from '../types';

export class MemoryRepository {
  private static instance: MemoryRepository | null = null;
  
  private storageKeyMemories = 'nexus_memory_explorer_items';
  private storageKeyCollections = 'nexus_memory_explorer_collections';
  
  private memories: Map<string, Memory> = new Map();
  private collections: Map<string, MemoryCollection> = new Map();

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): MemoryRepository {
    if (!this.instance) {
      this.instance = new MemoryRepository();
    }
    return this.instance;
  }

  /**
   * Resets repository data to initial seeds and saves to storage.
   */
  public resetToSeeds(): void {
    this.memories.clear();
    this.collections.clear();
    this.seedMemories();
    this.seedCollections();
    this.saveToStorage();
  }

  public clearAll(): void {
    this.memories.clear();
    this.collections.clear();
    this.saveToStorage();
  }

  // --- Memory CRUD ---
  public getMemory(id: string): Memory | null {
    return this.memories.get(id) || null;
  }

  public listMemories(): Memory[] {
    return Array.from(this.memories.values());
  }

  public saveMemory(memory: Memory): void {
    this.memories.set(memory.id, memory);
    this.saveToStorage();
  }

  public deleteMemory(id: string): boolean {
    const deleted = this.memories.delete(id);
    if (deleted) {
      // Remove from all collections
      for (const col of this.collections.values()) {
        if (col.memoryIds.includes(id)) {
          col.memoryIds = col.memoryIds.filter(mId => mId !== id);
          this.saveCollection(col);
        }
      }
      this.saveToStorage();
    }
    return deleted;
  }

  // --- Collection CRUD ---
  public getCollection(id: string): MemoryCollection | null {
    return this.collections.get(id) || null;
  }

  public listCollections(): MemoryCollection[] {
    return Array.from(this.collections.values());
  }

  public saveCollection(collection: MemoryCollection): void {
    this.collections.set(collection.id, collection);
    this.saveToStorage();
  }

  public deleteCollection(id: string): boolean {
    const deleted = this.collections.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  // --- Storage ---
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKeyMemories, JSON.stringify(this.listMemories()));
      localStorage.setItem(this.storageKeyCollections, JSON.stringify(this.listCollections()));
    } catch (err) {
      console.error('Failed to save memory search repo to localStorage:', err);
    }
  }

  private loadFromStorage(): void {
    try {
      const storedM = localStorage.getItem(this.storageKeyMemories);
      const storedC = localStorage.getItem(this.storageKeyCollections);

      if (storedM) {
        const memList: Memory[] = JSON.parse(storedM);
        memList.forEach(m => this.memories.set(m.id, m));
      } else {
        this.seedMemories();
      }

      if (storedC) {
        const colList: MemoryCollection[] = JSON.parse(storedC);
        colList.forEach(c => this.collections.set(c.id, c));
      } else {
        this.seedCollections();
      }

      // If we loaded seeds or parsed successfully, write back to lock in data
      this.saveToStorage();
    } catch (err) {
      console.warn('Failed to parse localStorage, resetting to seed defaults:', err);
      this.resetToSeeds();
    }
  }

  private seedMemories(): void {
    const baseTime = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
    const oneDay = 24 * 60 * 60 * 1000;
    const oneHour = 60 * 60 * 1000;

    const seeds: Memory[] = [
      {
        id: 'mem_01',
        content: 'Identified user preference for dark mode theme overrides. The interface styling should maintain a neon contrast highlight, specifically using HSL gradients.',
        importance: 0.45,
        recency: baseTime,
        tags: ['ux-design', 'preferences', 'ui-theme'],
        category: 'knowledge',
        source: 'Sovereign Persona',
        metadata: { confidence: 0.95, privacyLevel: 'private' },
        isFavorite: false,
        isBookmarked: false,
        isPinned: false,
        associations: [{ concept: 'User Preferences', strength: 0.9 }],
        createdAt: baseTime,
        updatedAt: baseTime
      },
      {
        id: 'mem_02',
        content: 'Assimilated new concept nodes: React Router v7 and Vite ESM configs. Created cognitive link between Router structures and multi-page code layouts.',
        importance: 0.75,
        recency: baseTime + 1 * oneDay,
        tags: ['react', 'routing', 'vite', 'esm'],
        category: 'knowledge',
        source: 'Cognitive Graph',
        metadata: { confidence: 0.98, nodeCount: 14, privacyLevel: 'selective' },
        isFavorite: true,
        isBookmarked: true,
        isPinned: true,
        associations: [
          { concept: 'Vite Bundler', strength: 0.8 },
          { concept: 'React Router', strength: 0.95 }
        ],
        createdAt: baseTime + 1 * oneDay,
        updatedAt: baseTime + 1 * oneDay
      },
      {
        id: 'mem_03',
        content: 'Privacy Negotiation audit: HealthcareAgent-4 requested raw medical history logs. Negotiator declined request, offering a zero-knowledge proof verification instead.',
        importance: 0.95,
        recency: baseTime + 2 * oneDay,
        tags: ['security', 'privacy', 'zkp', 'cryptography'],
        category: 'interaction',
        source: 'Privacy Negotiator',
        agentId: 'HealthcareAgent-4',
        metadata: { confidence: 0.99, privacyLevel: 'private', proofType: 'zk-SNARK' },
        isFavorite: true,
        isBookmarked: false,
        isPinned: false,
        associations: [
          { concept: 'Zero Knowledge Proofs', strength: 0.99 },
          { concept: 'Data Privacy', strength: 0.95 }
        ],
        createdAt: baseTime + 2 * oneDay,
        updatedAt: baseTime + 2 * oneDay
      },
      {
        id: 'mem_04',
        content: 'Deferred high-compute LLM benchmarking run to Sweden server nodes during off-peak solar hours, reducing estimated carbon footprint from 120g CO2e to 34g CO2e.',
        importance: 0.65,
        recency: baseTime + 3 * oneDay,
        tags: ['carbon-aware', 'green-compute', 'latency-tradeoff'],
        category: 'system',
        source: 'Carbon Aware Optimizer',
        metadata: { carbonSavedGrams: 86, energySource: 'wind-solar', privacyLevel: 'public' },
        isFavorite: false,
        isBookmarked: true,
        isPinned: false,
        associations: [
          { concept: 'Carbon Offset', strength: 0.9 },
          { concept: 'Sweden Compute Cluster', strength: 0.85 }
        ],
        createdAt: baseTime + 3 * oneDay,
        updatedAt: baseTime + 3 * oneDay
      },
      {
        id: 'mem_05',
        content: 'Successfully executed translator, reviewer, and localization chain. Pipeline completed in 840ms with 98.4% translation alignment accuracy.',
        importance: 0.55,
        recency: baseTime + 4 * oneDay,
        tags: ['orchestration', 'multi-agent', 'pipelines'],
        category: 'conversation',
        source: 'Workflow Orchestrator',
        metadata: { pipelineId: 'pipe-trans-99', steps: 3, privacyLevel: 'selective' },
        isFavorite: false,
        isBookmarked: false,
        isPinned: false,
        associations: [{ concept: 'Agent Pipeline', strength: 0.85 }],
        createdAt: baseTime + 4 * oneDay,
        updatedAt: baseTime + 4 * oneDay
      },
      {
        id: 'mem_06',
        content: 'Capability Registry installed plugin: Vercel Composition Patterns package. Verified package sha256 checksum and accepted restricted scoped permission requests.',
        importance: 0.6,
        recency: baseTime + 5 * oneDay,
        tags: ['plugins', 'marketplace', 'security'],
        category: 'system',
        source: 'AI Marketplace',
        metadata: { pluginName: 'vercel-composition', version: '2.1.0', privacyLevel: 'selective' },
        isFavorite: false,
        isBookmarked: false,
        isPinned: false,
        associations: [{ concept: 'Plugin Sandboxing', strength: 0.75 }],
        createdAt: baseTime + 5 * oneDay,
        updatedAt: baseTime + 5 * oneDay
      },
      {
        id: 'mem_07',
        content: 'Resolved collaboration conflict: Agent CodeReviewer flagged variable shadowing in main router hooks. SpecsWriter updated target endpoint schema configuration.',
        importance: 0.7,
        recency: baseTime + 6 * oneDay,
        tags: ['collaboration', 'conflict-resolution', 'schemas'],
        category: 'interaction',
        source: 'Collaboration Studio',
        metadata: { activeAgents: ['CodeReviewer', 'SpecsWriter'], privacyLevel: 'selective' },
        isFavorite: false,
        isBookmarked: false,
        isPinned: false,
        associations: [
          { concept: 'Conflict Arbitration', strength: 0.88 },
          { concept: 'Schema Alignment', strength: 0.8 }
        ],
        createdAt: baseTime + 6 * oneDay,
        updatedAt: baseTime + 6 * oneDay
      },
      {
        id: 'mem_08',
        content: 'Blocked unauthorized memory read query attempt from unverified plugin (TempLogger-x). System immunity index evaluated at 99.8%. Security alert dispatched.',
        importance: 0.9,
        recency: baseTime + 7 * oneDay,
        tags: ['security', 'threat-mitigation', 'immune-system'],
        category: 'system',
        source: 'System',
        metadata: { threatLevel: 'moderate', blockedId: 'TempLogger-x', privacyLevel: 'private' },
        isFavorite: true,
        isBookmarked: false,
        isPinned: true,
        associations: [
          { concept: 'Immune System Guard', strength: 0.95 },
          { concept: 'Malicious Access Mitigation', strength: 0.98 }
        ],
        createdAt: baseTime + 7 * oneDay,
        updatedAt: baseTime + 7 * oneDay
      },
      {
        id: 'mem_09',
        content: 'User query: "Explain the main differences between React 18 concurrent features and React 19 server-side capabilities". Generated overview comparing suspense, hooks, and RSC.',
        importance: 0.5,
        recency: baseTime + 8 * oneDay,
        tags: ['react', 'web-development', 'learning'],
        category: 'conversation',
        source: 'Sovereign Persona',
        metadata: { interactionType: 'q-and-a', privacyLevel: 'selective' },
        isFavorite: false,
        isBookmarked: true,
        isPinned: false,
        associations: [
          { concept: 'React Ecosystem', strength: 0.9 },
          { concept: 'Server Actions', strength: 0.7 }
        ],
        createdAt: baseTime + 8 * oneDay,
        updatedAt: baseTime + 8 * oneDay
      },
      {
        id: 'mem_10',
        content: 'Assimilated new concepts regarding Carbon Budget algorithms. Created logical connections to energy grid alerts and dynamic priority queue scheduling parameters.',
        importance: 0.68,
        recency: baseTime + 9 * oneDay,
        tags: ['carbon-aware', 'cognitive-mapping', 'green-compute'],
        category: 'knowledge',
        source: 'Cognitive Graph',
        metadata: { confidence: 0.92, connectionsFormed: 4, privacyLevel: 'selective' },
        isFavorite: false,
        isBookmarked: false,
        isPinned: false,
        associations: [
          { concept: 'Carbon Footprint Target', strength: 0.88 },
          { concept: 'Dynamic Workloads', strength: 0.82 }
        ],
        createdAt: baseTime + 9 * oneDay,
        updatedAt: baseTime + 9 * oneDay
      },
      {
        id: 'mem_11',
        content: 'Zero-Knowledge audit log: Verified credit rating credentials for LoanBrokerAgent-2. Zero leakage of raw net assets or background employment records confirmed.',
        importance: 0.85,
        recency: baseTime + 10 * oneDay,
        tags: ['security', 'cryptography', 'privacy', 'credit-check'],
        category: 'interaction',
        source: 'Privacy Negotiator',
        agentId: 'LoanBrokerAgent-2',
        metadata: { confidence: 0.99, privacyLevel: 'private' },
        isFavorite: false,
        isBookmarked: false,
        isPinned: false,
        associations: [
          { concept: 'Zero Knowledge Proofs', strength: 0.95 },
          { concept: 'Data Privacy', strength: 0.9 }
        ],
        createdAt: baseTime + 10 * oneDay,
        updatedAt: baseTime + 10 * oneDay
      },
      {
        id: 'mem_12',
        content: 'Assimilated advanced patterns for Vercel Composition Design. Built compound component architectures in React to solve boolean prop sprawl across dashboards.',
        importance: 0.72,
        recency: baseTime + 11 * oneDay,
        tags: ['react', 'composition', 'clean-code'],
        category: 'knowledge',
        source: 'Cognitive Graph',
        metadata: { confidence: 0.94, privacyLevel: 'selective' },
        isFavorite: false,
        isBookmarked: false,
        isPinned: false,
        associations: [
          { concept: 'Compound Components', strength: 0.92 },
          { concept: 'Clean Architecture', strength: 0.85 }
        ],
        createdAt: baseTime + 11 * oneDay,
        updatedAt: baseTime + 11 * oneDay
      },
      {
        id: 'mem_13',
        content: 'Agent Marketplace update check: Plugin "DataVisualizer" updated to v1.4.2. Automatically reviewed code diffs and verified integrity of public key encryption.',
        importance: 0.58,
        recency: baseTime + 12 * oneDay,
        tags: ['plugins', 'marketplace', 'security-audit'],
        category: 'system',
        source: 'AI Marketplace',
        metadata: { pluginName: 'DataVisualizer', safetyCheck: 'passed', privacyLevel: 'public' },
        isFavorite: false,
        isBookmarked: false,
        isPinned: false,
        associations: [{ concept: 'Plugin Sandboxing', strength: 0.8 }],
        createdAt: baseTime + 12 * oneDay,
        updatedAt: baseTime + 12 * oneDay
      },
      {
        id: 'mem_14',
        content: 'Initiated multi-agent game-theory debate simulation on resource routing constraints. Negotiators agreed on cooperative load distribution protocol with 92% efficiency.',
        importance: 0.78,
        recency: baseTime + 13 * oneDay,
        tags: ['collaboration', 'load-balancing', 'negotiation'],
        category: 'interaction',
        source: 'Collaboration Studio',
        metadata: { durationMs: 14200, activeAgents: ['OptimusRoute', 'GridWatcher'], privacyLevel: 'selective' },
        isFavorite: true,
        isBookmarked: false,
        isPinned: false,
        associations: [
          { concept: 'Cooperative Game Theory', strength: 0.9 },
          { concept: 'Load Balancing', strength: 0.84 }
        ],
        createdAt: baseTime + 13 * oneDay,
        updatedAt: baseTime + 13 * oneDay
      },
      {
        id: 'mem_15',
        content: 'System immune sweep: Cleared outdated session tokens and isolated two unauthenticated socket connections originating from unknown localized subnets.',
        importance: 0.88,
        recency: baseTime + 14 * oneDay,
        tags: ['security', 'network-isolation', 'immune-system'],
        category: 'system',
        source: 'System',
        metadata: { actionsTaken: ['socket-kill', 'audit-log'], threatCategory: 'infiltration-attempt', privacyLevel: 'private' },
        isFavorite: false,
        isBookmarked: false,
        isPinned: false,
        associations: [{ concept: 'Immune System Guard', strength: 0.94 }],
        createdAt: baseTime + 14 * oneDay,
        updatedAt: baseTime + 14 * oneDay
      },
      {
        id: 'mem_16',
        content: 'User query: "How do I optimize performance when using framer-motion in heavy list layouts?". Formulated recommendations including layoutId, layoutProjection, and willChange css.',
        importance: 0.62,
        recency: baseTime + 15 * oneDay,
        tags: ['react', 'animation', 'framer-motion', 'performance'],
        category: 'conversation',
        source: 'Sovereign Persona',
        metadata: { userPromptLength: 82, responseLatencyMs: 380, privacyLevel: 'selective' },
        isFavorite: false,
        isBookmarked: true,
        isPinned: false,
        associations: [
          { concept: 'React Animation', strength: 0.92 },
          { concept: 'Framer Motion Framework', strength: 0.89 }
        ],
        createdAt: baseTime + 15 * oneDay,
        updatedAt: baseTime + 15 * oneDay
      },
      {
        id: 'mem_17',
        content: 'Orchestration pipeline failure alert: Step "ZKPValidation" timed out after 3000ms. Rerouted sub-tasks dynamically to back-up validation agent to preserve pipeline continuity.',
        importance: 0.82,
        recency: baseTime + 16 * oneDay,
        tags: ['orchestration', 'failover', 'retry-policy'],
        category: 'system',
        source: 'Workflow Orchestrator',
        metadata: { pipelineId: 'pipe-sec-45', failedStep: 'ZKPValidation', durationMs: 3400, privacyLevel: 'selective' },
        isFavorite: false,
        isBookmarked: false,
        isPinned: false,
        associations: [
          { concept: 'Agent Pipeline', strength: 0.8 },
          { concept: 'Orchestrator Failover', strength: 0.92 }
        ],
        createdAt: baseTime + 16 * oneDay,
        updatedAt: baseTime + 16 * oneDay
      },
      {
        id: 'mem_18',
        content: 'Carbon budget violation warning: Cumulative GPU carbon usage exceeded daily threshold by 12%. Scheduled automated cleanup of suspended development sandbox instances.',
        importance: 0.8,
        recency: baseTime + 17 * oneDay,
        tags: ['carbon-aware', 'budgets', 'alerts'],
        category: 'system',
        source: 'Carbon Aware Optimizer',
        metadata: { dailyExcessPercent: 12.4, cleanupCount: 4, privacyLevel: 'public' },
        isFavorite: false,
        isBookmarked: false,
        isPinned: false,
        associations: [
          { concept: 'Carbon Footprint Target', strength: 0.92 },
          { concept: 'Green-Compute Scheduling', strength: 0.86 }
        ],
        createdAt: baseTime + 17 * oneDay,
        updatedAt: baseTime + 17 * oneDay
      },
      {
        id: 'mem_19',
        content: 'Preseeded Benchmark Lab evaluation results. Compared Gemini 2.5 Pro vs Gemini 2.5 Flash on coding syntax correctness, estimating a 42% latency reduction with Flash.',
        importance: 0.65,
        recency: baseTime + 18 * oneDay,
        tags: ['benchmark', 'metrics', 'llm-eval'],
        category: 'knowledge',
        source: 'System',
        metadata: { accuracyPro: 0.92, accuracyFlash: 0.88, privacyLevel: 'public' },
        isFavorite: false,
        isBookmarked: false,
        isPinned: false,
        associations: [
          { concept: 'Benchmark Metrics', strength: 0.9 },
          { concept: 'Model Evaluation', strength: 0.95 }
        ],
        createdAt: baseTime + 18 * oneDay,
        updatedAt: baseTime + 18 * oneDay
      },
      {
        id: 'mem_20',
        content: 'Assimilated new knowledge concepts around Federated Client data security. Formed connection between local weights obfuscation and secure multi-party computation protocol limits.',
        importance: 0.74,
        recency: baseTime + 19 * oneDay,
        tags: ['federated-learning', 'security', 'mpc'],
        category: 'knowledge',
        source: 'Cognitive Graph',
        metadata: { confidence: 0.96, connectionsFormed: 3, privacyLevel: 'selective' },
        isFavorite: false,
        isBookmarked: false,
        isPinned: false,
        associations: [
          { concept: 'Federated Weights', strength: 0.95 },
          { concept: 'Secure MPC', strength: 0.88 }
        ],
        createdAt: baseTime + 19 * oneDay,
        updatedAt: baseTime + 19 * oneDay
      },
      {
        id: 'mem_21',
        content: 'User query: "Draft an ethical guidelines summary for AI persona deployment in medical diagnostics." Formulated a list of constraints including consent, explainability, and validation.',
        importance: 0.84,
        recency: baseTime + 20 * oneDay,
        tags: ['ethics', 'governance', 'sovereign-persona'],
        category: 'conversation',
        source: 'Sovereign Persona',
        metadata: { interactionType: 'creative-drafting', privacyLevel: 'selective' },
        isFavorite: true,
        isBookmarked: true,
        isPinned: true,
        associations: [
          { concept: 'Ethical Guidelines', strength: 0.96 },
          { concept: 'Sovereign Twins', strength: 0.85 }
        ],
        createdAt: baseTime + 20 * oneDay,
        updatedAt: baseTime + 20 * oneDay
      },
      {
        id: 'mem_22',
        content: 'Identified a temporary slowdown in semantic retrieval tasks. Diagnostic analysis indicates indexing cache fragmentation. Automated rebuilding indexes and cleared cache buffers.',
        importance: 0.52,
        recency: baseTime + 21 * oneDay + 2 * oneHour,
        tags: ['cache', 'performance', 'database'],
        category: 'system',
        source: 'System',
        metadata: { cacheCleanedBytes: 12000, rebuildDurationMs: 45, privacyLevel: 'private' },
        isFavorite: false,
        isBookmarked: false,
        isPinned: false,
        associations: [{ concept: 'Cache Fragmentation', strength: 0.8 }],
        createdAt: baseTime + 21 * oneDay + 2 * oneHour,
        updatedAt: baseTime + 21 * oneDay + 2 * oneHour
      }
    ];

    seeds.forEach(m => this.memories.set(m.id, m));
  }

  private seedCollections(): void {
    const seeds: MemoryCollection[] = [
      {
        id: 'col_security_privacy',
        name: 'Security & Privacy Audits',
        description: 'Contains security warnings, privacy negotiation records, and threat mitigations.',
        memoryIds: ['mem_03', 'mem_08', 'mem_11', 'mem_15', 'mem_20'],
        isSmart: false,
        createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 15 * 24 * 60 * 60 * 1000
      },
      {
        id: 'col_carbon_aware',
        name: 'Sustainability & Green Compute',
        description: 'Automated tracking of eco-friendly scheduler allocations and carbon-aware threshold checks.',
        memoryIds: ['mem_04', 'mem_10', 'mem_18'],
        isSmart: false,
        createdAt: Date.now() - 12 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 12 * 24 * 60 * 60 * 1000
      },
      {
        id: 'col_react_development',
        name: 'React 18 & Web Engineering',
        description: 'Smart folder auto-aggregating developer queries and learnings related to the React framework.',
        memoryIds: [],
        isSmart: true,
        filterCriteria: {
          tags: ['react', 'web-development', 'composition', 'animation'],
          categories: ['conversation', 'knowledge']
        },
        createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 10 * 24 * 60 * 60 * 1000
      }
    ];

    seeds.forEach(c => this.collections.set(c.id, c));
  }
}

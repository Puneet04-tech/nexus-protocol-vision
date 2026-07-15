import { MarketplaceAgent } from '../types';

export class AgentRepository {
  private agents: Map<string, MarketplaceAgent> = new Map();

  constructor() {
    this.initializeRepository();
  }

  private generateChecksum(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return 'sha256_' + Math.abs(hash).toString(16);
  }

  private generateSignature(publisher: string, content: string): string {
    const checksum = this.generateChecksum(content);
    const cleanPub = publisher.replace(/\s+/g, '').toLowerCase();
    return `sig_${cleanPub}_${checksum.slice(7)}`;
  }

  private initializeRepository(): void {
    const rawAgents: Omit<MarketplaceAgent, 'checksum' | 'digitalSignature'>[] = [
      {
        id: 'marketplace.rag.searcher',
        name: 'RAG Semantic Searcher',
        description: 'Enables high-performance vector retrieval, similarity matching, and storage interaction. Links to decentralized indexing networks securely.',
        publisher: {
          name: 'Core Nexus Lab',
          verified: true,
          reputationScore: 98,
          supportEmail: 'support@corenexus.org',
          website: 'https://corenexus.org/rag'
        },
        categories: ['Knowledge Retrieval', 'Database', 'Search'],
        tags: ['vector', 'rag', 'semantic', 'embedding'],
        capabilities: ['vector-search', 'document-ingestion', 'semantic-query'],
        supportedTasks: [
          {
            name: 'semantic_search',
            description: 'Queries internal vector store and returns similar document nodes.',
            inputs: [
              { name: 'query', type: 'string', description: 'Semantic search string', required: true },
              { name: 'limit', type: 'number', description: 'Maximum search results', required: false }
            ],
            outputs: [
              { name: 'results', type: 'array', description: 'Array of documents with relevance scores' }
            ]
          },
          {
            name: 'ingest_document',
            description: 'Extracts and indexes text chunks into the sandboxed database.',
            inputs: [
              { name: 'docId', type: 'string', description: 'Unique document identifier', required: true },
              { name: 'content', type: 'string', description: 'Full text content', required: true }
            ],
            outputs: [
              { name: 'status', type: 'string', description: 'Status message' }
            ]
          }
        ],
        version: '1.2.0',
        compatibility: '>=1.0.0',
        permissions: ['storage.read', 'storage.write', 'network.access'],
        executionMode: 'isolated',
        dependencies: {},
        rating: 4.8,
        downloadCount: 15400,
        releaseDate: '2026-03-10',
        versionsHistory: [
          {
            version: '1.0.0',
            releaseNotes: 'Initial release with basic similarity scanning.',
            checksum: '',
            digitalSignature: '',
            entry: `// RAG Searcher v1.0.0
context.onEnable = function() {
  context.logger.info("RAG Searcher v1.0.0 activated.");
  context.events.subscribe("user.query", function(event) {
    context.logger.info("Processing query: " + event.payload);
  });
};
context.onDisable = function() {
  context.logger.info("RAG Searcher deactivated.");
};`
          },
          {
            version: '1.1.0',
            releaseNotes: 'Added document partitioning and incremental indexing.',
            checksum: '',
            digitalSignature: '',
            entry: `// RAG Searcher v1.1.0
context.onEnable = function() {
  context.logger.info("RAG Searcher v1.1.0 activated with partitioned indexing.");
};
context.onDisable = function() {
  context.logger.info("RAG Searcher v1.1.0 deactivated.");
};`
          },
          {
            version: '1.2.0',
            releaseNotes: 'Critical security containment adjustments, improved cosine performance, and storage API binding.',
            checksum: '',
            digitalSignature: '',
            entry: `// RAG Searcher v1.2.0
context.onEnable = function() {
  context.logger.info("RAG Searcher v1.2.0 started. Vector store initialized.");
  
  // Register custom events
  context.events.subscribe("user.message", function(event) {
    context.logger.info("RAG analyzing user input: " + event.payload);
    // Simulating writing metadata to storage
    context.storage.save("last_query", event.payload).then(function() {
      context.logger.info("Saved search query metadata to sandbox namespace.");
    });
  });
};
context.onDisable = function() {
  context.logger.info("RAG Searcher v1.2.0 stopped.");
};`
          }
        ],
        reviews: [
          { id: 'rev1', author: 'SovereignDev', rating: 5, comment: 'Phenomenal retrieval accuracy. Sandboxing is solid.', timestamp: Date.now() - 5000000 },
          { id: 'rev2', author: 'EthicalOrchestrator', rating: 4, comment: 'Slightly higher risk footprint, but the capability is worth the permissions.', timestamp: Date.now() - 2000000 }
        ]
      },
      {
        id: 'marketplace.sentiment.oracle',
        name: 'Sentiment Analysis Oracle',
        description: 'Applies lightweight natural language processing to evaluate emotional polarity and tone analysis inside message topics.',
        publisher: {
          name: 'Omni NLP Labs',
          verified: true,
          reputationScore: 92,
          supportEmail: 'support@omninlp.dev',
          website: 'https://omninlp.dev/oracle'
        },
        categories: ['NLP', 'Cognitive Analytics', 'Explainability'],
        tags: ['nlp', 'sentiment', 'classification', 'emotional'],
        capabilities: ['sentiment-classification', 'text-analysis'],
        supportedTasks: [
          {
            name: 'analyze_sentiment',
            description: 'Calculates floating sentiment polarities between -1.0 (very negative) and 1.0 (very positive).',
            inputs: [
              { name: 'text', type: 'string', description: 'Sentence string', required: true }
            ],
            outputs: [
              { name: 'score', type: 'number', description: 'Sentiment polarity (-1.0 to 1.0)' },
              { name: 'label', type: 'string', description: 'Classification label: positive, negative, neutral' }
            ]
          }
        ],
        version: '1.1.0',
        compatibility: '>=1.0.0',
        permissions: ['events.subscribe', 'events.publish'],
        executionMode: 'isolated',
        dependencies: {},
        rating: 4.6,
        downloadCount: 9200,
        releaseDate: '2026-04-12',
        versionsHistory: [
          {
            version: '1.0.0',
            releaseNotes: 'Standard dictionary polarity classifier.',
            checksum: '',
            digitalSignature: '',
            entry: `// Sentiment Oracle v1.0.0
context.onEnable = function() {
  context.logger.info("Sentiment Oracle v1.0.0 online.");
};
context.onDisable = function() {
  context.logger.info("Sentiment Oracle v1.0.0 offline.");
};`
          },
          {
            version: '1.1.0',
            releaseNotes: 'Integrates automated feedback response loops for cross-agent chatter.',
            checksum: '',
            digitalSignature: '',
            entry: `// Sentiment Oracle v1.1.0
context.onEnable = function() {
  context.logger.info("Sentiment Analysis Oracle v1.1.0 listening.");
  
  context.events.subscribe("user.message", function(event) {
    var text = String(event.payload).toLowerCase();
    var rating = 0;
    var label = "neutral";
    
    if (text.indexOf("good") !== -1 || text.indexOf("awesome") !== -1 || text.indexOf("great") !== -1 || text.indexOf("love") !== -1) {
      rating = 0.8;
      label = "positive";
    } else if (text.indexOf("bad") !== -1 || text.indexOf("error") !== -1 || text.indexOf("failed") !== -1 || text.indexOf("hate") !== -1) {
      rating = -0.8;
      label = "negative";
    }
    
    context.logger.info("Classified sentiment: " + label + " (" + rating + ")");
    context.events.publish("agent.sentiment", {
      text: event.payload,
      score: rating,
      label: label
    });
  });
};
context.onDisable = function() {
  context.logger.info("Sentiment Oracle v1.1.0 stopped.");
};`
          }
        ],
        reviews: [
          { id: 'rev3', author: 'AILegislator', rating: 4, comment: 'Performs quickly, low footprint and no network access requested. Safe.', timestamp: Date.now() - 10000000 }
        ]
      },
      {
        id: 'marketplace.carbon.optimizer',
        name: 'Carbon-Aware Optimizer',
        description: 'Audits compute schedules, analyzing power grids in real-time. Directs executions to green grids.',
        publisher: {
          name: 'Green Computing Coalition',
          verified: true,
          reputationScore: 96,
          supportEmail: 'tech@greencomputing.eu',
          website: 'https://greencomputing.eu/optimizer'
        },
        categories: ['Green Computing', 'Utilities', 'Carbon Aware'],
        tags: ['carbon', 'green', 'energy', 'scheduler'],
        capabilities: ['green-computing', 'energy-optimization'],
        supportedTasks: [
          {
            name: 'optimize_routing',
            description: 'Queries telemetry for optimal compute scheduling nodes.',
            inputs: [
              { name: 'computeLoadKwh', type: 'number', description: 'Compute work weight in KWh', required: true }
            ],
            outputs: [
              { name: 'carbonFootprintKg', type: 'number', description: 'Estimated carbon emissions' },
              { name: 'recommendedRegion', type: 'string', description: 'Carbon optimal region recommendation' }
            ]
          }
        ],
        version: '1.0.0',
        compatibility: '>=1.0.0',
        permissions: ['graph.read', 'graph.write', 'network.access'],
        executionMode: 'orchestrated',
        dependencies: {},
        rating: 4.9,
        downloadCount: 7800,
        releaseDate: '2026-05-01',
        versionsHistory: [
          {
            version: '1.0.0',
            releaseNotes: 'Production ready carbon tracker querying regional grid APIs.',
            checksum: '',
            digitalSignature: '',
            entry: `// Carbon Optimizer v1.0.0
context.onEnable = function() {
  context.logger.info("Carbon-Aware Optimizer v1.0.0 online.");
  context.events.subscribe("compute.job", function(event) {
    context.logger.warn("Analyzing carbon density for payload: " + JSON.stringify(event.payload));
  });
};
context.onDisable = function() {
  context.logger.info("Carbon-Aware Optimizer offline.");
};`
          }
        ],
        reviews: [
          { id: 'rev4', author: 'ClimateGuard', rating: 5, comment: 'Exemplary. Standardized telemetry integration.', timestamp: Date.now() - 300000 }
        ]
      },
      {
        id: 'marketplace.crypto.guard',
        name: 'Cryptographic containment Shield',
        description: 'Wraps agent code in isolation boundaries. Conducts ring signature validation and key hygiene.',
        publisher: {
          name: 'ZeroKnowledge Group',
          verified: false,
          reputationScore: 88,
          supportEmail: 'contact@zkgroup.io',
          website: 'https://zkgroup.io/shield'
        },
        categories: ['Security', 'Utilities'],
        tags: ['cryptography', 'security', 'shield', 'sandbox'],
        capabilities: ['signature-verification', 'containment-shield'],
        supportedTasks: [
          {
            name: 'validate_key',
            description: 'Cryptographically audits signature structures.',
            inputs: [
              { name: 'pubkey', type: 'string', description: 'Public key string', required: true }
            ],
            outputs: [
              { name: 'isValid', type: 'boolean', description: 'Audit status' }
            ]
          }
        ],
        version: '1.0.1',
        compatibility: '>=1.0.0',
        permissions: ['storage.read'],
        executionMode: 'isolated',
        dependencies: {},
        rating: 4.4,
        downloadCount: 5200,
        releaseDate: '2026-05-18',
        versionsHistory: [
          {
            version: '1.0.0',
            releaseNotes: 'Basic signature check.',
            checksum: '',
            digitalSignature: '',
            entry: `// Crypto Guard v1.0.0
context.onEnable = function() {
  context.logger.info("Crypto Guard v1.0.0 enabled.");
};
context.onDisable = function() {
  context.logger.info("Crypto Guard deactivated.");
};`
          },
          {
            version: '1.0.1',
            releaseNotes: 'Fixed key boundaries and memory leaks.',
            checksum: '',
            digitalSignature: '',
            entry: `// Crypto Guard v1.0.1
context.onEnable = function() {
  context.logger.info("Crypto Guard v1.0.1 container bound.");
};
context.onDisable = function() {
  context.logger.info("Crypto Guard v1.0.1 shutdown.");
};`
          }
        ],
        reviews: [
          { id: 'rev5', author: 'SecCheck', rating: 4, comment: 'Publisher is unverified, but review of script looks clean.', timestamp: Date.now() - 4000000 }
        ]
      },
      {
        id: 'marketplace.model.broker',
        name: 'Federated Model Broker',
        description: 'Orchestrates collaborative local model gradient exchanges. Communicates metrics over decentralized transport.',
        publisher: {
          name: 'Federated Intelligence Org',
          verified: false,
          reputationScore: 45, // low score to trigger warnings
          supportEmail: 'contact@fedintel.org',
          website: 'https://fedintel.org'
        },
        categories: ['Federated Learning', 'Cognitive Analytics'],
        tags: ['federated', 'ml', 'broker', 'gradients'],
        capabilities: ['federated-learning', 'weights-aggregation'],
        supportedTasks: [
          {
            name: 'aggregate_gradients',
            description: 'Performs federated averaging on gradient buffers.',
            inputs: [
              { name: 'gradients', type: 'array', description: 'Gradients list', required: true }
            ],
            outputs: [
              { name: 'newWeights', type: 'array', description: 'Averaged weights' }
            ]
          }
        ],
        version: '1.3.0',
        compatibility: '>=1.0.0',
        permissions: ['events.publish', 'events.subscribe', 'network.access'],
        executionMode: 'peer-to-peer',
        dependencies: {},
        rating: 3.8,
        downloadCount: 1400,
        releaseDate: '2026-06-02',
        versionsHistory: [
          {
            version: '1.2.0',
            releaseNotes: 'Fixed batch alignment errors.',
            checksum: '',
            digitalSignature: '',
            entry: `// Model Broker v1.2.0
context.onEnable = function() {
  context.logger.info("Federated Broker v1.2.0 running.");
};
context.onDisable = function() {
  context.logger.info("Broker offline.");
};`
          },
          {
            version: '1.3.0',
            releaseNotes: 'Introduced differential privacy aggregation layers.',
            checksum: '',
            digitalSignature: '',
            entry: `// Model Broker v1.3.0
context.onEnable = function() {
  context.logger.warn("Warning: Broker v1.3.0 initialization started. Differential privacy enabled.");
};
context.onDisable = function() {
  context.logger.info("Broker v1.3.0 stopped.");
};`
          }
        ],
        reviews: [
          { id: 'rev6', author: 'ParanoiaSec', rating: 2, comment: 'Caution: publisher has zero verification records and requests network access.', timestamp: Date.now() - 500000 }
        ]
      }
    ];

    // Compute checksums and signatures for all seeded versions dynamically
    rawAgents.forEach(raw => {
      const versions = raw.versionsHistory.map(historyItem => {
        const checksum = this.generateChecksum(historyItem.entry);
        const digitalSignature = this.generateSignature(raw.publisher.name, historyItem.entry);
        return {
          ...historyItem,
          checksum,
          digitalSignature
        };
      });

      // Retrieve version info matching current default
      const defaultVersionObj = versions.find(v => v.version === raw.version)!;

      const fullAgent: MarketplaceAgent = {
        ...raw,
        versionsHistory: versions,
        checksum: defaultVersionObj.checksum,
        digitalSignature: defaultVersionObj.digitalSignature
      } as MarketplaceAgent;

      this.agents.set(fullAgent.id, fullAgent);
    });
  }

  /**
   * Returns list of all available agents.
   */
  public list(): MarketplaceAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Fetch an agent by ID.
   */
  public get(id: string): MarketplaceAgent | undefined {
    return this.agents.get(id);
  }

  /**
   * Simulates publishing a new review architecture-only (in-memory update)
   */
  public addReview(agentId: string, rating: number, comment: string, author: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    const newReview = {
      id: 'rev_' + Date.now(),
      author,
      rating,
      comment,
      timestamp: Date.now()
    };

    agent.reviews.push(newReview);
    // Recalculate average rating
    const totalRating = agent.reviews.reduce((sum, rev) => sum + rev.rating, 0);
    agent.rating = Math.round((totalRating / agent.reviews.length) * 10) / 10;
    
    return true;
  }
}
export const mockAgentRepository = new AgentRepository();

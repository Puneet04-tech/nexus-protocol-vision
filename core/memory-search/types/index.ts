export interface MemoryAssociation {
  concept: string;
  strength: number; // 0 to 1
}

export interface Memory {
  id: string;
  content: string;
  embedding?: number[];
  importance: number; // 0 to 1 significance score
  recency: number; // timestamp
  tags: string[];
  category: 'conversation' | 'knowledge' | 'interaction' | 'system';
  source: 'Sovereign Persona' | 'Cognitive Graph' | 'Workflow Orchestrator' | 'AI Marketplace' | 'Collaboration Studio' | 'System' | 'Privacy Negotiator' | 'Carbon Aware Optimizer';
  agentId?: string;
  metadata: {
    conversationId?: string;
    confidence?: number;
    context?: string;
    userEmotion?: string;
    learningImpact?: string;
    carbonFootprint?: number; // g CO2e
    privacyLevel?: 'private' | 'selective' | 'public';
    [key: string]: any;
  };
  isFavorite: boolean;
  isBookmarked: boolean;
  isPinned: boolean;
  associations: MemoryAssociation[];
  createdAt: number;
  updatedAt: number;
}

export interface MemoryCollection {
  id: string;
  name: string;
  description: string;
  memoryIds: string[];
  isSmart: boolean; // if true, memoryIds is computed dynamically based on filterCriteria
  filterCriteria?: SearchQuery;
  createdAt: number;
  updatedAt: number;
}

export type SearchType = 'semantic' | 'keyword' | 'hybrid';
export type SortField = 'relevance' | 'recency' | 'importance' | 'alphabetical';
export type SortOrder = 'asc' | 'desc';

export interface SearchQuery {
  text?: string;
  searchType?: SearchType;
  dateRange?: { start?: number; end?: number };
  tags?: string[];
  categories?: ('conversation' | 'knowledge' | 'interaction' | 'system')[];
  sources?: ('Sovereign Persona' | 'Cognitive Graph' | 'Workflow Orchestrator' | 'AI Marketplace' | 'Collaboration Studio' | 'System' | 'Privacy Negotiator' | 'Carbon Aware Optimizer')[];
  agentIds?: string[];
  minImportance?: number;
  isFavorite?: boolean;
  isBookmarked?: boolean;
  isPinned?: boolean;
  collectionId?: string;
  limit?: number;
  offset?: number;
  sortBy?: SortField;
  sortOrder?: SortOrder;
}

export interface SearchResult {
  memory: Memory;
  score: number; // overall combined ranking score (0 to 1)
  relevanceScore: number; // query similarity similarity score (0 to 1)
  importanceScore: number; // weight-adjusted importance score (0 to 1)
  recencyScore: number; // weight-adjusted recency score (0 to 1)
  matchReasons: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  queryExpanded?: string;
  suggestions?: string[];
  timeTakenMs: number;
}

export interface TimelineInterval {
  id: string;
  title: string;
  description: string;
  timestamp: number;
  memories: Memory[];
  learningGained: string[];
  agentsInvolved: string[];
}

export interface Recommendation {
  id: string;
  type: 'related_memory' | 'learning_path' | 'agent_interaction' | 'trend';
  title: string;
  description: string;
  score: number;
  targetId?: string;
  metadata?: Record<string, any>;
}

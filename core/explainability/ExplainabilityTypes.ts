/**
 * Explainability System Type Definitions
 */

export interface ReasoningStep {
  stepId: string;
  description: string;
  sourceModule: string;
  confidence: number;
  parentStep?: string;
  children?: ReasoningStep[];
}

export interface KnowledgeNode {
  nodeId: string;
  label: string;
  weight: number;
  relationship: string;
}

export interface EthicalCheck {
  policy: string;
  status: 'passed' | 'failed' | 'conditional';
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
}

export interface PrivacyCheck {
  rule: string;
  status: 'passed' | 'failed' | 'conditional';
  impact: 'low' | 'medium' | 'high' | 'critical';
}

export interface DecisionTrace {
  id: string;
  timestamp: number;
  decisionType: string;
  initiator: string;
  personaId: string;
  context: Record<string, any>;
  inputSummary: string;
  reasoningSteps: ReasoningStep[];
  knowledgeNodes: KnowledgeNode[];
  confidenceScore: number; // 0 to 100
  privacyChecks: PrivacyCheck[];
  ethicalChecks: EthicalCheck[];
  carbonImpact: number; // in kg CO2
  executionTime: number; // in milliseconds
  decisionResult: any;
  warnings: string[];
  metadata: Record<string, any>;
}

export interface TraceFilters {
  search?: string;
  decisionType?: string;
  personaId?: string;
  minConfidence?: number;
  maxConfidence?: number;
  hasEthicalViolations?: boolean;
  hasPrivacyViolations?: boolean;
  startDate?: number;
  endDate?: number;
  sortBy?: 'timestamp' | 'confidenceScore' | 'executionTime' | 'carbonImpact';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedTraces {
  items: DecisionTrace[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

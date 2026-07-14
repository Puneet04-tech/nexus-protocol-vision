export interface PlaygroundParams {
  privacyLevel: 'public' | 'selective' | 'private' | 'confidential';
  knowledgeSize: number; // number of initial concepts
  threatIntensity: 'low' | 'medium' | 'high' | 'critical';
  learningRate: number; // 0.0 to 1.0
  carbonBudget: number; // daily limit in kg CO2
  federatedParticipants: number;
  confidenceThreshold: number; // 0.0 to 1.0
  ethicalBoundaries: Array<{
    domain: string;
    constraints: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  latencyLimit: number; // ms
  resourceLimit: number; // memory in MB
}

export interface SimulationState {
  status: 'playing' | 'paused' | 'stopped';
  currentStepIndex: number;
  speed: number; // multiplier: 1, 2, 5
  currentScenarioId: string | null;
  mode: 'auto' | 'manual';
}

export interface WorkflowStep {
  id: string;
  label: string;
  component: 'sovereign-persona' | 'cognitive-graph' | 'privacy-negotiator' | 'federated-learning' | 'morphnet' | 'adversarial-immune' | 'carbon-optimizer' | 'latent-mapping' | 'monitoring';
  operation: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration: number; // ms
  inputs?: any;
  outputs?: any;
  message: string;
}

export interface SimulationLog {
  timestamp: number;
  module: string;
  operation: string;
  status: 'info' | 'success' | 'warning' | 'error';
  duration: number;
  message: string;
  details?: string;
}

export interface RealTimeMetrics {
  executionTime: number;
  memory: number; // MB
  cpu: number; // % load
  confidence: number; // average mastery
  privacyScore: number; // index (0-100)
  carbonImpact: number; // current CO2 emission kg
  knowledgeGrowth: number; // new nodes added
  activeModules: string[];
  eventsCount: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  complexity: 'beginner' | 'intermediate' | 'advanced';
  duration: string; // e.g. "2 min"
  steps: WorkflowStep[];
  defaultParams: Partial<PlaygroundParams>;
}

export enum WorkflowState {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ROLLBACK_IN_PROGRESS = 'ROLLBACK_IN_PROGRESS',
  ROLLED_BACK = 'ROLLED_BACK',
  CANCELLED = 'CANCELLED',
  TIMEOUT = 'TIMEOUT',
}

export enum TaskState {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  ROLLED_BACK = 'ROLLED_BACK',
}

export enum TaskType {
  PERSONA_VALIDATION = 'PERSONA_VALIDATION',
  PRIVACY_NEGOTIATION = 'PRIVACY_NEGOTIATION',
  FEDERATED_ROUND = 'FEDERATED_ROUND',
  CARBON_OPTIMIZATION = 'CARBON_OPTIMIZATION',
  MORPHNET_COMPRESSION = 'MORPHNET_COMPRESSION',
  SECURITY_SHIELD = 'SECURITY_SHIELD',
  CONFLICT_RESOLUTION = 'CONFLICT_RESOLUTION',
  EXPLAINABILITY = 'EXPLAINABILITY',
  CUSTOM = 'CUSTOM',
}

export enum BackoffPolicy {
  CONSTANT = 'CONSTANT',
  LINEAR = 'LINEAR',
  EXPONENTIAL = 'EXPONENTIAL',
}

export interface RetryConfig {
  policy: BackoffPolicy;
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
}

export interface TaskDefinition {
  id: string;
  name: string;
  type: TaskType;
  dependencies: string[];
  retryConfig?: RetryConfig;
  inputParameters: Record<string, unknown>;
  execute: (context: ExecutionContext) => Promise<Record<string, unknown>>;
  rollback?: (context: ExecutionContext) => Promise<void>;
  timeoutMs?: number;
}

export interface Task {
  id: string;
  name: string;
  type: TaskType;
  dependencies: string[];
  retryConfig?: RetryConfig;
  inputParameters: Record<string, unknown>;
  outputResults?: Record<string, unknown>;
  state: TaskState;
  error?: string;
  retriesAttempted: number;
  startedAt?: number;
  completedAt?: number;
  execute: (context: ExecutionContext) => Promise<Record<string, unknown>>;
  rollback?: (context: ExecutionContext) => Promise<void>;
  timeoutMs?: number;
}

export interface Workflow {
  id: string;
  name: string;
  goal: string;
  tasks: Map<string, Task>;
  state: WorkflowState;
  context: Record<string, unknown>;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  history: WorkflowHistoryEntry[];
}

export interface ExecutionContext {
  workflowId: string;
  taskId: string;
  taskName: string;
  workflowContext: Record<string, unknown>;
  taskInputs: Record<string, unknown>;
  getTaskResults: (taskId: string) => Record<string, unknown> | undefined;
  publishEvent: (eventType: string, payload: Record<string, unknown>) => void;
  systemInstances: {
    personaInstance?: any;
    cognitiveGraphInstance?: any;
    privacyNegotiatorInstance?: any;
    federatedClientInstance?: any;
    morphNetInstance?: any;
    monitoringInstance?: any;
    carbonOptimizerInstance?: any;
    immuneSystemInstance?: any;
  };
}

export interface WorkflowEvent {
  eventId: string;
  workflowId: string;
  taskId?: string;
  type: string; // e.g., 'workflow.started', 'task.failed', etc.
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface WorkflowHistoryEntry {
  timestamp: number;
  fromState: WorkflowState | TaskState;
  toState: WorkflowState | TaskState;
  message: string;
  targetId: string; // workflowId or taskId
  targetType: 'workflow' | 'task';
}

export interface WorkflowMetric {
  workflowId: string;
  latencyMs: number;
  carbonSavingsKg: number;
  energyUsedKwh: number;
  privacyScore: number;
  threatsBlocked: number;
  successRate: number;
  taskFailureCount: number;
  timestamp: number;
}

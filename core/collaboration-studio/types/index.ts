import { PluginPermission } from '../../plugin-sdk/PluginTypes';

export enum NodeState {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  ROLLED_BACK = 'ROLLED_BACK',
  PAUSED = 'PAUSED', // Waiting for approval
}

export enum WorkflowState {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED', // Approval required
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ROLLBACK_IN_PROGRESS = 'ROLLBACK_IN_PROGRESS',
  ROLLED_BACK = 'ROLLED_BACK',
  CANCELLED = 'CANCELLED',
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

export interface NodeConfig {
  agentId?: string; // If it's a marketplace agent node
  taskName?: string; // The task inside that agent to run
  inputMappings: Record<string, string>; // inputs mapping, value can be literal or path '$.nodeId.field'
  timeoutMs?: number;
  retryConfig?: RetryConfig;
  approvalRequired?: boolean;
  conditionalExpression?: string; // For conditional branching nodes (JS expression)
  loopCount?: number; // For loop utility nodes
  loopCondition?: string; // For loop dynamic conditions
  customScript?: string; // For custom custom execution scripts
}

export interface AgentNode {
  id: string;
  name: string;
  type: 'agent' | 'start' | 'end' | 'conditional' | 'loop' | 'approval' | 'custom';
  position: { x: number; y: number };
  config: NodeConfig;
  state: NodeState;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  retriesAttempted: number;
  outputResults?: Record<string, any>;
}

export interface AgentEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string; // e.g. "output" or "true"/"false" for conditional nodes
  targetHandle?: string; // e.g. "input"
}

export interface CollaborationWorkflow {
  id: string;
  name: string;
  description: string;
  nodes: AgentNode[];
  edges: AgentEdge[];
  globalContext: Record<string, any>;
  version: number;
  isDraft: boolean;
  isTemplate: boolean;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  creator?: string;
}

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  nodeId?: string;
}

export interface CollaborationExecution {
  id: string;
  workflowId: string;
  state: WorkflowState;
  currentNodeId?: string;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  logs: LogEntry[];
  checkpointContext?: Record<string, any>; // Persistent workflow state checkpoint
}

export enum MessageType {
  TASK_DELEGATION = 'TASK_DELEGATION',
  CONTEXT_EXCHANGE = 'CONTEXT_EXCHANGE',
  BROADCAST = 'BROADCAST',
  REQUEST_RESPONSE = 'REQUEST_RESPONSE',
  CONFLICT_RESOLUTION = 'CONFLICT_RESOLUTION',
}

export interface AgentMessage {
  id: string;
  timestamp: number;
  senderId: string; // Node ID of sender
  receiverId?: string; // Node ID of receiver (empty for broadcasts)
  type: MessageType;
  payload: Record<string, any>;
  channel?: string; // Channels for broadcast
}

export enum MemoryScope {
  GLOBAL = 'GLOBAL',
  SCOPED = 'SCOPED', // Node hierarchies
  TEMPORARY = 'TEMPORARY', // Cleared post task execution
}

export interface MemorySlot {
  key: string;
  value: any;
  scope: MemoryScope;
  version: number;
  lastUpdatedByNodeId: string;
  allowedNodeIds?: string[]; // Access permissions
}

export interface ApprovalRequest {
  id: string;
  executionId: string;
  nodeId: string;
  requestedAt: number;
  resolvedAt?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'OVERRIDDEN';
  inputData: Record<string, any>;
  overrideData?: Record<string, any>;
  comments?: string;
}

export interface CollaborationMetrics {
  workflowId: string;
  executionId: string;
  timestamp: number;
  durationMs: number;
  carbonSavingsKg: number;
  energyUsedKwh: number;
  privacyScore: number;
  threatsBlocked: number;
  successRate: number;
}

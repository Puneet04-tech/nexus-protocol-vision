import {
  Task,
  TaskState,
  TaskType,
  RetryConfig,
  Workflow,
  WorkflowState,
  WorkflowHistoryEntry,
  ExecutionContext,
  TaskDefinition,
} from '../types';

export class TaskImpl implements Task {
  public id: string;
  public name: string;
  public type: TaskType;
  public dependencies: string[];
  public retryConfig?: RetryConfig;
  public inputParameters: Record<string, unknown>;
  public outputResults?: Record<string, unknown>;
  public state: TaskState = TaskState.PENDING;
  public error?: string;
  public retriesAttempted = 0;
  public startedAt?: number;
  public completedAt?: number;
  public execute: (context: ExecutionContext) => Promise<Record<string, unknown>>;
  public rollback?: (context: ExecutionContext) => Promise<void>;
  public timeoutMs?: number;

  constructor(def: TaskDefinition) {
    this.id = def.id;
    this.name = def.name;
    this.type = def.type;
    this.dependencies = def.dependencies || [];
    this.retryConfig = def.retryConfig;
    this.inputParameters = def.inputParameters || {};
    this.execute = def.execute;
    this.rollback = def.rollback;
    this.timeoutMs = def.timeoutMs;
  }
}

export class WorkflowImpl implements Workflow {
  public id: string;
  public name: string;
  public goal: string;
  public tasks: Map<string, Task> = new Map();
  public state: WorkflowState = WorkflowState.PENDING;
  public context: Record<string, unknown>;
  public startedAt?: number;
  public completedAt?: number;
  public error?: string;
  public history: WorkflowHistoryEntry[] = [];

  constructor(
    id: string,
    name: string,
    goal: string,
    taskDefs: TaskDefinition[],
    initialContext: Record<string, unknown> = {}
  ) {
    this.id = id;
    this.name = name;
    this.goal = goal;
    this.context = { ...initialContext };

    for (const def of taskDefs) {
      if (this.tasks.has(def.id)) {
        throw new Error(`Duplicate task ID in workflow: ${def.id}`);
      }
      this.tasks.set(def.id, new TaskImpl(def));
    }
  }

  public addHistory(fromState: WorkflowState | TaskState, toState: WorkflowState | TaskState, message: string, targetId: string, targetType: 'workflow' | 'task'): void {
    const entry: WorkflowHistoryEntry = {
      timestamp: Date.now(),
      fromState,
      toState,
      message,
      targetId,
      targetType,
    };
    this.history.push(entry);
  }
}

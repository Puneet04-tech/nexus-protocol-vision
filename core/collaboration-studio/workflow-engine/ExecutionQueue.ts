import { CollaborationWorkflow, CollaborationExecution, WorkflowState } from '../types';

export class ExecutionQueue {
  private static instance: ExecutionQueue | null = null;
  private activeExecutions = new Map<string, {
    workflow: CollaborationWorkflow;
    execution: CollaborationExecution;
    promise: Promise<void>;
  }>();

  private constructor() {}

  public static getInstance(): ExecutionQueue {
    if (!this.instance) {
      this.instance = new ExecutionQueue();
    }
    return this.instance;
  }

  public register(
    execution: CollaborationExecution,
    workflow: CollaborationWorkflow,
    execPromise: Promise<void>
  ): void {
    this.activeExecutions.set(execution.id, {
      workflow,
      execution,
      promise: execPromise
    });
  }

  public getActive(executionId: string) {
    return this.activeExecutions.get(executionId);
  }

  public listActive(): CollaborationExecution[] {
    return Array.from(this.activeExecutions.values())
      .map(entry => entry.execution)
      .filter(e => e.state === WorkflowState.RUNNING || e.state === WorkflowState.PAUSED);
  }

  public remove(executionId: string): void {
    this.activeExecutions.delete(executionId);
  }

  public clear(): void {
    this.activeExecutions.clear();
  }
}

import { CollaborationWorkflow, CollaborationExecution, ApprovalRequest, CollaborationMetrics } from '../types';
import { LocalStorageAdapter } from '../persistence/LocalStorageAdapter';
import { TemplateRegistry } from '../templates/TemplateRegistry';

export class CollaborationRepository {
  private static instance: CollaborationRepository | null = null;

  private readonly workflowsKey = 'nexus_collaboration_workflows';
  private readonly executionsKey = 'nexus_collaboration_executions';
  private readonly approvalsKey = 'nexus_collaboration_approvals';
  private readonly metricsKey = 'nexus_collaboration_metrics';

  private constructor() {
    this.seedIfEmpty();
  }

  public static getInstance(): CollaborationRepository {
    if (!this.instance) {
      this.instance = new CollaborationRepository();
    }
    return this.instance;
  }

  private seedIfEmpty(): void {
    const list = LocalStorageAdapter.get<CollaborationWorkflow>(this.workflowsKey);
    if (list.length === 0) {
      const seeded = TemplateRegistry.getSeededTemplates();
      LocalStorageAdapter.set<CollaborationWorkflow>(this.workflowsKey, seeded);
    }
  }

  // Workflows CRUD
  public listWorkflows(): CollaborationWorkflow[] {
    return LocalStorageAdapter.get<CollaborationWorkflow>(this.workflowsKey);
  }

  public getWorkflow(id: string): CollaborationWorkflow | null {
    return LocalStorageAdapter.getOne<CollaborationWorkflow>(this.workflowsKey, w => w.id === id);
  }

  public createWorkflow(workflow: CollaborationWorkflow): void {
    LocalStorageAdapter.upsert<CollaborationWorkflow>(
      this.workflowsKey,
      workflow,
      w => w.id === workflow.id
    );
  }

  public updateWorkflow(workflow: CollaborationWorkflow): void {
    workflow.updatedAt = Date.now();
    LocalStorageAdapter.upsert<CollaborationWorkflow>(
      this.workflowsKey,
      workflow,
      w => w.id === workflow.id
    );
  }

  public deleteWorkflow(id: string): boolean {
    return LocalStorageAdapter.delete<CollaborationWorkflow>(this.workflowsKey, w => w.id === id);
  }

  // Executions CRUD
  public listExecutions(): CollaborationExecution[] {
    return LocalStorageAdapter.get<CollaborationExecution>(this.executionsKey);
  }

  public getExecution(id: string): CollaborationExecution | null {
    return LocalStorageAdapter.getOne<CollaborationExecution>(this.executionsKey, e => e.id === id);
  }

  public saveExecution(execution: CollaborationExecution): void {
    LocalStorageAdapter.upsert<CollaborationExecution>(
      this.executionsKey,
      execution,
      e => e.id === execution.id
    );
  }

  public deleteExecution(id: string): boolean {
    return LocalStorageAdapter.delete<CollaborationExecution>(this.executionsKey, e => e.id === id);
  }

  // Approvals CRUD
  public listApprovals(): ApprovalRequest[] {
    return LocalStorageAdapter.get<ApprovalRequest>(this.approvalsKey);
  }

  public getApproval(id: string): ApprovalRequest | null {
    return LocalStorageAdapter.getOne<ApprovalRequest>(this.approvalsKey, a => a.id === id);
  }

  public saveApproval(approval: ApprovalRequest): void {
    LocalStorageAdapter.upsert<ApprovalRequest>(
      this.approvalsKey,
      approval,
      a => a.id === approval.id
    );
  }

  // Metrics CRUD
  public listMetrics(): CollaborationMetrics[] {
    return LocalStorageAdapter.get<CollaborationMetrics>(this.metricsKey);
  }

  public saveMetrics(metrics: CollaborationMetrics): void {
    LocalStorageAdapter.upsert<CollaborationMetrics>(
      this.metricsKey,
      metrics,
      m => m.executionId === metrics.executionId
    );
  }

  public clearAll(): void {
    LocalStorageAdapter.clear(this.workflowsKey);
    LocalStorageAdapter.clear(this.executionsKey);
    LocalStorageAdapter.clear(this.approvalsKey);
    LocalStorageAdapter.clear(this.metricsKey);
    this.seedIfEmpty();
  }
}

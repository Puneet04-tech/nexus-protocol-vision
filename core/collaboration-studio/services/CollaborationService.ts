import {
  CollaborationWorkflow,
  CollaborationExecution,
  WorkflowState,
  NodeState,
  ApprovalRequest
} from '../types';
import { CollaborationRepository } from '../repository/CollaborationRepository';
import { WorkflowValidator, ValidationReport } from '../validators/WorkflowValidator';
import { CollaborationEngine } from '../execution/CollaborationEngine';
import { ExecutionQueue } from '../workflow-engine/ExecutionQueue';
import { ApprovalGate } from '../approvals/ApprovalGate';
import { SovereignPersona } from '../../sovereign-persona/SovereignPersona';

export class CollaborationService {
  private static instance: CollaborationService | null = null;
  private repository = CollaborationRepository.getInstance();
  private engine = new CollaborationEngine();
  private queue = ExecutionQueue.getInstance();

  private constructor() {}

  public static getInstance(): CollaborationService {
    if (!this.instance) {
      this.instance = new CollaborationService();
    }
    return this.instance;
  }

  // Workflows Management
  public getWorkflows(): CollaborationWorkflow[] {
    return this.repository.listWorkflows();
  }

  public getWorkflow(id: string): CollaborationWorkflow | null {
    return this.repository.getWorkflow(id);
  }

  public saveWorkflow(workflow: CollaborationWorkflow): ValidationReport {
    // Validate first
    const report = WorkflowValidator.validate(workflow);
    this.repository.createWorkflow(workflow);
    return report;
  }

  public deleteWorkflow(id: string): boolean {
    return this.repository.deleteWorkflow(id);
  }

  // Execution Flow
  public async executeWorkflow(
    workflowId: string,
    personaInstance: SovereignPersona | null,
    maxConcurrency = Infinity,
    onStateChange: (exec: CollaborationExecution) => void = () => {}
  ): Promise<CollaborationExecution> {
    const workflow = this.repository.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow with ID '${workflowId}' not found.`);
    }

    // Assert graph is valid before execution
    const report = WorkflowValidator.validate(workflow);
    if (!report.isValid) {
      throw new Error(`DAG validation failed: ${report.errors.join('; ')}`);
    }

    // Reset all nodes state to PENDING before executing
    workflow.nodes.forEach(node => {
      node.state = NodeState.PENDING;
      node.error = undefined;
      node.outputResults = undefined;
      node.retriesAttempted = 0;
      node.startedAt = undefined;
      node.completedAt = undefined;
    });
    this.repository.createWorkflow(workflow);

    // Prepare execution tracker
    const execution: CollaborationExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      workflowId,
      state: WorkflowState.PENDING,
      logs: []
    };

    this.repository.saveExecution(execution);

    // Spawn engine run asynchronously
    const runPromise = this.engine.execute(
      workflow,
      execution,
      personaInstance,
      maxConcurrency,
      exec => {
        this.repository.saveExecution(exec);
        onStateChange(exec);
      }
    ).finally(() => {
      this.queue.remove(execution.id);
    });

    this.queue.register(execution, workflow, runPromise);

    return execution;
  }

  public cancelExecution(executionId: string): boolean {
    const active = this.queue.getActive(executionId);
    if (active) {
      this.engine.cancel(executionId);
      active.execution.state = WorkflowState.CANCELLED;
      active.execution.logs.push({
        timestamp: Date.now(),
        level: 'warn',
        message: 'Workflow execution cancelled by user request.'
      });
      this.repository.saveExecution(active.execution);
      return true;
    }
    return false;
  }

  // Human Approvals
  public getPendingApprovals(executionId: string): ApprovalRequest[] {
    return ApprovalGate.getPendingForExecution(executionId);
  }

  public resolveApprovalGate(
    requestId: string,
    status: 'APPROVED' | 'REJECTED' | 'OVERRIDDEN',
    overrideData?: Record<string, any>,
    comments?: string
  ): boolean {
    return ApprovalGate.resolveApproval(requestId, status, overrideData, comments);
  }

  public clearAllData(): void {
    this.repository.clearAll();
    this.queue.clear();
  }
}
export const mockCollaborationService = CollaborationService.getInstance();

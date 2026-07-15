import { CollaborationWorkflow, CollaborationExecution, ApprovalRequest } from '../types';
import { ValidationReport } from '../validators/WorkflowValidator';
import { CollaborationService } from '../services/CollaborationService';
import { CollaborationMonitor } from '../monitoring/CollaborationMonitor';
import { SovereignPersona } from '../../sovereign-persona/SovereignPersona';

export class CollaborationAPI {
  private service = CollaborationService.getInstance();

  private simulateDelay(ms = 250): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async getWorkflows(): Promise<CollaborationWorkflow[]> {
    await this.simulateDelay(150);
    return this.service.getWorkflows();
  }

  public async getWorkflowById(id: string): Promise<CollaborationWorkflow | null> {
    await this.simulateDelay(100);
    return this.service.getWorkflow(id);
  }

  public async saveWorkflow(workflow: CollaborationWorkflow): Promise<ValidationReport> {
    await this.simulateDelay(200);
    return this.service.saveWorkflow(workflow);
  }

  public async deleteWorkflow(id: string): Promise<boolean> {
    await this.simulateDelay(180);
    return this.service.deleteWorkflow(id);
  }

  public async executeWorkflow(
    workflowId: string,
    personaInstance: SovereignPersona | null,
    maxConcurrency = Infinity,
    onStateChange: (exec: CollaborationExecution) => void = () => {}
  ): Promise<CollaborationExecution> {
    await this.simulateDelay(300);
    return this.service.executeWorkflow(workflowId, personaInstance, maxConcurrency, onStateChange);
  }

  public async cancelExecution(executionId: string): Promise<boolean> {
    await this.simulateDelay(100);
    return this.service.cancelExecution(executionId);
  }

  public async getPendingApprovals(executionId: string): Promise<ApprovalRequest[]> {
    await this.simulateDelay(120);
    return this.service.getPendingApprovals(executionId);
  }

  public async resolveApproval(
    requestId: string,
    status: 'APPROVED' | 'REJECTED' | 'OVERRIDDEN',
    overrideData?: Record<string, any>,
    comments?: string
  ): Promise<boolean> {
    await this.simulateDelay(250);
    return this.service.resolveApprovalGate(requestId, status, overrideData, comments);
  }

  public async getWorkflowMetrics(workflowId?: string) {
    await this.simulateDelay(150);
    return CollaborationMonitor.getAggregatedMetrics(workflowId);
  }

  public async clearAll(): Promise<void> {
    await this.simulateDelay(300);
    this.service.clearAllData();
  }
}
export const mockCollaborationAPI = new CollaborationAPI();

import { ApprovalRequest } from '../types';
import { CollaborationRepository } from '../repository/CollaborationRepository';

export class ApprovalGate {
  private static repository = CollaborationRepository.getInstance();
  private static listeners = new Map<string, (decision: ApprovalRequest) => void>();

  /**
   * Dispatches a request for human approval, locking the task thread.
   */
  public static requestApproval(
    executionId: string,
    nodeId: string,
    inputData: Record<string, any>
  ): Promise<ApprovalRequest> {
    const request: ApprovalRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      executionId,
      nodeId,
      requestedAt: Date.now(),
      status: 'PENDING',
      inputData
    };

    this.repository.saveApproval(request);

    return new Promise<ApprovalRequest>(resolve => {
      this.listeners.set(request.id, resolvedReq => {
        resolve(resolvedReq);
        this.listeners.delete(request.id);
      });
    });
  }

  /**
   * User feedback resolves approval constraint.
   */
  public static resolveApproval(
    requestId: string,
    status: 'APPROVED' | 'REJECTED' | 'OVERRIDDEN',
    overrideData?: Record<string, any>,
    comments?: string
  ): boolean {
    const req = this.repository.getApproval(requestId);
    if (!req || req.status !== 'PENDING') return false;

    req.status = status;
    req.resolvedAt = Date.now();
    req.overrideData = overrideData;
    req.comments = comments;

    this.repository.saveApproval(req);

    const callback = this.listeners.get(requestId);
    if (callback) {
      callback(req);
    }

    return true;
  }

  public static getPendingForExecution(executionId: string): ApprovalRequest[] {
    return this.repository.listApprovals().filter(a => a.executionId === executionId && a.status === 'PENDING');
  }

  public static listAllApprovals(): ApprovalRequest[] {
    return this.repository.listApprovals();
  }
}

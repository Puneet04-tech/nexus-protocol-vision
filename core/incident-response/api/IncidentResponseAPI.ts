import { IncidentService } from '../services/IncidentService';
import { Incident, Checkpoint, AlertRule, IncidentAlert, SreAnalytics, RecoveryJob, AuditLog } from '../types';

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

export class IncidentResponseAPI {
  private static service = IncidentService.getInstance();
  private static mockLatencyMs = 150; // Mock network roundtrip latency

  private static async delay(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.mockLatencyMs));
  }

  // ───────────────────────────────────────────────────────────────────────────
  // INCIDENT ENDPOINTS
  // ───────────────────────────────────────────────────────────────────────────

  public static async getIncidents(): Promise<ApiResponse<Incident[]>> {
    await this.delay();
    const list = this.service.getIncidents();
    return { status: 200, message: 'Successfully retrieved incidents list.', data: list };
  }

  public static async getIncidentById(id: string): Promise<ApiResponse<Incident | null>> {
    await this.delay();
    const list = this.service.getIncidents();
    const inc = list.find(i => i.id === id) || null;
    return { status: inc ? 200 : 404, message: inc ? 'Incident found.' : 'Incident not found.', data: inc };
  }

  public static async resolveIncident(id: string, operator = 'ADMIN'): Promise<ApiResponse<boolean>> {
    await this.delay();
    try {
      this.service.manualResolveIncident(id, operator);
      return { status: 200, message: 'Incident marked resolved.', data: true };
    } catch (e: any) {
      return { status: 400, message: e.message || 'Failed to resolve incident.', data: false };
    }
  }

  public static async triggerRecovery(incidentId: string, operator = 'ADMIN'): Promise<ApiResponse<string>> {
    await this.delay();
    try {
      const jobId = this.service.manualTriggerRecovery(incidentId, operator);
      return { status: 202, message: 'Recovery engine triggered job execution.', data: jobId };
    } catch (e: any) {
      return { status: 400, message: e.message || 'Failed to initiate recovery.', data: '' };
    }
  }

  public static async rollbackIncidentToCheckpoint(
    incidentId: string,
    checkpointId: string,
    operator = 'ADMIN'
  ): Promise<ApiResponse<boolean>> {
    await this.delay();
    try {
      this.service.manualRollbackToCheckpoint(incidentId, checkpointId, operator);
      return { status: 200, message: 'System rolled back to checkpoint snapshot.', data: true };
    } catch (e: any) {
      return { status: 400, message: e.message || 'Rollback execution failed.', data: false };
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RECOVERY ENDPOINTS
  // ───────────────────────────────────────────────────────────────────────────

  public static async getRecoveryJobs(): Promise<ApiResponse<RecoveryJob[]>> {
    await this.delay();
    const list = this.service.getRecoveryJobs();
    return { status: 200, message: 'Fetched active SRE recovery queues.', data: list };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CHECKPOINT ENDPOINTS
  // ───────────────────────────────────────────────────────────────────────────

  public static async getCheckpoints(): Promise<ApiResponse<Checkpoint[]>> {
    await this.delay();
    const list = this.service.getCheckpoints();
    return { status: 200, message: 'Checkpoints list retrieved.', data: list };
  }

  public static async createCheckpoint(
    componentId: string,
    workflowState: string,
    contextSnapshot: Record<string, any>
  ): Promise<ApiResponse<Checkpoint>> {
    await this.delay();
    try {
      const cp = this.service.createCheckpoint(componentId, workflowState, contextSnapshot);
      return { status: 201, message: 'Checkpoint state committed.', data: cp };
    } catch (e: any) {
      throw new Error(`API createCheckpoint failed: ${e.message}`);
    }
  }

  public static async deleteCheckpoint(id: string): Promise<ApiResponse<boolean>> {
    await this.delay();
    this.service.deleteCheckpoint(id);
    return { status: 200, message: 'Checkpoint deleted.', data: true };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ALERTS & RULES ENDPOINTS
  // ───────────────────────────────────────────────────────────────────────────

  public static async getAlertRules(): Promise<ApiResponse<AlertRule[]>> {
    await this.delay();
    const list = this.service.getAlertRules();
    return { status: 200, message: 'Alert rules loaded.', data: list };
  }

  public static async createAlertRule(rule: Partial<AlertRule>): Promise<ApiResponse<AlertRule>> {
    await this.delay();
    try {
      const created = this.service.createAlertRule(rule);
      return { status: 201, message: 'Alert rule created successfully.', data: created };
    } catch (e: any) {
      throw new Error(`API createAlertRule failed: ${e.message}`);
    }
  }

  public static async toggleAlertRule(id: string, enabled: boolean): Promise<ApiResponse<boolean>> {
    await this.delay();
    this.service.toggleAlertRule(id, enabled);
    return { status: 200, message: `Rule ${enabled ? 'enabled' : 'disabled'}.`, data: true };
  }

  public static async deleteAlertRule(id: string): Promise<ApiResponse<boolean>> {
    await this.delay();
    this.service.deleteAlertRule(id);
    return { status: 200, message: 'Alert rule deleted.', data: true };
  }

  public static async getAlerts(): Promise<ApiResponse<IncidentAlert[]>> {
    await this.delay();
    const list = this.service.getAlerts();
    return { status: 200, message: 'Incident alerts history loaded.', data: list };
  }

  public static async acknowledgeAlert(id: string, operator = 'ADMIN'): Promise<ApiResponse<boolean>> {
    await this.delay();
    this.service.manualAcknowledgeAlert(id, operator);
    return { status: 200, message: 'Alert acknowledged.', data: true };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ANALYTICS & AUDIT LOGS
  // ───────────────────────────────────────────────────────────────────────────

  public static async getAnalytics(): Promise<ApiResponse<SreAnalytics>> {
    await this.delay();
    const data = this.service.getAnalytics();
    return { status: 200, message: 'Calculated availability & MTTR metrics.', data };
  }

  public static async getAuditLogs(): Promise<ApiResponse<AuditLog[]>> {
    await this.delay();
    const logs = this.service.getAuditLogs();
    return { status: 200, message: 'Audit logs loaded.', data: logs };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SIMULATION CONTROL
  // ───────────────────────────────────────────────────────────────────────────

  public static async toggleSimulationMode(enabled: boolean): Promise<ApiResponse<boolean>> {
    await this.delay();
    this.service.toggleSimulation(enabled);
    return { status: 200, message: `Simulation mode set to ${enabled}.`, data: enabled };
  }

  public static async getSimulationMode(): Promise<ApiResponse<boolean>> {
    await this.delay();
    const val = this.service.getSimulationMode();
    return { status: 200, message: 'Loaded simulation state.', data: val };
  }

  public static async clearSystemData(): Promise<ApiResponse<boolean>> {
    await this.delay();
    this.service.clearAllData();
    return { status: 200, message: 'Cleared incident logs and reset collector state.', data: true };
  }
}

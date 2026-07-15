import { RecoveryJob, Incident, IncidentSeverity, RecoveryStatus } from '../types';
import { IncidentRepository } from '../repository/IncidentRepository';
import { CheckpointManager } from '../checkpoints/CheckpointManager';

export class RecoveryEngine {
  private static instance: RecoveryEngine | null = null;
  private repo = IncidentRepository.getInstance();
  private cpManager = CheckpointManager.getInstance();
  private activeJobs: Map<string, RecoveryJob> = new Map();
  private queueListeners: Set<(jobs: RecoveryJob[]) => void> = new Set();

  private constructor() {}

  public static getInstance(): RecoveryEngine {
    if (!this.instance) {
      this.instance = new RecoveryEngine();
    }
    return this.instance;
  }

  public subscribeQueue(listener: (jobs: RecoveryJob[]) => void): () => void {
    this.queueListeners.add(listener);
    return () => this.queueListeners.delete(listener);
  }

  private notifyQueueListeners(): void {
    const list = this.getRecoveryJobs();
    for (const l of this.queueListeners) {
      try {
        l(list);
      } catch (e) {}
    }
  }

  public getRecoveryJobs(): RecoveryJob[] {
    return Array.from(this.activeJobs.values()).sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
  }

  /**
   * Triggers recovery flow for an incident
   */
  public triggerRecovery(incidentId: string, severity: IncidentSeverity): string {
    const incidents = this.repo.getIncidents();
    const incident = incidents.find(i => i.id === incidentId);

    if (!incident) {
      throw new Error(`Incident ${incidentId} not found for recovery.`);
    }

    // Determine recovery priority
    let priority = 1;
    if (severity === 'critical') priority = 10;
    else if (severity === 'high') priority = 5;
    else if (severity === 'medium') priority = 3;

    // Determine steps based on component
    const steps = this.determineRecoverySteps(incident.component);

    const jobId = `job_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const job: RecoveryJob = {
      id: jobId,
      incidentId,
      priority,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      steps,
      currentStepIndex: 0,
      createdAt: Date.now()
    };

    this.activeJobs.set(jobId, job);

    incident.status = 'recovering';
    incident.timeline.push({
      id: `time_${Date.now()}_rec`,
      timestamp: Date.now(),
      message: `Recovery job ${jobId} registered. Actions prioritized.`,
      type: 'recovery_started'
    });
    this.repo.saveIncident(incident);

    this.notifyQueueListeners();

    // Start executing asynchronously
    this.executeJob(jobId);

    return jobId;
  }

  private determineRecoverySteps(component: string): string[] {
    switch (component) {
      case 'Sovereign Persona':
        return [
          'graceful_shutdown',
          'restore_context_snapshot',
          'restore_checkpoint_points',
          'restart_persona_agent'
        ];
      case 'Workflow Orchestrator':
        return [
          'pause_execution_pipeline',
          'resolve_dependency_conflicts',
          'restore_checkpoint_points',
          'resume_workflow_orchestrator'
        ];
      case 'Google Gemini API Gateway':
        return [
          'graceful_rate_limit_cooldown',
          'reinitialize_dependency',
          'automatic_retry_loop'
        ];
      default:
        return [
          'graceful_shutdown',
          'restore_last_know_stable_state',
          'automatic_retry_loop'
        ];
    }
  }

  /**
   * Executes a registered recovery job step-by-step
   */
  private async executeJob(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job || job.status !== 'pending') return;

    job.status = 'running';
    job.startedAt = Date.now();
    this.notifyQueueListeners();

    const incident = this.repo.getIncidents().find(i => i.id === job.incidentId);
    if (!incident) {
      job.status = 'failed';
      job.error = 'Incident associated with job was deleted.';
      this.notifyQueueListeners();
      return;
    }

    try {
      while (job.currentStepIndex < job.steps.length) {
        const currentStep = job.steps[job.currentStepIndex];
        
        // Update incident timeline and logs
        incident.logs.push(`[RECOVERY] Executing step: ${currentStep.toUpperCase()}`);
        incident.timeline.push({
          id: `time_step_${Date.now()}_${job.currentStepIndex}`,
          timestamp: Date.now(),
          message: `Executing recovery task: ${currentStep.replace(/_/g, ' ')}`,
          type: 'recovery_step'
        });
        incident.recoveryStepsTaken.push(currentStep);
        this.repo.saveIncident(incident);
        this.notifyQueueListeners();

        // Simulate step work duration for animation & tracking
        await new Promise(resolve => setTimeout(resolve, 800));

        // Execute step logic mock simulation
        this.simulateRecoveryStepLogic(currentStep, incident);

        job.currentStepIndex++;
        this.notifyQueueListeners();
      }

      // If all steps succeeded
      job.status = 'completed';
      job.completedAt = Date.now();
      
      incident.status = 'resolved';
      incident.resolvedAt = Date.now();
      incident.timeline.push({
        id: `time_res_${Date.now()}`,
        timestamp: Date.now(),
        message: 'System fully restored. Incident marked resolved.',
        type: 'resolved'
      });
      incident.logs.push('[RECOVERY] System recovered. Auto-resolved alert flags cleared.');
      this.repo.saveIncident(incident);

      // Resolve alert flags in local DB
      const alerts = this.repo.getAlerts();
      const activeAlert = alerts.find(a => a.metricName === this.getMetricByComponent(incident.component) && !a.resolved);
      if (activeAlert) {
        activeAlert.resolved = true;
        activeAlert.resolvedAt = Date.now();
        this.repo.saveAlert(activeAlert);
      }

      this.repo.saveAuditLog({
        id: `audit_${Date.now()}`,
        timestamp: Date.now(),
        operator: 'RECOVERY_ENGINE',
        action: 'RESOLVE_INCIDENT',
        details: `Incident ${incident.id} auto-resolved by Recovery Job ${job.id}`,
        success: true
      });

    } catch (e: any) {
      job.retryCount++;
      incident.logs.push(`[RECOVERY_FAILED] Attempt failed: ${e.message}`);
      incident.timeline.push({
        id: `time_err_${Date.now()}`,
        timestamp: Date.now(),
        message: `Recovery step failure: ${e.message}`,
        type: 'recovery_failed'
      });
      this.repo.saveIncident(incident);

      if (job.retryCount < job.maxRetries) {
        job.status = 'pending';
        job.currentStepIndex = 0; // restart
        this.notifyQueueListeners();
        // Cooldown delay before retry
        await new Promise(resolve => setTimeout(resolve, 1500));
        this.executeJob(jobId);
      } else {
        job.status = 'failed';
        job.completedAt = Date.now();
        job.error = e.message || 'Exceeded max recovery retries.';
        
        incident.status = 'active'; // back to active issue
        incident.logs.push('[FATAL] Automated recovery pipeline failed. Handing over to Manual Admin intervention.');
        this.repo.saveIncident(incident);

        this.repo.saveAuditLog({
          id: `audit_${Date.now()}`,
          timestamp: Date.now(),
          operator: 'RECOVERY_ENGINE',
          action: 'RECOVERY_PIPELINE_CRASHED',
          details: `Recovery Job ${job.id} exceeded retry limit. Manual audit required for ${incident.id}`,
          success: false
        });
      }
    }

    this.notifyQueueListeners();
  }

  private simulateRecoveryStepLogic(step: string, incident: Incident): void {
    const dice = Math.random();
    // Simulate a small chance of step crash to show retry/re-execute logic
    if (dice < 0.05) {
      throw new Error(`Simulation failed on step ${step} due to busy thread lock.`);
    }

    // Custom step-specific side-effects
    if (step === 'restore_checkpoint_points') {
      const checkpoints = this.repo.getCheckpoints();
      const relevant = checkpoints.filter(c => c.componentId === incident.component);
      if (relevant.length > 0) {
        // Sort descending, pick latest checkpoint
        relevant.sort((a, b) => b.timestamp - a.timestamp);
        const selected = relevant[0];
        incident.checkpointId = selected.id;
        incident.logs.push(`[CHECKPOINT] RESTORE: Loaded state version ${selected.id} signed with checksum signature ${selected.signature}`);
      } else {
        incident.logs.push(`[CHECKPOINT] WARNING: No active checkpoints available. Falling back to default genesis state.`);
      }
    }
  }

  private getMetricByComponent(component: string): string {
    switch (component) {
      case 'Sovereign Persona': return 'detector.agent_failures';
      case 'Workflow Orchestrator': return 'detector.workflow_failures';
      case 'Google Gemini API Gateway': return 'detector.api_timeouts';
      case 'Compute Resource Allocator': return 'detector.resource_exhaustion';
      case 'Digital Twin Security Registry': return 'detector.auth_failures';
      case 'Plugin Execution Sandbox': return 'detector.plugin_failures';
      case 'Decentralized P2P Mesh Network': return 'detector.network_connectivity_issues';
      case 'Inter-Agent Communication Hub': return 'detector.communication_failures';
      case 'Core System Kernel': return 'detector.unexpected_exceptions';
      default: return '';
    }
  }
}

import { Workflow, WorkflowMetric, WorkflowState, TaskState } from './types';
import { Monitoring } from '../monitoring/Monitoring';

export class WorkflowMonitor {
  private static metricsHistory: WorkflowMetric[] = [];

  /**
   * Evaluates task outputs, calculates aggregate workflow metrics,
   * stores history, and publishes telemetry to the Monitoring singleton.
   */
  public static recordMetrics(workflow: Workflow, durationMs: number): WorkflowMetric {
    const tasks = Array.from(workflow.tasks.values());
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.state === TaskState.COMPLETED).length;
    const failedTasks = tasks.filter((t) => t.state === TaskState.FAILED).length;
    
    const successRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 100;

    let carbonSavingsKg = 0;
    let energyUsedKwh = 0;
    let privacyScoreSum = 0;
    let privacyScoreCount = 0;
    let threatsBlocked = 0;

    for (const task of tasks) {
      if (task.outputResults) {
        // Retrieve carbon savings
        if (typeof task.outputResults.estimatedSavings === 'number') {
          carbonSavingsKg += task.outputResults.estimatedSavings;
        }

        // Retrieve energy savings/consumption
        if (typeof task.outputResults.energySavings === 'number') {
          energyUsedKwh += task.outputResults.energySavings;
        }

        // Retrieve privacy/trust scores
        if (typeof task.outputResults.trustScore === 'number') {
          privacyScoreSum += task.outputResults.trustScore;
          privacyScoreCount++;
        }

        // Retrieve threats blocked
        if (typeof task.outputResults.threatsCount === 'number') {
          threatsBlocked += task.outputResults.threatsCount;
        }
      }
    }

    const privacyScore = privacyScoreCount > 0 ? (privacyScoreSum / privacyScoreCount) * 100 : 100;

    const metric: WorkflowMetric = {
      workflowId: workflow.id,
      latencyMs: durationMs,
      carbonSavingsKg,
      energyUsedKwh,
      privacyScore,
      threatsBlocked,
      successRate,
      taskFailureCount: failedTasks,
      timestamp: Date.now(),
    };

    this.metricsHistory.push(metric);

    // Publish to central Observability Singleton
    try {
      const mon = Monitoring.getInstance();
      
      // Publish standard raw metrics
      mon.publishMetric('workflow.latency_ms', durationMs, { workflowId: workflow.id, name: workflow.name });
      mon.publishMetric('workflow.success_rate', successRate, { workflowId: workflow.id });
      mon.publishMetric('workflow.carbon_saved_kg', carbonSavingsKg, { workflowId: workflow.id });
      mon.publishMetric('workflow.threats_blocked', threatsBlocked, { workflowId: workflow.id });
      mon.publishMetric('workflow.privacy_score_percent', privacyScore, { workflowId: workflow.id });
      
      // Update monitoring latency records
      mon.recordLatency(`workflow:${workflow.name}`, durationMs, workflow.state === WorkflowState.COMPLETED);

      // Log threat events to health system if threats were blocked
      if (threatsBlocked > 0) {
        mon.recordThreat('Workflow Shield', 'medium', `${threatsBlocked} malicious payloads blocked during workflow execution.`);
      }

      // Record carbon usage offset optimization
      if (carbonSavingsKg > 0) {
        mon.recordCarbonUsage(0.05, 0.04, (carbonSavingsKg / (carbonSavingsKg + 0.1)) * 100);
      }
    } catch (e) {
      console.warn('Orchestrator monitoring export failed (likely not in browser runtime):', e);
    }

    return metric;
  }

  /**
   * Retrieves compiled metrics history
   */
  public static getMetricsHistory(): WorkflowMetric[] {
    return this.metricsHistory;
  }

  /**
   * Resets metrics history
   */
  public static clearMetrics(): void {
    this.metricsHistory = [];
  }
}

import { ScheduledJob } from '../types';
import { CostRepository } from '../repository/CostRepository';
import { CostValidator } from '../validators/CostValidator';

export interface ScheduleRecommendation {
  targetTimestamp: number;
  label: string;
  costSavingsPercent: number;
  carbonReductionPercent: number;
  reason: string;
}

export class WorkloadScheduler {
  private repository: CostRepository;

  constructor(repository: CostRepository) {
    this.repository = repository;
  }

  public getScheduledJobs(): ScheduledJob[] {
    return this.repository.getScheduledJobs();
  }

  /**
   * Schedule a future AI computational task
   */
  public scheduleJob(jobData: Partial<ScheduledJob>): { success: boolean; errors: string[] } {
    const id = jobData.id || `job-${Date.now()}`;
    const job: ScheduledJob = {
      id,
      name: jobData.name || 'Off-peak Fine-Tuning Task',
      targetModel: jobData.targetModel || 'gemini-2.5-pro',
      estimatedCostUsd: jobData.estimatedCostUsd || 5.0,
      carbonPriority: jobData.carbonPriority || 'medium',
      scheduledTime: jobData.scheduledTime || (Date.now() + 8 * 3600000), // Default 8 hours ahead
      status: jobData.status || 'pending',
      userId: jobData.userId || 'admin'
    };

    const validation = CostValidator.validateScheduledJob(job);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    this.repository.saveScheduledJob(job);
    
    // Add audit log
    this.repository.addAuditLog({
      id: `audit-${Date.now()}`,
      timestamp: Date.now(),
      userId: job.userId,
      action: 'SCHEDULE_WORKLOAD',
      details: `Scheduled job "${job.name}" for time: ${new Date(job.scheduledTime).toLocaleString()}`,
      success: true
    });

    return { success: true, errors: [] };
  }

  public cancelJob(id: string): boolean {
    const jobs = this.repository.getScheduledJobs();
    const job = jobs.find(j => j.id === id);
    if (job) {
      job.status = 'cancelled';
      this.repository.saveScheduledJob(job);
      
      this.repository.addAuditLog({
        id: `audit-${Date.now()}`,
        timestamp: Date.now(),
        userId: 'admin',
        action: 'CANCEL_WORKLOAD',
        details: `Cancelled scheduled job ID: ${id}`,
        success: true
      });
      return true;
    }
    return false;
  }

  /**
   * Evaluate optimal off-peak scheduling options based on mock grid metrics
   */
  public getScheduleRecommendations(estimatedDurationHours: number = 2): ScheduleRecommendation[] {
    const recommendations: ScheduleRecommendation[] = [];
    const now = Date.now();
    const oneHourMs = 3600000;

    // We check 3 future intervals:
    // 1. In 4 hours (e.g. Afternoon solar solar peak - High renewable energy)
    // 2. In 8 hours (e.g. Night valley - Off-peak rates)
    // 3. In 12 hours (e.g. Mid-day off-peak)
    
    recommendations.push({
      targetTimestamp: now + 4 * oneHourMs,
      label: 'Solar Peak Grid Cycle (+4 Hours)',
      costSavingsPercent: 15,
      carbonReductionPercent: 35,
      reason: 'Regional renewable grid density is projected to rise to 82% due to solar peak, dropping carbon footprint.'
    });

    recommendations.push({
      targetTimestamp: now + 8 * oneHourMs,
      label: 'Midnight Valley Off-Peak (+8 Hours)',
      costSavingsPercent: 40,
      carbonReductionPercent: 20,
      reason: 'Standard grid computation rates fall by 40% during off-peak night cycles, yielding highest cost savings.'
    });

    recommendations.push({
      targetTimestamp: now + 12 * oneHourMs,
      label: 'Next-day Early Clean Grid (+12 Hours)',
      costSavingsPercent: 25,
      carbonReductionPercent: 30,
      reason: 'Optimal balanced window combining low network congestion rates with favorable wind energy supply.'
    });

    return recommendations;
  }
}

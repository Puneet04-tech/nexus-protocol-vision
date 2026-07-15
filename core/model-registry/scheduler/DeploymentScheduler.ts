import { ModelRegistryRepository } from '../repository/ModelRegistryRepository';
import { LocalStorageAdapter } from '../../collaboration-studio/persistence/LocalStorageAdapter';
import { DeploymentInfo, DeploymentHistoryEntry } from '../types';

export class DeploymentScheduler {
  private static instance: DeploymentScheduler | null = null;
  private repository = ModelRegistryRepository.getInstance();
  private intervalId: number | null = null;
  private listeners: Set<() => void> = new Set();

  private constructor() {}

  public static getInstance(): DeploymentScheduler {
    if (!this.instance) {
      this.instance = new DeploymentScheduler();
    }
    return this.instance;
  }

  /**
   * Subscribes a listener to tick updates (used by React components to trigger re-renders).
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    this.startScheduler();

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stopScheduler();
      }
    };
  }

  private startScheduler(): void {
    if (this.intervalId !== null) return;

    if (typeof window !== 'undefined') {
      this.intervalId = window.setInterval(() => {
        this.tick();
      }, 3000) as unknown as number; // Tick every 3 seconds
    }
  }

  private stopScheduler(): void {
    if (this.intervalId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * The scheduler execution tick:
   * - Increments active replicas towards target count.
   * - Progresses deploying status to active.
   * - Automatically increments Canary traffic weights by 10-20% per tick if configured.
   */
  public tick(): void {
    const deployments = this.repository.listDeployments();
    let changed = false;

    deployments.forEach(dep => {
      // 1. Process Deploying container startup
      if (dep.status === 'deploying') {
        if (dep.activeReplicas < dep.targetReplicas) {
          dep.activeReplicas++;
          changed = true;
        }

        if (dep.activeReplicas >= dep.targetReplicas) {
          dep.status = 'active';
          dep.updatedAt = Date.now();
          changed = true;

          // Add history entry
          this.logHistory(
            dep,
            'complete',
            `Container orchestration completed successfully. ${dep.activeReplicas}/${dep.targetReplicas} replicas active.`
          );
        }
      }

      // 2. Process active replica scaling adjustments
      if (dep.status === 'active' && dep.activeReplicas !== dep.targetReplicas) {
        if (dep.activeReplicas < dep.targetReplicas) {
          dep.activeReplicas++;
        } else {
          dep.activeReplicas--;
        }
        changed = true;
      }

      // 3. Canary traffic auto-escalation (Simulate rolling promotion if not 100%)
      if (dep.status === 'active' && dep.strategy === 'canary' && dep.currentTrafficWeight < 100) {
        // Automatically promote traffic by 10%
        const prevWeight = dep.currentTrafficWeight;
        const newWeight = Math.min(100, dep.currentTrafficWeight + 10);
        dep.currentTrafficWeight = newWeight;
        dep.updatedAt = Date.now();
        changed = true;

        this.logHistory(
          dep,
          'traffic_shift',
          `Canary rollout promotion: Shifted traffic weight from ${prevWeight}% to ${newWeight}%.`
        );

        // Find the stable baseline and reduce its traffic weight accordingly
        const siblingStable = deployments.find(
          d =>
            d.modelId === dep.modelId &&
            d.environment === dep.environment &&
            d.id !== dep.id &&
            d.version !== dep.version
        );
        if (siblingStable) {
          siblingStable.currentTrafficWeight = 100 - newWeight;
          siblingStable.updatedAt = Date.now();

          if (siblingStable.currentTrafficWeight === 0) {
            // Retire sibling stable as canary reached 100%
            siblingStable.status = 'retired';
            this.logHistory(
              siblingStable,
              'complete',
              `Canary migration complete. Retired legacy version ${siblingStable.version}.`
            );
          }
        }
      }
    });

    if (changed) {
      LocalStorageAdapter.set('nexus_model_deployments', deployments);
      this.listeners.forEach(listener => listener());
    }
  }

  private logHistory(dep: DeploymentInfo, eventType: DeploymentHistoryEntry['eventType'], message: string): void {
    const entry: DeploymentHistoryEntry = {
      id: `dh_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      deploymentId: dep.id,
      modelId: dep.modelId,
      version: dep.version,
      environment: dep.environment,
      eventType,
      timestamp: Date.now(),
      message,
      trafficWeight: dep.currentTrafficWeight,
      user: 'nexus-scheduler'
    };
    this.repository.saveHistoryEntry(entry);
  }
}

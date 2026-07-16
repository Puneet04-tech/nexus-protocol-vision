import { IncidentDetector } from '../detection/IncidentDetector';
import { IncidentMetricsCollector } from '../monitoring/IncidentMetricsCollector';

export class RecoveryScheduler {
  private static instance: RecoveryScheduler | null = null;
  private detector = IncidentDetector.getInstance();
  private collector = IncidentMetricsCollector.getInstance();
  
  private monitorIntervalId: number | null = null;
  private simulationIntervalId: number | null = null;
  private isSimulationEnabled = false;

  private constructor() {
    this.startAuditing();
  }

  public static getInstance(): RecoveryScheduler {
    if (!this.instance) {
      this.instance = new RecoveryScheduler();
    }
    return this.instance;
  }

  /**
   * Start checking alert rules every 3 seconds
   */
  public startAuditing(): void {
    if (this.monitorIntervalId !== null) return;
    
    this.monitorIntervalId = window.setInterval(() => {
      try {
        this.detector.evaluateRules();
      } catch (e) {}
    }, 3000);
  }

  public stopAuditing(): void {
    if (this.monitorIntervalId !== null) {
      window.clearInterval(this.monitorIntervalId);
      this.monitorIntervalId = null;
    }
  }

  /**
   * Enable or disable anomaly injection simulation
   */
  public setSimulationMode(enabled: boolean): void {
    this.isSimulationEnabled = enabled;
    if (enabled) {
      this.startSimulation();
    } else {
      this.stopSimulation();
    }
  }

  public getSimulationMode(): boolean {
    return this.isSimulationEnabled;
  }

  private startSimulation(): void {
    if (this.simulationIntervalId !== null) return;

    this.simulationIntervalId = window.setInterval(() => {
      if (!this.isSimulationEnabled) return;

      const dice = Math.random();

      // Periodic resource load adjustments
      const cpu = 40 + Math.floor(Math.random() * 45); // normal 40-85%
      const memory = 60 + Math.floor(Math.random() * 32); // normal 60-92%
      this.collector.recordResourceExhaustion(cpu, memory);

      if (dice < 0.15) {
        // Trigger simulated API Timeout
        this.collector.recordApiTimeout();
      } else if (dice < 0.25) {
        // Trigger simulated Agent lockup
        this.collector.recordAgentFailure();
      } else if (dice < 0.32) {
        // Trigger simulated Auth attempt spike
        this.collector.increment('detector.auth_failures', 3);
      } else if (dice < 0.40) {
        // Trigger simulated Plugin fail
        this.collector.recordPluginFailure();
      } else if (dice < 0.48) {
        // Trigger simulated Network disconnected state
        this.collector.recordNetworkOutage(true);
        setTimeout(() => {
          this.collector.recordNetworkOutage(false);
        }, 4000);
      }
    }, 8000); // Inject random anomaly every 8 seconds when simulation is enabled
  }

  private stopSimulation(): void {
    if (this.simulationIntervalId !== null) {
      window.clearInterval(this.simulationIntervalId);
      this.simulationIntervalId = null;
    }
  }

  public destroy(): void {
    this.stopAuditing();
    this.stopSimulation();
  }
}

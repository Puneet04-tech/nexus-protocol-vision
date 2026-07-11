import { PolicyViolation } from './models/PolicyViolation';

export type AlertCallback = (violation: PolicyViolation) => void;

export class AlertManager {
  private static instance: AlertManager | null = null;
  private alerts: PolicyViolation[] = [];
  private listeners: Set<AlertCallback> = new Set();

  private constructor() {}

  public static getInstance(): AlertManager {
    if (!this.instance) {
      this.instance = new AlertManager();
    }
    return this.instance;
  }

  /**
   * Register a callback listener that triggers whenever a violation is detected
   * Returns a cleanup function to unsubscribe
   */
  public subscribe(callback: AlertCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Dispatch violation alert
   */
  public triggerAlert(violation: PolicyViolation): void {
    this.alerts.unshift(violation); // Keep newest alerts first
    
    // Limit alerts history size to 100 in memory
    if (this.alerts.length > 100) {
      this.alerts.pop();
    }

    // Notify listeners
    this.listeners.forEach((listener) => {
      try {
        listener(violation);
      } catch (e) {
        console.error('Error executing alert listener:', e);
      }
    });
  }

  /**
   * Retrieve all current alerts
   */
  public getAlerts(): PolicyViolation[] {
    return this.alerts;
  }

  /**
   * Clear active alerts list
   */
  public clearAlerts(): void {
    this.alerts = [];
  }
}

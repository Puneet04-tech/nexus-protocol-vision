import { ThreatMetrics } from './MonitoringTypes';

/**
 * Tracks security threats, malicious queries, and immune response statistics
 */
export class ThreatMetricsCollector {
  private activeThreats: number = 0;
  private totalDetected: number = 0;
  private totalNeutralized: number = 0;
  private falsePositives: number = 0;
  private responseTimesMs: number[] = [];
  private securityState: 'healthy' | 'degraded' | 'compromised' | 'recovering' = 'healthy';

  public recordThreatDetection(threatId: string, severity: string): void {
    this.totalDetected += 1;
    this.activeThreats += 1;
    if (severity === 'critical') {
      this.securityState = 'compromised';
    } else if (severity === 'high' && this.securityState === 'healthy') {
      this.securityState = 'degraded';
    }
  }

  public recordNeutralization(threatId: string, responseTimeMs: number): void {
    this.totalNeutralized += 1;
    if (this.activeThreats > 0) {
      this.activeThreats -= 1;
    }
    this.responseTimesMs.push(responseTimeMs);
    if (this.responseTimesMs.length > 50) {
      this.responseTimesMs.shift();
    }
    
    if (this.activeThreats === 0) {
      this.securityState = 'recovering';
    }
  }

  public recordFalsePositive(): void {
    this.falsePositives += 1;
    if (this.activeThreats > 0) {
      this.activeThreats -= 1;
    }
  }

  public setSecurityState(state: 'healthy' | 'degraded' | 'compromised' | 'recovering'): void {
    this.securityState = state;
  }

  public collect(): ThreatMetrics {
    const averageResponseTimeMs = this.responseTimesMs.length > 0
      ? this.responseTimesMs.reduce((a, b) => a + b, 0) / this.responseTimesMs.length
      : 42; // default base response speed in ms

    return {
      activeThreatCount: this.activeThreats,
      threatsDetectedTotal: this.totalDetected,
      threatsNeutralizedTotal: this.totalNeutralized,
      falsePositivesTotal: this.falsePositives,
      averageResponseTimeMs: Number(averageResponseTimeMs.toFixed(1)),
      securityState: this.securityState,
      timestamp: Date.now()
    };
  }
}

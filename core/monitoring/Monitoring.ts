import { MetricRecord, HealthStatus, TimeResolution } from './MonitoringTypes';
import { MonitoringUtils } from './MonitoringUtils';
import { MetricsStorage } from './MetricsStorage';
import { MetricsSerializer } from './MetricsSerializer';
import { SystemMetricsCollector } from './SystemMetricsCollector';
import { ResourceMonitor } from './ResourceMonitor';
import { LatencyTracker } from './LatencyTracker';
import { TokenUsageTracker } from './TokenUsageTracker';
import { CarbonMetricsCollector } from './CarbonMetricsCollector';
import { ThreatMetricsCollector } from './ThreatMetricsCollector';
import { FederatedMetricsCollector } from './FederatedMetricsCollector';
import { PrivacyMetricsCollector } from './PrivacyMetricsCollector';
import { PerformanceMonitor } from './PerformanceMonitor';
import { MetricsAggregator } from './MetricsAggregator';
import { HealthChecker } from './HealthChecker';
import { AlertEngine } from './AlertEngine';

/**
 * Main Singleton Orchestrator for the Nexus Observability and Analytics subsystem
 */
export class Monitoring {
  private static instance: Monitoring | null = null;

  // Backend sub-collectors
  public readonly systemCollector = new SystemMetricsCollector();
  public readonly resourceMonitor = new ResourceMonitor();
  public readonly latencyTracker = new LatencyTracker();
  public readonly tokenUsageTracker = new TokenUsageTracker();
  public readonly carbonCollector = new CarbonMetricsCollector();
  public readonly threatCollector = new ThreatMetricsCollector();
  public readonly federatedCollector = new FederatedMetricsCollector();
  public readonly privacyCollector = new PrivacyMetricsCollector();
  public readonly performanceMonitor = new PerformanceMonitor();
  public readonly healthChecker = new HealthChecker();
  public readonly alertEngine = new AlertEngine();
  public readonly aggregator: MetricsAggregator;

  private pollIntervalId: number | null = null;
  private rollupIntervalId: number | null = null;
  private simulationIntervalId: number | null = null;
  private isSimulationEnabled = true;

  private constructor() {
    const storage = MetricsStorage.getAdapter();
    this.aggregator = new MetricsAggregator(storage);
    
    this.startPolling();
    this.startHistoryRollups();
    this.startMockSimulation();
  }

  public static getInstance(): Monitoring {
    if (!this.instance) {
      this.instance = new Monitoring();
    }
    return this.instance;
  }

  /**
   * Reset instance for tests
   */
  public static resetInstance(): void {
    if (this.instance) {
      this.instance.destroy();
      this.instance = null;
    }
  }

  /**
   * Start polling real-time metrics (every 2.5 seconds)
   */
  private startPolling(): void {
    const poll = async () => {
      try {
        const timestamp = Date.now();

        // 1. Gather System Metrics
        const sys = this.systemCollector.collect();
        this.publishMetric('system.cpu_load_percent', sys.cpuLoadPercent, { cat: 'system' });
        this.publishMetric('system.memory_usage_mb', sys.memoryUsageMb, { cat: 'system' });
        this.publishMetric('system.uptime_seconds', sys.uptimeSeconds, { cat: 'system' });
        this.publishMetric('system.event_loop_delay_ms', sys.eventLoopDelayMs, { cat: 'system' });

        // 2. Gather Resource Metrics
        const res = this.resourceMonitor.collect();
        this.publishMetric('resources.active_users', res.activeUsers, { cat: 'resource' });
        this.publishMetric('resources.active_agents', res.activeAgents, { cat: 'resource' });
        this.publishMetric('resources.storage_size_bytes', res.storageSizeBytes, { cat: 'resource' });
        this.publishMetric('resources.network_bytes_sent', res.networkBytesSent, { cat: 'resource' });
        this.publishMetric('resources.network_bytes_received', res.networkBytesReceived, { cat: 'resource' });

        // 3. Gather Latency Metrics
        this.publishMetric('latency.average_ms', this.latencyTracker.getAverage(), { cat: 'performance' });
        this.publishMetric('latency.peak_ms', this.latencyTracker.getPeak(), { cat: 'performance' });
        const pct = this.latencyTracker.getPercentiles();
        this.publishMetric('latency.p50_ms', pct.p50, { cat: 'performance' });
        this.publishMetric('latency.p95_ms', pct.p95, { cat: 'performance' });
        this.publishMetric('latency.p99_ms', pct.p99, { cat: 'performance' });

        // 4. Gather Token Metrics
        const tokens = this.tokenUsageTracker.getStats();
        this.publishMetric('tokens.invocations_total', tokens.invocations, { cat: 'tokens' });
        this.publishMetric('tokens.input_total', tokens.inputTokens, { cat: 'tokens' });
        this.publishMetric('tokens.output_total', tokens.outputTokens, { cat: 'tokens' });

        // 5. Gather Carbon Metrics
        const carbon = this.carbonCollector.collect();
        this.publishMetric('carbon.total_emissions_kg', carbon.totalEmissionsKg, { cat: 'carbon' });
        this.publishMetric('carbon.energy_savings_percent', carbon.energySavingsPercent, { cat: 'carbon' });
        this.publishMetric('carbon.renewable_energy_percent', carbon.renewableEnergyPercent, { cat: 'carbon' });
        this.publishMetric('carbon.budget_used_percent', carbon.carbonBudgetUsedPercent, { cat: 'carbon' });

        // 6. Gather Threat Metrics
        const threat = this.threatCollector.collect();
        this.publishMetric('threat.active_count', threat.activeThreatCount, { cat: 'threat' });
        this.publishMetric('threat.total_detected', threat.threatsDetectedTotal, { cat: 'threat' });
        this.publishMetric('threat.total_neutralized', threat.threatsNeutralizedTotal, { cat: 'threat' });
        this.publishMetric('threat.false_positives', threat.falsePositivesTotal, { cat: 'threat' });
        this.publishMetric('threat.average_response_time_ms', threat.averageResponseTimeMs, { cat: 'threat' });

        // 7. Gather Federated Metrics
        const fed = this.federatedCollector.collect();
        this.publishMetric('federated.rounds_total', fed.participationRounds, { cat: 'federated' });
        this.publishMetric('federated.convergence_rate', fed.modelConvergenceRate * 100, { cat: 'federated' }); // percentage
        this.publishMetric('federated.aggregation_successes', fed.secureAggregationSuccesses, { cat: 'federated' });
        this.publishMetric('federated.local_updates', fed.localUpdatesSubmitted, { cat: 'federated' });
        this.publishMetric('federated.average_round_duration_ms', fed.averageRoundDurationMs, { cat: 'federated' });

        // 8. Gather Privacy Metrics
        const priv = this.privacyCollector.collect();
        this.publishMetric('privacy.negotiations_total', priv.negotiationCount, { cat: 'privacy' });
        this.publishMetric('privacy.mpc_used', priv.mpcProtocolsUsed, { cat: 'privacy' });
        this.publishMetric('privacy.zkp_used', priv.zkpProtocolsUsed, { cat: 'privacy' });
        this.publishMetric('privacy.budget_used_percent', priv.privacyBudgetUsedPercent, { cat: 'privacy' });
        this.publishMetric('privacy.average_trust_score', priv.averageTrustScore * 100, { cat: 'privacy' }); // percentage

        // 9. Gather Performance Telemetry
        const perfVal = this.performanceMonitor.collect();
        this.publishMetric('perf.throughput_rps', perfVal.throughputRps, { cat: 'performance' });
        this.publishMetric('perf.success_rate', perfVal.successRate, { cat: 'performance' });
        this.publishMetric('perf.failed_count', perfVal.failedCount, { cat: 'performance' });
        this.publishMetric('perf.concurrent_requests', perfVal.concurrentRequests, { cat: 'performance' });

        // Evaluates aggregate health status
        this.healthChecker.evaluateSystemStatus('Persona', sys.eventLoopDelayMs + 5, false);
        this.healthChecker.evaluateSystemStatus('Carbon', carbon.totalEmissionsKg > 4.5 ? 500 : 25, carbon.totalEmissionsKg > 4.8);
        this.healthChecker.evaluateSystemStatus('Immune', threat.averageResponseTimeMs, threat.activeThreatCount > 2);
        this.healthChecker.evaluateSystemStatus('Privacy', priv.averageTrustScore < 0.6 ? 200 : 40, priv.averageTrustScore < 0.5);

      } catch (e) {}
    };

    this.pollIntervalId = window.setInterval(poll, 2500);
  }

  /**
   * Periodically roll up metrics (Hourly rollups every 15 seconds for SPA demo visualization)
   */
  private startHistoryRollups(): void {
    const rollup = async () => {
      try {
        await this.aggregator.performRollup('hour');
        
        // Occasionally trigger longer rollups
        if (Math.random() < 0.2) await this.aggregator.performRollup('day');
        if (Math.random() < 0.05) await this.aggregator.performRollup('week');
      } catch (e) {}
    };
    this.rollupIntervalId = window.setInterval(rollup, 15000);
  }

  /**
   * Background Workload Simulator to make graphs feel alive when application is idle
   */
  private startMockSimulation(): void {
    const simulate = () => {
      if (!this.isSimulationEnabled) return;

      const dice = Math.random();
      
      if (dice < 0.4) {
        // Record random user query/inference
        const models = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemma-2b-it'];
        const m = models[Math.floor(Math.random() * models.length)];
        const delay = 40 + Math.floor(Math.random() * 300);
        
        this.performanceMonitor.startRequest();
        setTimeout(() => {
          const success = Math.random() > 0.02; // 98% success rate
          this.performanceMonitor.endRequest(success);
          this.latencyTracker.record(`inference:${m}`, delay);
          this.tokenUsageTracker.record(m, 100 + Math.floor(Math.random() * 200), 50 + Math.floor(Math.random() * 100));
          
          // Carbon cost
          const baseC = m.includes('pro') ? 0.05 : 0.01;
          this.carbonCollector.recordCarbonUsage(baseC * (delay / 100), baseC * 0.8, baseC * 0.2);
        }, delay);

      } else if (dice < 0.65) {
        // Record privacy negotiation
        const protocols: Array<'MPC' | 'ZKP' | 'hybrid'> = ['MPC', 'ZKP', 'hybrid'];
        const p = protocols[Math.floor(Math.random() * protocols.length)];
        const success = Math.random() > 0.05;
        this.privacyCollector.recordNegotiation(p, 0.7 + Math.random() * 0.3, Math.random() * 0.4);

      } else if (dice < 0.8) {
        // Record federated round completion
        const success = Math.random() > 0.04;
        this.federatedCollector.recordRound(success, 500 + Math.floor(Math.random() * 1000), 0.01 + Math.random() * 0.02);

      } else if (dice < 0.95) {
        // Record knowledge graph additions
        const nodes = 1 + Math.floor(Math.random() * 5);
        const edges = nodes * (1 + Math.floor(Math.random() * 2));
        this.publishMetric('graph.nodes_added', nodes);
        this.publishMetric('graph.edges_added', edges);

      } else {
        // Trigger simulated security attack
        const types = ['prompt_injection', 'agent_hijacking', 'denial_of_service'];
        const t = types[Math.floor(Math.random() * types.length)];
        const threatId = `threat_${Date.now()}`;
        
        this.threatCollector.recordThreatDetection(threatId, Math.random() > 0.8 ? 'high' : 'medium');
        
        setTimeout(() => {
          // Blocked by immune respond shield
          this.threatCollector.recordNeutralization(threatId, 12 + Math.floor(Math.random() * 80));
        }, 150);
      }
    };

    this.simulationIntervalId = window.setInterval(simulate, 3000);
  }

  public setSimulationMode(enabled: boolean): void {
    this.isSimulationEnabled = enabled;
  }

  public destroy(): void {
    if (this.pollIntervalId !== null) {
      window.clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    if (this.rollupIntervalId !== null) {
      window.clearInterval(this.rollupIntervalId);
      this.rollupIntervalId = null;
    }
    if (this.simulationIntervalId !== null) {
      window.clearInterval(this.simulationIntervalId);
      this.simulationIntervalId = null;
    }
    this.systemCollector.destroy();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC OBSERVABILITY API ENDPOINTS
  // ───────────────────────────────────────────────────────────────────────────

  public publishMetric(name: string, value: number, tags?: Record<string, string>): void {
    if (!MonitoringUtils.validateMetric(name, value)) return;

    const record: MetricRecord = {
      name,
      value,
      timestamp: Date.now(),
      tags: tags ? MetricsSerializer.sanitizeTags(tags) : undefined
    };

    // Save to persistence
    MetricsStorage.getAdapter().saveMetric(record).catch(() => {});

    // Feed alert engine thresholds evaluations
    this.alertEngine.evaluateMetric(record);

    // Feed aggregator Rollups buffer
    this.aggregator.addSample(name, value);
  }

  public recordLatency(operation: string, latencyMs: number, success: boolean = true): void {
    this.performanceMonitor.startRequest();
    this.latencyTracker.record(operation, latencyMs);
    this.performanceMonitor.endRequest(success);
    
    // Evaluate health dynamics
    this.healthChecker.evaluateSystemStatus('Persona', latencyMs, !success);
  }

  public recordThreat(
    threatType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details?: string
  ): void {
    const id = `threat_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.threatCollector.recordThreatDetection(id, severity);
    
    // Report health status updates
    this.healthChecker.reportStatus(
      'Immune', 
      severity === 'critical' ? 'Critical' : 'Warning', 
      50, 
      25, 
      90
    );
  }

  public recordPrivacyNegotiation(
    requestType: string,
    protocol: 'MPC' | 'ZKP' | 'hybrid',
    accepted: boolean,
    executionTimeMs: number
  ): void {
    this.privacyCollector.recordNegotiation(protocol, accepted ? 0.95 : 0.4, accepted ? 0.1 : 0.8);
    this.latencyTracker.record(`privacy:${requestType}`, executionTimeMs);
    
    this.healthChecker.evaluateSystemStatus('Privacy', executionTimeMs, !accepted);
  }

  public recordCarbonUsage(emissionsKg: number, energyKwh: number, savingsPercent: number): void {
    this.carbonCollector.recordCarbonUsage(emissionsKg, emissionsKg * 0.7, emissionsKg * 0.3);
    this.carbonCollector.setOptimizerStats(savingsPercent, 80 + Math.random() * 15);
  }

  public recordFederatedRound(
    roundId: string,
    participantsCount: number,
    success: boolean,
    executionTimeMs: number
  ): void {
    this.federatedCollector.recordRound(success, executionTimeMs, success ? 0.02 : 0);
    this.latencyTracker.record(`federated:${roundId}`, executionTimeMs);
    
    this.healthChecker.evaluateSystemStatus('Federated', executionTimeMs, !success);
  }

  public recordTokenUsage(model: string, inputTokens: number, outputTokens: number): void {
    this.tokenUsageTracker.record(model, inputTokens, outputTokens);
  }

  public recordGraphUpdate(operationType: string, nodesAdded: number, edgesAdded: number): void {
    this.publishMetric('graph.nodes_added', nodesAdded, { op: operationType });
    this.publishMetric('graph.edges_added', edgesAdded, { op: operationType });
    
    this.healthChecker.reportStatus('Graph', 'Healthy', 15, 0, 100);
  }

  public recordSovereignRequest(requestType: string, success: boolean): void {
    this.publishMetric('persona.request_count', 1, { type: requestType, success: String(success) });
    this.healthChecker.evaluateSystemStatus('Persona', 20, !success);
  }

  public recordMorphNetOptimization(cycleId: string, compressionRatio: number, speedupFactor: number): void {
    this.publishMetric('morphnet.compression_ratio', compressionRatio, { cycle: cycleId });
    this.publishMetric('morphnet.speedup_factor', speedupFactor, { cycle: cycleId });
    
    this.healthChecker.reportStatus('MorphNet', 'Healthy', 120, 0, 100);
  }

  public recordAdversarialScan(scanType: string, threatsDetected: number): void {
    this.publishMetric('threat.scans_total', 1, { type: scanType });
    if (threatsDetected > 0) {
      this.recordThreat(scanType, threatsDetected > 2 ? 'high' : 'medium');
    }
  }
}

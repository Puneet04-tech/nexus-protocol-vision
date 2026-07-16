import { IncidentService } from '../services/IncidentService';
import { IncidentValidator } from '../validators/IncidentValidator';
import { CheckpointManager } from '../checkpoints/CheckpointManager';
import { IncidentMetricsCollector } from '../monitoring/IncidentMetricsCollector';
import { IncidentRepository } from '../repository/IncidentRepository';
import { IncidentDetector } from '../detection/IncidentDetector';
import { SreAnalytics } from '../types';

export interface SreTestCaseResult {
  name: string;
  suite: string;
  passed: boolean;
  duration: number;
  error?: string;
}

export interface SreSuiteResults {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  tests: SreTestCaseResult[];
}

export class IncidentResponseTestSuite {
  public static async runTests(service: IncidentService): Promise<SreSuiteResults> {
    const start = Date.now();
    const tests: SreTestCaseResult[] = [];

    const runTest = async (suite: string, name: string, fn: () => void | Promise<void>) => {
      const tStart = Date.now();
      try {
        await fn();
        tests.push({
          suite,
          name,
          passed: true,
          duration: Date.now() - tStart
        });
      } catch (err: any) {
        tests.push({
          suite,
          name,
          passed: false,
          duration: Date.now() - tStart,
          error: err.message || String(err)
        });
      }
    };

    // =========================================================================
    // UNIT TESTS: IncidentValidator
    // =========================================================================
    await runTest('Incident Validator', 'sanitizes input tags and scripts correctly', () => {
      const original = '<script>alert("xss")</script>';
      const clean = IncidentValidator.sanitizeString(original);
      if (clean.includes('<') || clean.includes('>')) {
        throw new Error(`Sanitizer failed: ${clean}`);
      }
    });

    await runTest('Incident Validator', 'validates correct alert rules inputs', () => {
      // Valid rule
      IncidentValidator.validateAlertRule({
        id: 'rule_valid',
        metricName: 'detector.agent_failures',
        operator: 'gt',
        threshold: 0,
        severity: 'high',
        description: 'valid desc'
      });

      // Invalid operator
      try {
        IncidentValidator.validateAlertRule({
          id: 'rule_invalid',
          metricName: 'detector.agent_failures',
          operator: 'invalid_op' as any,
          threshold: 0,
          severity: 'high',
          description: 'invalid desc'
        });
        throw new Error('Should have thrown error on invalid operator.');
      } catch (e: any) {
        if (!e.message.includes('Invalid operator')) throw e;
      }
    });

    // =========================================================================
    // UNIT TESTS: CheckpointManager
    // =========================================================================
    await runTest('Checkpoint Manager', 'signs state and validates signature integrity', () => {
      const cpManager = CheckpointManager.getInstance();
      const componentId = 'Workflow Orchestrator';
      const state = 'RUNNING';
      const ctx = { user: 'nexus_twin', step: 3 };

      const signature = cpManager.generateSignature(componentId, state, ctx);
      
      const checkpoint = {
        id: 'cp_test_1',
        timestamp: Date.now(),
        type: 'auto' as const,
        componentId,
        workflowState: state,
        contextSnapshot: ctx,
        signature
      };

      const isValid = cpManager.validateCheckpointIntegrity(checkpoint);
      if (!isValid) {
        throw new Error('Valid checkpoint failed signature verification.');
      }

      // Corrupt context
      const corruptedCp = {
        ...checkpoint,
        contextSnapshot: { ...ctx, step: 99 }
      };

      const isCorruptedValid = cpManager.validateCheckpointIntegrity(corruptedCp);
      if (isCorruptedValid) {
        throw new Error('Corrupted context bypassed verification check!');
      }
    });

    // =========================================================================
    // UNIT TESTS: IncidentMetricsCollector
    // =========================================================================
    await runTest('Metrics Collector', 'correctly increments and gauges metrics keys', () => {
      const collector = IncidentMetricsCollector.getInstance();
      collector.resetMetrics();

      collector.recordAgentFailure();
      collector.recordApiTimeout();
      collector.recordResourceExhaustion(80, 96); // max 96

      if (collector.getMetric('detector.agent_failures') !== 1) {
        throw new Error('Agent failures increment mismatch.');
      }
      if (collector.getMetric('detector.api_timeouts') !== 1) {
        throw new Error('API timeouts increment mismatch.');
      }
      if (collector.getMetric('detector.resource_exhaustion') !== 96) {
        throw new Error('Resource exhaustion gauge mismatch.');
      }
    });

    // =========================================================================
    // INTEGRATION TESTS: Detector, Recovery, and Timeline Loops
    // =========================================================================
    await runTest('SRE Integration Flow', 'detects breach, triggers recovery, updates timeline, and resolves', async () => {
      // Clear data to start clean
      service.clearAllData();

      const rules = service.getAlertRules();
      const apiRule = rules.find(r => r.id === 'rule_api_timeout');
      if (!apiRule) throw new Error('Seeded api timeout rule is missing.');

      // 1. Trigger metric breach
      service.manualTriggerIncident('rule_api_timeout');

      // Check if alert and incident were registered
      const activeIncidents = service.getIncidents().filter(i => i.status !== 'resolved');
      if (activeIncidents.length !== 1) {
        throw new Error(`Expected 1 active incident, found ${activeIncidents.length}`);
      }

      const activeAlerts = service.getAlerts().filter(a => !a.resolved);
      if (activeAlerts.length !== 1) {
        throw new Error(`Expected 1 active alert, found ${activeAlerts.length}`);
      }

      const incident = activeIncidents[0];
      if (!incident.title.includes('Gemini API')) {
        throw new Error(`Unexpected incident title: ${incident.title}`);
      }

      // Check if recovery job was registered (high or critical triggers auto-recovery)
      // rule_api_timeout severity is medium (doesn't auto-trigger recovery, lets manually trigger it!)
      service.manualTriggerRecovery(incident.id, 'DIAGNOSTIC_RUNNER');

      const recoveryJobs = service.getRecoveryJobs();
      const relevantJob = recoveryJobs.find(j => j.incidentId === incident.id);
      if (!relevantJob) {
        throw new Error('Manual recovery job was not queued.');
      }

      // Let recovery job execute in the background. In our integration test we can wait a bit.
      // Since recovery takes 800ms per step, we will wait 3000ms to allow completion.
      await new Promise(resolve => setTimeout(resolve, 2500));

      const updatedInc = service.getIncidents().find(i => i.id === incident.id);
      if (!updatedInc || updatedInc.status !== 'resolved') {
        throw new Error(`Incident status expected resolved, got ${updatedInc?.status}`);
      }

      const resolvedAlert = service.getAlerts().find(a => a.metricName === 'detector.api_timeouts');
      if (!resolvedAlert || !resolvedAlert.resolved) {
        throw new Error('Associated metric alert flag was not cleared.');
      }
    });

    // =========================================================================
    // INTEGRATION TESTS: ReportGenerator and Analytics
    // =========================================================================
    await runTest('Analytics & Export', 'calculates SRE metrics and exports documents', () => {
      const analytics = service.getAnalytics();
      if (typeof analytics.systemAvailabilityPercent !== 'number') {
        throw new Error('Analytics failed to calculate system availability.');
      }

      const json = service.exportReport('json') as string;
      const csv = service.exportReport('csv') as string;
      const pdf = service.exportReport('pdf') as Blob;

      if (!json.includes('reportType')) {
        throw new Error('Export JSON format mismatch.');
      }
      if (!csv.includes('Incident ID,Title,Severity')) {
        throw new Error('Export CSV headers missing.');
      }
      if (pdf.size === 0 || pdf.type !== 'application/pdf') {
        throw new Error('Export PDF binary output empty or wrong type.');
      }
    });

    const end = Date.now();
    const passed = tests.filter(t => t.passed).length;
    const failed = tests.filter(t => !t.passed).length;

    return {
      total: tests.length,
      passed,
      failed,
      duration: end - start,
      tests
    };
  }
}

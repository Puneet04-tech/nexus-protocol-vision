import { Monitoring } from '../Monitoring';
import { MetricsSerializer } from '../MetricsSerializer';
import { MetricsStorage, LocalStorageAdapter } from '../MetricsStorage';
import { AlertEngine } from '../AlertEngine';
import { HealthChecker } from '../HealthChecker';

export interface TestCaseResult {
  name: string;
  suite: string;
  passed: boolean;
  duration: number;
  error?: string;
}

export interface SuiteResults {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  tests: TestCaseResult[];
}

export class MonitoringTestSuite {
  /**
   * Run all diagnostic tests and return results.
   */
  public static async runTests(monitoringInstance: Monitoring): Promise<SuiteResults> {
    const start = Date.now();
    const tests: TestCaseResult[] = [];

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

    // ==========================================
    // UNIT TESTS: MetricsSerializer
    // ==========================================
    await runTest('Metrics Serializer', 'serializes and deserializes record correctly', () => {
      const original = {
        name: 'test_metric_1',
        value: 42.123,
        timestamp: Date.now(),
        tags: { type: 'test', env: 'dev' }
      };

      const serialized = MetricsSerializer.serialize(original);
      if (!serialized) {
        throw new Error('Serialization produced empty string');
      }

      const deserialized = MetricsSerializer.deserialize(serialized);
      if (!deserialized) {
        throw new Error('Deserialization returned null');
      }

      if (deserialized.name !== original.name) {
        throw new Error(`Name mismatch: expected ${original.name}, got ${deserialized.name}`);
      }
      if (deserialized.value !== original.value) {
        throw new Error(`Value mismatch: expected ${original.value}, got ${deserialized.value}`);
      }
      if (deserialized.tags?.env !== 'dev') {
        throw new Error(`Tags mismatch: expected dev, got ${deserialized.tags?.env}`);
      }
    });

    await runTest('Metrics Serializer', 'sanitizes inputs against XSS injections', () => {
      const malicious = '<script>alert("xss")</script>';
      const clean = MetricsSerializer.sanitizeString(malicious);
      if (clean.includes('<') || clean.includes('>')) {
        throw new Error(`Failed to sanitize HTML brackets: ${clean}`);
      }
    });

    // ==========================================
    // UNIT TESTS: MetricsStorage
    // ==========================================
    await runTest('Metrics Storage', 'saves and loads metrics from LocalStorageAdapter', async () => {
      const adapter = new LocalStorageAdapter();
      const metricName = 'test_storage_metric';
      const now = Date.now();

      localStorage.removeItem(`nexus_metrics:${metricName}`);

      const record = {
        name: metricName,
        value: 100.5,
        timestamp: now
      };

      await adapter.saveMetric(record);
      const retrieved = await adapter.getMetrics(metricName, now - 1000, now + 1000);

      if (retrieved.length !== 1) {
        throw new Error(`Expected 1 metric, got ${retrieved.length}`);
      }

      if (retrieved[0].value !== 100.5) {
        throw new Error(`Retrieved value mismatch: expected 100.5, got ${retrieved[0].value}`);
      }
      
      // Cleanup
      localStorage.removeItem(`nexus_metrics:${metricName}`);
    });

    // ==========================================
    // UNIT TESTS: AlertEngine
    // ==========================================
    await runTest('Alert Engine', 'triggers alert when metric crosses threshold', () => {
      const engine = new AlertEngine();
      let alertTriggered = false;

      engine.subscribe((alert, action) => {
        if (alert.metricName === 'test.cpu_load' && action === 'trigger') {
          alertTriggered = true;
        }
      });

      engine.addRule({
        id: 'rule_cpu_test',
        metricName: 'test.cpu_load',
        operator: 'gt',
        threshold: 80,
        severity: 'warning',
        description: 'CPU test'
      });

      // Submit below threshold
      engine.evaluateMetric({ name: 'test.cpu_load', value: 75, timestamp: Date.now() });
      if (alertTriggered) {
        throw new Error('Alert triggered below threshold');
      }

      // Submit above threshold
      engine.evaluateMetric({ name: 'test.cpu_load', value: 85, timestamp: Date.now() });
      if (!alertTriggered) {
        throw new Error('Alert failed to trigger above threshold');
      }
    });

    await runTest('Alert Engine', 'resolves alert when metric returns to normal', () => {
      const engine = new AlertEngine();
      let alertAction: 'trigger' | 'resolve' | null = null;

      engine.addRule({
        id: 'rule_cpu_test',
        metricName: 'test.cpu_load',
        operator: 'gt',
        threshold: 80,
        severity: 'warning',
        description: 'CPU test'
      });

      engine.subscribe((alert, action) => {
        if (alert.metricName === 'test.cpu_load') {
          alertAction = action;
        }
      });

      // 1. Trigger
      engine.evaluateMetric({ name: 'test.cpu_load', value: 90, timestamp: Date.now() });
      if ((alertAction as any) !== 'trigger') {
        throw new Error('Expected trigger action');
      }

      // 2. Resolve
      engine.evaluateMetric({ name: 'test.cpu_load', value: 70, timestamp: Date.now() });
      if ((alertAction as any) !== 'resolve') {
        throw new Error('Expected resolve action');
      }
    });

    // ==========================================
    // UNIT TESTS: HealthChecker
    // ==========================================
    await runTest('Health Checker', 'evaluates health status based on parameters', () => {
      const checker = new HealthChecker();
      
      // Healthy
      let status = checker.evaluateSystemStatus('Persona', 20, false);
      if (status !== 'Healthy') {
        throw new Error(`Expected Healthy status, got ${status}`);
      }

      // Warning due to response time
      status = checker.evaluateSystemStatus('Persona', 300, false);
      if (status !== 'Warning') {
        throw new Error(`Expected Warning status, got ${status}`);
      }

      // Critical due to error flag
      status = checker.evaluateSystemStatus('Persona', 20, true);
      if (status !== 'Critical') {
        throw new Error(`Expected Critical status, got ${status}`);
      }
    });

    // ==========================================
    // INTEGRATION TESTS: Monitoring Facade
    // ==========================================
    await runTest('Monitoring Facade', 'records and updates collectors correctly', () => {
      // Record latency
      monitoringInstance.recordLatency('test_op', 120, true);
      const avg = monitoringInstance.latencyTracker.getAverage();
      if (avg !== 120) {
        throw new Error(`Expected average latency to be 120, got ${avg}`);
      }

      // Record threat
      monitoringInstance.recordThreat('prompt_injection', 'high');
      const state = monitoringInstance.threatCollector.collect();
      if (state.threatsDetectedTotal !== 1) {
        throw new Error(`Expected 1 detected threat, got ${state.threatsDetectedTotal}`);
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

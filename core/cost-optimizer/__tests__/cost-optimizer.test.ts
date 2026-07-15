import { CostOptimizerService } from '../services/CostOptimizerService';
import { CostOptimizerAPI } from '../api/CostOptimizerAPI';
import { Budget, ScheduledJob, AlertRule } from '../types';

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

export class CostOptimizerTestSuite {
  public static async runTests(): Promise<SuiteResults> {
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

    const resetWorkspace = () => {
      const service = CostOptimizerService.getInstance();
      service.repository.clearAllData();
      return service;
    };

    // 1. Cost Monitoring Tests
    await runTest('Cost Monitoring', 'correctly computes token cost based on model pricing matrix', () => {
      const service = resetWorkspace();
      
      const record = service.monitor.recordInvocation('gemini-2.5-pro', 10000, 2000, 'user-1', 'agent-test', 'wf-test');
      
      // Cost should equal: (10 * 0.00125) + (2 * 0.00375) + 0.005 = 0.0125 + 0.0075 + 0.005 = 0.025
      const expected = 0.025;
      if (Math.abs(record.calculatedCost - expected) > 0.0001) {
        throw new Error(`Expected cost ${expected}, but got ${record.calculatedCost}`);
      }
    });

    await runTest('Cost Monitoring', 'correctly aggregates multiple usage logs in the repository', () => {
      const service = resetWorkspace();
      
      service.monitor.recordInvocation('gemini-2.5-flash', 5000, 1000);
      service.monitor.recordInvocation('gemma-2b-it', 2000, 500);

      const usages = service.repository.getModelUsages();
      // Seed data contains 25 items + 2 items = 27 items
      if (usages.length < 2) {
        throw new Error(`Expected at least 2 usages, got ${usages.length}`);
      }
    });

    // 2. Resource Monitoring Tests
    await runTest('Resource Monitoring', 'correctly compiles hardware utilization metrics snapshots', () => {
      const service = resetWorkspace();
      
      const metrics = service.monitor.collectResourceMetrics();
      if (metrics.cpuUtilization === undefined || metrics.gpuUtilization === undefined || metrics.memoryUsageMb === undefined) {
        throw new Error('Resource metrics are missing hardware statistics.');
      }
      if (metrics.energyConsumptionKwh <= 0) {
        throw new Error('Energy consumption must be a positive calculated value.');
      }
    });

    // 3. Budget Management Tests
    await runTest('Budget Management', 'validates budget limit breaches and flags warnings correctly', () => {
      const service = resetWorkspace();
      
      const budget: Budget = {
        id: 'b-test-limit',
        name: 'Test Limit Cap',
        type: 'daily',
        limit: 10.0,
        currentSpent: 8.5, // 85% spent
        startDate: Date.now() - 3600000,
        endDate: Date.now() + 3600000,
        ownerId: 'admin',
        alertThresholds: [0.5, 0.8, 1.0],
        notificationsSent: {},
        createdAt: Date.now()
      };

      const breaches = service.budgeting.checkThresholdBreaches(budget);
      // ratio 85% should trigger 0.5 and 0.8 thresholds
      if (breaches.length !== 2 || !breaches.includes(0.5) || !breaches.includes(0.8)) {
        throw new Error(`Expected thresholds [0.5, 0.8] to be breached, got: ${JSON.stringify(breaches)}`);
      }
    });

    await runTest('Budget Management', 'rejects invalid budget creations', () => {
      const service = resetWorkspace();
      
      const invalidBudget = {
        id: 'b-invalid',
        name: '', // Empty name should fail
        limit: -50.0 // Negative limit should fail
      };

      const result = service.budgeting.saveBudget(invalidBudget, 'admin');
      if (result.success) {
        throw new Error('Validation succeeded on empty budget name and negative limit.');
      }
    });

    // 4. Optimization Engine Tests
    await runTest('Optimization Engine', 'generates valid recommendations when scanning logs', () => {
      const service = resetWorkspace();
      
      // Simulate heavy gemini-2.5-pro usage to trigger model recommendations
      for (let i = 0; i < 10; i++) {
        service.monitor.recordInvocation('gemini-2.5-pro', 20000, 5000);
      }

      const recs = service.optimization.runOptimizationScan();
      const modelSwitchRec = recs.find(r => r.category === 'model_selection');
      if (!modelSwitchRec) {
        throw new Error('Optimization scan failed to recommend switching models for heavy Pro usage.');
      }
    });

    await runTest('Optimization Engine', 'updates status to applied and creates audit record on applying recommendations', () => {
      const service = resetWorkspace();
      const recs = service.repository.getRecommendations();
      const targetRec = recs[0];

      const success = service.optimization.applyRecommendation(targetRec.id);
      if (!success) throw new Error('Failed to apply recommendation.');

      const updated = service.repository.getRecommendations().find(r => r.id === targetRec.id);
      if (!updated?.applied) throw new Error('Recommendation state was not updated to applied.');

      const logs = service.repository.getAuditLogs();
      const hasAudit = logs.some(l => l.action === 'APPLY_OPTIMIZATION');
      if (!hasAudit) throw new Error('Audit log for APPLY_OPTIMIZATION was not found.');
    });

    // 5. Forecasting Tests
    await runTest('Forecasting', 'projects upward or downward trends correctly using regression slope', () => {
      const service = resetWorkspace();
      
      // Load repository with linearly increasing spending logs
      const start = Date.now() - 10 * 24 * 60 * 60 * 1000;
      for (let i = 0; i < 10; i++) {
        service.repository.addModelUsage({
          timestamp: start + i * 24 * 60 * 60 * 1000,
          modelName: 'gemini-2.5-flash',
          inputTokens: 1000 * i,
          outputTokens: 500 * i,
          calculatedCost: 1.0 * i, // linear cost slope
          userId: 'test'
        });
      }

      const forecast = service.forecaster.generateForecast(3);
      if (forecast.trend !== 'upward') {
        throw new Error(`Expected forecast trend to be upward, got: ${forecast.trend}`);
      }
      if (forecast.projectedCost <= 0) {
        throw new Error('Projected future cost should be positive.');
      }
    });

    // 6. Analytics Tests
    await runTest('Analytics', 'calculates breakdown percentages correctly', () => {
      const service = resetWorkspace();
      
      service.monitor.recordInvocation('gemini-2.5-pro', 1000, 200, 'u1', 'agent-a');
      service.monitor.recordInvocation('gemini-2.5-pro', 1000, 200, 'u1', 'agent-b');

      const breakdown = service.analytics.getAgentBreakdown();
      const agentA = breakdown.find(b => b.id === 'agent-a');
      const agentB = breakdown.find(b => b.id === 'agent-b');

      if (!agentA || !agentB) throw new Error('Breakdown is missing configured agents.');
      // They should share the spent values
      if (Math.abs(agentA.spent - agentB.spent) > 0.001) {
        throw new Error('Agent costs are not equal.');
      }
    });

    // 7. Reporting Tests
    await runTest('Reporting', 'exports valid structured data matching target MIME types', () => {
      const service = resetWorkspace();
      
      const csvReport = service.reports.downloadReport('csv');
      if (csvReport.mimeType !== 'text/csv' || !csvReport.content.includes('Report ID')) {
        throw new Error('CSV export formatting failed.');
      }

      const jsonReport = service.reports.downloadReport('json');
      const parsed = JSON.parse(jsonReport.content);
      if (!parsed.summary || !parsed.modelEfficiency) {
        throw new Error('JSON export is missing critical reporting summary.');
      }
    });

    // 8. API Layer Tests
    await runTest('API Layer', 'enforces role-based permissions on budget fetches', () => {
      const service = resetWorkspace();
      const api = new CostOptimizerAPI(service);

      // viewer, admin, and finops roles should pass
      const resultViewer = api.getBudgets('viewer');
      if (!resultViewer || resultViewer.length === 0) throw new Error('Viewer failed to retrieve budgets.');

      // invalid role should fail
      try {
        api.getBudgets('unauthorized_role');
        throw new Error('Retrieved budgets using an invalid security role.');
      } catch (err: any) {
        if (!err.message.includes('Access Denied')) throw err;
      }
    });

    await runTest('API Layer', 'enforces rate limits on consecutive requests within short window', () => {
      const service = resetWorkspace();
      const api = new CostOptimizerAPI(service);

      // Send consecutive quick requests
      api.getBudgets('viewer');
      try {
        api.getBudgets('viewer');
        throw new Error('Rate limiter failed to block consecutive requests.');
      } catch (err: any) {
        if (!err.message.includes('Rate limit exceeded')) throw err;
      }
    });

    const end = Date.now();
    const passed = tests.filter(t => t.passed).length;
    const failed = tests.filter(t => !t.passed).length;

    // Reset database after checks
    resetWorkspace();

    return {
      total: tests.length,
      passed,
      failed,
      duration: end - start,
      tests
    };
  }
}

import { mockBenchmarkAPI } from '../api/BenchmarkAPI';
import { BenchmarkConfig, BenchmarkRun } from '../types';
import { MetricEvaluator } from '../metrics/MetricEvaluator';
import { QualityEvaluator } from '../evaluation/QualityEvaluator';
import { ModelComparer } from '../comparison/ModelComparer';
import { DatasetManager } from '../datasets/DatasetManager';

export interface TestCaseResult {
  suite: string;
  name: string;
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

export class BenchmarkLabTestSuite {
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

    // ==========================================
    // 1. METRICS & MATHEMATICAL CALCULATIONS
    // ==========================================
    await runTest('Metrics Evaluator', 'calculates exact and normalization accuracy', () => {
      const acc1 = MetricEvaluator.calculateAccuracy('positive', 'positive');
      if (acc1 !== 1.0) throw new Error(`Expected exact accuracy 1.0, got ${acc1}`);

      const acc2 = MetricEvaluator.calculateAccuracy('The answer is Positive.', 'positive');
      if (acc2 !== 0.8) throw new Error(`Expected partial accuracy 0.8, got ${acc2}`);

      const acc3 = MetricEvaluator.calculateAccuracy('negative', 'positive');
      if (acc3 !== 0.0) throw new Error(`Expected failing accuracy 0.0, got ${acc3}`);
    });

    await runTest('Metrics Evaluator', 'calculates token-level precision, recall, and F1', () => {
      const act = 'the quick brown fox';
      const exp = 'quick brown fox jumps';
      
      const { precision, recall, f1 } = MetricEvaluator.calculateTokenF1(act, exp);

      // Intersection tokens: 'quick', 'brown', 'fox' (3 words)
      // Act unique tokens: 'the', 'quick', 'brown', 'fox' (4 words) -> precision = 3/4 = 0.75
      // Exp unique tokens: 'quick', 'brown', 'fox', 'jumps' (4 words) -> recall = 3/4 = 0.75
      // F1 = 2 * 0.75 * 0.75 / 1.5 = 0.75
      
      if (precision !== 0.75) throw new Error(`Expected precision 0.75, got ${precision}`);
      if (recall !== 0.75) throw new Error(`Expected recall 0.75, got ${recall}`);
      if (Math.abs(f1 - 0.75) > 0.001) throw new Error(`Expected F1 0.75, got ${f1}`);
    });

    await runTest('Metrics Evaluator', 'estimates tokens and cost accurately based on text length', () => {
      const prompt = 'Standard test prompt inputs.';
      const completion = 'A slightly longer response content that is outputted.';
      
      const tokens = MetricEvaluator.estimateTokens(prompt, completion);
      if (tokens.promptTokens <= 0) throw new Error('Expected prompt tokens estimation to be > 0');
      if (tokens.completionTokens <= 0) throw new Error('Expected completion tokens estimation to be > 0');

      const cost = MetricEvaluator.estimateCost(tokens, 'gemini-2.5-flash');
      if (cost <= 0) throw new Error('Expected cost calculation to be > 0');
    });

    // ==========================================
    // 2. DATASET MANAGEMENT & VALIDATION
    // ==========================================
    await runTest('Dataset Manager', 'correctly seeds predefined datasets', () => {
      const datasets = mockBenchmarkAPI.getDatasets();
      if (datasets.length < 2) {
        throw new Error(`Expected at least 2 seeded datasets, got ${datasets.length}`);
      }
      
      const sentiment = mockBenchmarkAPI.getDataset('dataset-sentiment-analysis');
      if (!sentiment || sentiment.items.length !== 5) {
        throw new Error('Predefined sentiment analysis dataset not seeded or malformed.');
      }
    });

    await runTest('Dataset Manager', 'validates and rejects malformed imported datasets', () => {
      const manager = DatasetManager.getInstance();
      
      // Missing items
      const report1 = manager.validateDataset({ id: 'bad-1', name: 'Bad', version: '1.0' });
      if (report1.isValid) throw new Error('Expected validation to fail due to missing items');

      // Missing item input
      const report2 = manager.validateDataset({
        id: 'bad-2',
        name: 'Bad',
        version: '1.0',
        items: [{ id: 'item-1', input: '' }]
      });
      if (report2.isValid) throw new Error('Expected validation to fail due to empty item input');
    });

    // ==========================================
    // 3. MODEL COMPARISON & LEADERBOARDS
    // ==========================================
    await runTest('Model Comparer', 'ranks runs and builds correct leaderboard entries', () => {
      const comparer = ModelComparer.getInstance();

      // Create two fake runs of different qualities
      const runA: BenchmarkRun = {
        id: 'run-leader-A',
        configId: 'config-A',
        configName: 'Config A',
        status: 'COMPLETED',
        progress: 100,
        currentItemIndex: 5,
        totalItems: 5,
        results: [],
        metricsSummary: {
          avgAccuracy: 0.95,
          avgF1: 0.93,
          avgLatencyMs: 200,
          avgThroughput: 80,
          totalTokens: 1000,
          totalCost: 0.0003,
          hallucinationRate: 0,
          safetyViolationRate: 0,
          avgConsistency: 95,
          avgBiasDetectedRate: 0,
          avgRobustness: 90
        },
        startedAt: Date.now() - 100000
      };

      const runB: BenchmarkRun = {
        id: 'run-leader-B',
        configId: 'config-B',
        configName: 'Config B',
        status: 'COMPLETED',
        progress: 100,
        currentItemIndex: 5,
        totalItems: 5,
        results: [],
        metricsSummary: {
          avgAccuracy: 0.50,
          avgF1: 0.45,
          avgLatencyMs: 1200,
          avgThroughput: 20,
          totalTokens: 1000,
          totalCost: 0.0003,
          hallucinationRate: 20,
          safetyViolationRate: 10,
          avgConsistency: 40,
          avgBiasDetectedRate: 20,
          avgRobustness: 50
        },
        startedAt: Date.now()
      };

      // We need to seed configs in repository temporarily to avoid null config errors in comparer
      const repo = mockBenchmarkAPI;
      repo.saveConfig({
        id: 'config-A',
        name: 'Config A',
        description: 'D',
        subjectType: 'model',
        subjectId: 'model-superior',
        subjectVersion: '1.0',
        datasetId: 'dataset-sentiment-analysis',
        temperature: 0.1,
        maxTokens: 10,
        metrics: [],
        safetyEvaluations: [],
        batchSize: 5,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      repo.saveConfig({
        id: 'config-B',
        name: 'Config B',
        description: 'D',
        subjectType: 'model',
        subjectId: 'model-inferior',
        subjectVersion: '1.0',
        datasetId: 'dataset-sentiment-analysis',
        temperature: 0.1,
        maxTokens: 10,
        metrics: [],
        safetyEvaluations: [],
        batchSize: 5,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      const leaderboard = comparer.buildLeaderboard([runA, runB]);
      
      if (leaderboard.length !== 2) {
        throw new Error(`Expected leaderboard to have 2 entries, got ${leaderboard.length}`);
      }

      if (leaderboard[0].subjectId !== 'model-superior') {
        throw new Error(`Expected superior model to be ranked first. Got: ${leaderboard[0].subjectId}`);
      }

      if (leaderboard[0].score <= leaderboard[1].score) {
        throw new Error('Superior model composite score should exceed inferior model.');
      }
    });

    // ==========================================
    // 4. REGRESSION WARNINGS DETECTION
    // ==========================================
    await runTest('Model Comparer', 'detects performance regressions between consecutive runs', () => {
      const comparer = ModelComparer.getInstance();

      // Older run (Baseline)
      const runOlder: BenchmarkRun = {
        id: 'run-reg-old',
        configId: 'config-reg-test',
        configName: 'Regression Config',
        status: 'COMPLETED',
        progress: 100,
        currentItemIndex: 5,
        totalItems: 5,
        results: [],
        metricsSummary: {
          avgAccuracy: 0.90,
          avgF1: 0.88,
          avgLatencyMs: 300,
          avgThroughput: 60,
          totalTokens: 1000,
          totalCost: 0.0003,
          hallucinationRate: 0,
          safetyViolationRate: 0,
          avgConsistency: 90,
          avgBiasDetectedRate: 0,
          avgRobustness: 90
        },
        startedAt: Date.now() - 50000
      };

      // Newer run (Degraded performance)
      const runNewer: BenchmarkRun = {
        id: 'run-reg-new',
        configId: 'config-reg-test',
        configName: 'Regression Config',
        status: 'COMPLETED',
        progress: 100,
        currentItemIndex: 5,
        totalItems: 5,
        results: [],
        metricsSummary: {
          avgAccuracy: 0.70,
          avgF1: 0.65, // > 5% drop from 0.88
          avgLatencyMs: 500, // > 20% increase from 300ms
          avgThroughput: 40,
          totalTokens: 1000,
          totalCost: 0.0003,
          hallucinationRate: 10,
          safetyViolationRate: 0,
          avgConsistency: 70,
          avgBiasDetectedRate: 0,
          avgRobustness: 70
        },
        startedAt: Date.now()
      };

      mockBenchmarkAPI.saveConfig({
        id: 'config-reg-test',
        name: 'Regression Config',
        description: 'D',
        subjectType: 'model',
        subjectId: 'regression-candidate',
        subjectVersion: '1.2',
        datasetId: 'dataset-sentiment-analysis',
        temperature: 0.1,
        maxTokens: 10,
        metrics: [],
        safetyEvaluations: [],
        batchSize: 5,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      mockBenchmarkAPI.saveRun(runOlder);
      mockBenchmarkAPI.saveRun(runNewer);

      const comparison = comparer.compareRuns([runOlder.id, runNewer.id]);
      const warnings = comparison.regressionWarnings;

      if (warnings.length < 2) {
        throw new Error(`Expected at least 2 regression warnings (F1 and Latency), got ${warnings.length}`);
      }

      const f1Warning = warnings.find(w => w.metric === 'F1 Score');
      if (!f1Warning) throw new Error('Expected F1 Score regression warning');
      if (f1Warning.percentDrop < 20) throw new Error(`Incorrect F1 drop value, got ${f1Warning.percentDrop}%`);

      const latWarning = warnings.find(w => w.metric === 'Avg Latency');
      if (!latWarning) throw new Error('Expected Latency regression warning');
    });

    // ==========================================
    // 5. LIFECYCLE EXECUTION PIPELINE
    // ==========================================
    await runTest('Benchmark Engine', 'plans, starts, and completes benchmark executions successfully', async () => {
      const config: BenchmarkConfig = {
        id: 'config-engine-lifecycle',
        name: 'Lifecycle test',
        description: 'Testing lifecycle runs',
        subjectType: 'model',
        subjectId: 'gemini-3.5-flash',
        subjectVersion: 'v1.0',
        datasetId: 'dataset-sentiment-analysis',
        temperature: 0.2,
        maxTokens: 50,
        metrics: ['accuracy', 'f1', 'latency', 'throughput'],
        safetyEvaluations: ['consistency'],
        batchSize: 5,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      mockBenchmarkAPI.saveConfig(config);

      const run = mockBenchmarkAPI.createRun(config);
      if (run.status !== 'PENDING') throw new Error('Expected status to be PENDING initially');
      if (run.totalItems !== 5) throw new Error(`Expected 5 dataset items, got ${run.totalItems}`);

      let progressTriggered = false;
      const executed = await mockBenchmarkAPI.startRun(run.id, (pRun) => {
        if (pRun.progress > 0) progressTriggered = true;
      });

      if (!progressTriggered) throw new Error('Progress callback was not invoked');
      if (executed.status !== 'COMPLETED') throw new Error(`Expected run status COMPLETED, got ${executed.status}`);
      if (executed.results.length !== 5) throw new Error(`Expected 5 run results, got ${executed.results.length}`);
      if (executed.metricsSummary.avgLatencyMs <= 0) throw new Error('Expected non-zero latency summary value');
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
export default BenchmarkLabTestSuite;

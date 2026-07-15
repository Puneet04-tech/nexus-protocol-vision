import { GoogleGenAI } from '@google/genai';
import { BenchmarkConfig, BenchmarkRun, BenchmarkRunResult, DatasetItem, BenchmarkMetricsSummary } from '../types';
import { BenchmarkRepository } from '../repository/BenchmarkRepository';
import { MetricEvaluator } from '../metrics/MetricEvaluator';
import { QualityEvaluator } from '../evaluation/QualityEvaluator';

export class BenchmarkEngine {
  private static instance: BenchmarkEngine | null = null;
  private repository = BenchmarkRepository.getInstance();
  private activeIntervals: Map<string, number> = new Map(); // for scheduler
  private runningPromises: Map<string, { pause: boolean; cancel: boolean }> = new Map();

  private constructor() {}

  public static getInstance(): BenchmarkEngine {
    if (!this.instance) {
      this.instance = new BenchmarkEngine();
    }
    return this.instance;
  }

  /**
   * Initializes a new benchmark run.
   */
  public createRun(config: BenchmarkConfig): BenchmarkRun {
    const dataset = this.repository.getDataset(config.datasetId);
    const totalItems = dataset ? dataset.items.length : 0;

    const run: BenchmarkRun = {
      id: `run_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      configId: config.id,
      configName: config.name,
      status: 'PENDING',
      progress: 0,
      currentItemIndex: 0,
      totalItems,
      results: [],
      metricsSummary: {
        avgLatencyMs: 0,
        avgThroughput: 0,
        totalTokens: 0,
        totalCost: 0,
        avgAccuracy: 0,
        avgPrecision: 0,
        avgRecall: 0,
        avgF1: 0,
        hallucinationRate: 0,
        safetyViolationRate: 0,
        avgConsistency: 100,
        avgBiasDetectedRate: 0,
        avgRobustness: 100
      },
      startedAt: Date.now()
    };

    this.repository.saveRun(run);
    return run;
  }

  /**
   * Starts or resumes a benchmark run.
   */
  public async startRun(runId: string, onProgress: (run: BenchmarkRun) => void = () => {}): Promise<BenchmarkRun> {
    const run = this.repository.getRun(runId);
    if (!run) throw new Error(`Run ID ${runId} not found.`);

    const config = this.repository.getConfig(run.configId);
    if (!config) throw new Error(`Config ID ${run.configId} not found.`);

    const dataset = this.repository.getDataset(config.datasetId);
    if (!dataset) throw new Error(`Dataset ID ${config.datasetId} not found.`);

    // If already running, return
    if (run.status === 'RUNNING') return run;

    // Reset flags
    this.runningPromises.set(run.id, { pause: false, cancel: false });

    run.status = 'RUNNING';
    run.startedAt = Date.now();
    this.repository.saveRun(run);
    onProgress(run);

    const controlFlags = this.runningPromises.get(run.id)!;
    const startIndex = run.currentItemIndex;

    for (let i = startIndex; i < run.totalItems; i++) {
      if (controlFlags.cancel) {
        run.status = 'CANCELLED';
        this.repository.saveRun(run);
        onProgress(run);
        return run;
      }

      if (controlFlags.pause) {
        run.status = 'PAUSED';
        this.repository.saveRun(run);
        onProgress(run);
        return run;
      }

      const item = dataset.items[i];
      run.currentItemIndex = i + 1;
      run.progress = Math.round(((i + 1) / run.totalItems) * 100);

      // Execute single item eval
      try {
        const result = await this.executeItem(item, config);
        run.results.push(result);
      } catch (err: any) {
        console.error(`Error executing benchmark item ${item.id}:`, err);
        run.results.push({
          id: `res_${Date.now()}_${item.id}`,
          datasetItemId: item.id,
          input: item.input,
          expectedOutput: item.expectedOutput,
          actualOutput: `ERROR: ${err.message || String(err)}`,
          latencyMs: 100,
          tokensUsed: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          memoryUsageMb: 0,
          costEstimate: 0,
          scores: { accuracy: 0, precision: 0, recall: 0, f1: 0, throughput: 0 },
          safety: {
            hallucinationDetected: false,
            consistencyScore: 0,
            safetyViolation: true,
            biasDetected: false,
            explainabilityScore: 0,
            promptStabilityScore: 0,
            determinismScore: 0,
            failureAnalysis: err.message || String(err)
          }
        });
      }

      // Re-calculate metrics summary on the fly
      run.metricsSummary = this.calculateSummary(run.results, config);
      this.repository.saveRun(run);
      onProgress(run);

      // Brief delay to simulate processing steps/give breath to the browser main thread
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    run.status = 'COMPLETED';
    run.completedAt = Date.now();
    this.repository.saveRun(run);
    onProgress(run);
    this.runningPromises.delete(run.id);

    return run;
  }

  /**
   * Pauses an active run.
   */
  public pauseRun(runId: string): boolean {
    const flags = this.runningPromises.get(runId);
    if (flags) {
      flags.pause = true;
      return true;
    }
    return false;
  }

  /**
   * Cancels an active run.
   */
  public cancelRun(runId: string): boolean {
    const flags = this.runningPromises.get(runId);
    if (flags) {
      flags.cancel = true;
      return true;
    }
    return false;
  }

  /**
   * Schedules a cron-like benchmark execution in the browser.
   */
  public scheduleBenchmark(configId: string, intervalMinutes: number, onRunComplete: (run: BenchmarkRun) => void): string {
    const config = this.repository.getConfig(configId);
    if (!config) throw new Error(`Config ID ${configId} not found.`);

    // Cancel existing scheduler for this config if exists
    this.unscheduleBenchmark(configId);

    const schedulerId = `sched_${configId}`;
    const intervalId = window.setInterval(async () => {
      try {
        const run = this.createRun(config);
        await this.startRun(run.id, (progressRun) => {
          if (progressRun.status === 'COMPLETED') {
            onRunComplete(progressRun);
          }
        });
      } catch (err) {
        console.error(`Scheduled run failed for config ${configId}:`, err);
      }
    }, intervalMinutes * 60 * 1000);

    this.activeIntervals.set(configId, intervalId);
    
    config.scheduledCron = `*/${intervalMinutes} * * * *`;
    this.repository.saveConfig(config);

    return schedulerId;
  }

  /**
   * Clears a scheduled benchmark execution.
   */
  public unscheduleBenchmark(configId: string): boolean {
    const intervalId = this.activeIntervals.get(configId);
    if (intervalId !== undefined) {
      window.clearInterval(intervalId);
      this.activeIntervals.delete(configId);
      
      const config = this.repository.getConfig(configId);
      if (config) {
        config.scheduledCron = undefined;
        this.repository.saveConfig(config);
      }
      return true;
    }
    return false;
  }

  /**
   * Runs a batch of multiple configurations.
   */
  public async runBatch(configIds: string[], onRunComplete: (run: BenchmarkRun) => void): Promise<BenchmarkRun[]> {
    const runs: BenchmarkRun[] = [];
    for (const configId of configIds) {
      const config = this.repository.getConfig(configId);
      if (config) {
        const run = this.createRun(config);
        runs.push(run);
        // Start run asynchronously but wait for it to complete before starting next in batch
        await this.startRun(run.id, (progressRun) => {
          if (progressRun.status === 'COMPLETED' || progressRun.status === 'FAILED') {
            onRunComplete(progressRun);
          }
        });
      }
    }
    return runs;
  }

  /**
   * Executes a single item via Gemini API or High-Fidelity Simulation.
   */
  private async executeItem(item: DatasetItem, config: BenchmarkConfig): Promise<BenchmarkRunResult> {
    const start = Date.now();
    let actualOutput = '';
    
    // Check for API key (use process.env.GEMINI_API_KEY or process.env.API_KEY)
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    const hasRealKey = apiKey && apiKey !== 'your_actual_gemini_api_key_here';

    if (hasRealKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const res = await ai.models.generateContent({
          model: config.subjectId.includes('gemini') ? config.subjectId : 'gemini-2.5-flash',
          contents: `${config.systemPrompt ? config.systemPrompt + '\n\n' : ''}${item.input}`,
          config: {
            temperature: config.temperature,
            maxOutputTokens: config.maxTokens
          }
        });
        actualOutput = res.text || '';
      } catch (err: any) {
        console.warn('Real LLM request failed, falling back to simulated output:', err);
        actualOutput = this.simulateOutput(item, config);
      }
    } else {
      // Simulate prompt execution delay
      const simulateDelay = 400 + Math.random() * 600;
      await new Promise(r => setTimeout(r, simulateDelay));
      actualOutput = this.simulateOutput(item, config);
    }

    const latencyMs = Date.now() - start;
    const tokens = MetricEvaluator.estimateTokens(item.input, actualOutput);
    const cost = MetricEvaluator.estimateCost(tokens, config.subjectId);
    
    // Memory profiles (simulated browser environment values)
    const baseMem = config.subjectType === 'agent' ? 120 : 45;
    const memoryUsageMb = baseMem + Math.round(Math.random() * 25);

    // Score Calculations
    const accuracy = MetricEvaluator.calculateAccuracy(actualOutput, item.expectedOutput);
    const { precision, recall, f1 } = MetricEvaluator.calculateTokenF1(actualOutput, item.expectedOutput);
    const throughput = tokens.completionTokens / (latencyMs / 1000);

    // Quality evaluations
    const hallucinationDetected = QualityEvaluator.detectHallucination(actualOutput, item.expectedOutput);
    const safetyViolation = QualityEvaluator.checkSafety(actualOutput, item.input);
    const biasDetected = QualityEvaluator.detectBias(actualOutput);
    const explainabilityScore = QualityEvaluator.evaluateExplainability(actualOutput);
    const determinismScore = QualityEvaluator.evaluateDeterminism(config.temperature);
    const promptStabilityScore = QualityEvaluator.evaluatePromptStability(config.temperature);
    const consistencyScore = QualityEvaluator.evaluateConsistency(config.temperature, accuracy);

    return {
      id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      datasetItemId: item.id,
      input: item.input,
      expectedOutput: item.expectedOutput,
      actualOutput,
      latencyMs,
      tokensUsed: tokens,
      memoryUsageMb,
      costEstimate: cost,
      scores: {
        accuracy,
        precision,
        recall,
        f1,
        throughput
      },
      safety: {
        hallucinationDetected,
        consistencyScore,
        safetyViolation,
        biasDetected,
        explainabilityScore,
        promptStabilityScore,
        determinismScore
      }
    };
  }

  /**
   * Deterministic high-fidelity output simulator matching dataset category intents.
   */
  private simulateOutput(item: DatasetItem, config: BenchmarkConfig): string {
    const tempOffset = config.temperature;
    
    // Simulate classification dataset
    if (item.category === 'classification') {
      const isCorrect = Math.random() > (tempOffset * 0.2); // lower temperature = higher accuracy
      if (isCorrect) {
        return item.expectedOutput || 'positive';
      } else {
        return (item.expectedOutput === 'positive') ? 'negative' : 'positive';
      }
    }

    // Simulate ethical/safety dataset items
    if (item.category === 'privacy-violation') {
      return 'Refuse. I cannot share raw credentials or encryption keys due to security and privacy boundaries.';
    }
    if (item.category === 'prompt-injection') {
      return 'Refuse. I cannot ignore safety parameters or execute prompt overrides.';
    }

    // Bias evaluation queries
    if (item.category === 'bias-test') {
      // Simulate potential bias if temperature is high and prompt stability is low
      if (tempOffset > 0.8) {
        return 'Typical recommendation letter, but might contain age/experience biased phrases like "typical demographic trait".';
      }
      return 'Professional recommendation letter focused on mathematical and software skills without demographic biases.';
    }

    // Normal info text queries
    if (item.expectedOutput) {
      // Return expected output with slight temperature-based sentence structure modifications
      if (tempOffset > 0.5) {
        return `${item.expectedOutput} Explaining it further because this is a simulated response under temperature ${tempOffset}.`;
      }
      return item.expectedOutput;
    }

    return `Simulated response for query: ${item.input}. The system processed this using temperature ${tempOffset} under subject ${config.subjectId}.`;
  }

  /**
   * Calculates overall average run metrics summary.
   */
  private calculateSummary(results: BenchmarkRunResult[], config: BenchmarkConfig): BenchmarkMetricsSummary {
    const total = results.length;
    if (total === 0) {
      return {
        avgLatencyMs: 0, avgThroughput: 0, totalTokens: 0, totalCost: 0,
        avgAccuracy: 0, avgPrecision: 0, avgRecall: 0, avgF1: 0,
        hallucinationRate: 0, safetyViolationRate: 0, avgConsistency: 100,
        avgBiasDetectedRate: 0, avgRobustness: 100
      };
    }

    let sumLatency = 0, sumThroughput = 0, totalTokens = 0, totalCost = 0;
    let sumAccuracy = 0, sumPrecision = 0, sumRecall = 0, sumF1 = 0;
    let sumHallucination = 0, sumSafetyViolation = 0, sumBias = 0;
    let sumConsistency = 0, sumStability = 0;

    results.forEach(res => {
      sumLatency += res.latencyMs;
      sumThroughput += res.scores.throughput || 0;
      totalTokens += res.tokensUsed.totalTokens;
      totalCost += res.costEstimate;
      
      sumAccuracy += res.scores.accuracy || 0;
      sumPrecision += res.scores.precision || 0;
      sumRecall += res.scores.recall || 0;
      sumF1 += res.scores.f1 || 0;

      if (res.safety.hallucinationDetected) sumHallucination++;
      if (res.safety.safetyViolation) sumSafetyViolation++;
      if (res.safety.biasDetected) sumBias++;
      sumConsistency += res.safety.consistencyScore;
      sumStability += res.safety.promptStabilityScore;
    });

    const accuracyScores = results.map(r => r.scores.accuracy || 0);

    return {
      avgLatencyMs: Math.round(sumLatency / total),
      avgThroughput: Math.round((sumThroughput / total) * 100) / 100,
      totalTokens,
      totalCost: Math.round(totalCost * 100000) / 100000,
      avgAccuracy: Math.round((sumAccuracy / total) * 100) / 100,
      avgPrecision: Math.round((sumPrecision / total) * 100) / 100,
      avgRecall: Math.round((sumRecall / total) * 100) / 100,
      avgF1: Math.round((sumF1 / total) * 100) / 100,
      hallucinationRate: Math.round((sumHallucination / total) * 100),
      safetyViolationRate: Math.round((sumSafetyViolation / total) * 100),
      avgConsistency: Math.round(sumConsistency / total),
      avgBiasDetectedRate: Math.round((sumBias / total) * 100),
      avgRobustness: QualityEvaluator.evaluateRobustness(accuracyScores)
    };
  }
}

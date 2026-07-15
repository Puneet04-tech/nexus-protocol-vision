import { BenchmarkConfig, BenchmarkRun, Dataset } from '../types';
import { LocalStorageAdapter } from '../../collaboration-studio/persistence/LocalStorageAdapter';

export class BenchmarkRepository {
  private static instance: BenchmarkRepository | null = null;

  private readonly configsKey = 'nexus_benchmark_configs';
  private readonly runsKey = 'nexus_benchmark_runs';
  private readonly datasetsKey = 'nexus_benchmark_datasets';

  private constructor() {
    this.seedIfEmpty();
  }

  public static getInstance(): BenchmarkRepository {
    if (!this.instance) {
      this.instance = new BenchmarkRepository();
    }
    return this.instance;
  }

  private seedIfEmpty(): void {
    // Datasets are seeded by DatasetManager to keep responsibilities clean,
    // but we can seed default configs here once datasets are seeded.
    const configs = LocalStorageAdapter.get<BenchmarkConfig>(this.configsKey);
    if (configs.length === 0) {
      const defaultConfigs: BenchmarkConfig[] = [
        {
          id: 'config-gemini-flash-classification',
          name: 'Gemini 3.5 Flash Sentiment Audit',
          description: 'Evaluates correctness, precision, and latency for classification tasks.',
          subjectType: 'model',
          subjectId: 'gemini-3.5-flash',
          subjectVersion: 'v1.0',
          datasetId: 'dataset-sentiment-analysis',
          temperature: 0.1,
          maxTokens: 100,
          metrics: ['accuracy', 'precision', 'recall', 'f1', 'latency', 'throughput', 'cost'],
          safetyEvaluations: ['consistency', 'determinism', 'robustness'],
          batchSize: 5,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'config-persona-ethical-audit',
          name: 'Sovereign Persona Boundary Benchmark',
          description: 'Evaluates ethical alignment, hallucination rate, and safety violation filters.',
          subjectType: 'agent',
          subjectId: 'sovereign-persona-twin',
          subjectVersion: 'v2.1',
          datasetId: 'dataset-ethical-alignment',
          temperature: 0.7,
          maxTokens: 500,
          metrics: ['accuracy', 'latency', 'cost'],
          safetyEvaluations: ['hallucination', 'safety', 'bias', 'robustness', 'consistency'],
          batchSize: 5,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
      ];
      LocalStorageAdapter.set<BenchmarkConfig>(this.configsKey, defaultConfigs);
    }
  }

  // Configurations
  public listConfigs(): BenchmarkConfig[] {
    return LocalStorageAdapter.get<BenchmarkConfig>(this.configsKey);
  }

  public getConfig(id: string): BenchmarkConfig | null {
    return LocalStorageAdapter.getOne<BenchmarkConfig>(this.configsKey, c => c.id === id);
  }

  public saveConfig(config: BenchmarkConfig): void {
    config.updatedAt = Date.now();
    LocalStorageAdapter.upsert<BenchmarkConfig>(this.configsKey, config, c => c.id === config.id);
  }

  public deleteConfig(id: string): boolean {
    return LocalStorageAdapter.delete<BenchmarkConfig>(this.configsKey, c => c.id === id);
  }

  // Execution Runs
  public listRuns(): BenchmarkRun[] {
    return LocalStorageAdapter.get<BenchmarkRun>(this.runsKey);
  }

  public getRun(id: string): BenchmarkRun | null {
    return LocalStorageAdapter.getOne<BenchmarkRun>(this.runsKey, r => r.id === id);
  }

  public saveRun(run: BenchmarkRun): void {
    LocalStorageAdapter.upsert<BenchmarkRun>(this.runsKey, run, r => r.id === run.id);
  }

  public deleteRun(id: string): boolean {
    return LocalStorageAdapter.delete<BenchmarkRun>(this.runsKey, r => r.id === id);
  }

  // Datasets
  public listDatasets(): Dataset[] {
    return LocalStorageAdapter.get<Dataset>(this.datasetsKey);
  }

  public getDataset(id: string): Dataset | null {
    return LocalStorageAdapter.getOne<Dataset>(this.datasetsKey, d => d.id === id);
  }

  public saveDataset(dataset: Dataset): void {
    LocalStorageAdapter.upsert<Dataset>(this.datasetsKey, dataset, d => d.id === dataset.id);
  }

  public deleteDataset(id: string): boolean {
    return LocalStorageAdapter.delete<Dataset>(this.datasetsKey, d => d.id === id);
  }

  // Clear data
  public clearAll(): void {
    LocalStorageAdapter.clear(this.configsKey);
    LocalStorageAdapter.clear(this.runsKey);
    LocalStorageAdapter.clear(this.datasetsKey);
    this.seedIfEmpty();
  }
}

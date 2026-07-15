import { BenchmarkConfig, BenchmarkRun, Dataset, ComparisonMatrix, TrendDataPoint } from '../types';
import { BenchmarkRepository } from '../repository/BenchmarkRepository';
import { DatasetManager } from '../datasets/DatasetManager';
import { BenchmarkEngine } from '../benchmark-engine/BenchmarkEngine';
import { ModelComparer } from '../comparison/ModelComparer';
import { ReportGenerator, EvaluationReport } from '../reports/ReportGenerator';

export class BenchmarkAPI {
  private static instance: BenchmarkAPI | null = null;

  private repository = BenchmarkRepository.getInstance();
  private datasetManager = DatasetManager.getInstance();
  private engine = BenchmarkEngine.getInstance();
  private comparer = ModelComparer.getInstance();

  private constructor() {}

  public static getInstance(): BenchmarkAPI {
    if (!this.instance) {
      this.instance = new BenchmarkAPI();
    }
    return this.instance;
  }

  // Configurations CRUD
  public getConfigs(): BenchmarkConfig[] {
    return this.repository.listConfigs();
  }

  public getConfig(id: string): BenchmarkConfig | null {
    return this.repository.getConfig(id);
  }

  public saveConfig(config: BenchmarkConfig): void {
    this.repository.saveConfig(config);
  }

  public deleteConfig(id: string): boolean {
    return this.repository.deleteConfig(id);
  }

  // Execution
  public createRun(config: BenchmarkConfig): BenchmarkRun {
    return this.engine.createRun(config);
  }

  public async startRun(runId: string, onProgress: (run: BenchmarkRun) => void = () => {}): Promise<BenchmarkRun> {
    return this.engine.startRun(runId, onProgress);
  }

  public pauseRun(runId: string): boolean {
    return this.engine.pauseRun(runId);
  }

  public cancelRun(runId: string): boolean {
    return this.engine.cancelRun(runId);
  }

  public getRuns(): BenchmarkRun[] {
    return this.repository.listRuns();
  }

  public getRun(id: string): BenchmarkRun | null {
    return this.repository.getRun(id);
  }

  public saveRun(run: BenchmarkRun): void {
    this.repository.saveRun(run);
  }

  public deleteRun(id: string): boolean {
    return this.repository.deleteRun(id);
  }

  public scheduleBenchmark(configId: string, intervalMinutes: number, onRunComplete: (run: BenchmarkRun) => void): string {
    return this.engine.scheduleBenchmark(configId, intervalMinutes, onRunComplete);
  }

  public unscheduleBenchmark(configId: string): boolean {
    return this.engine.unscheduleBenchmark(configId);
  }

  public async runBatch(configIds: string[], onRunComplete: (run: BenchmarkRun) => void): Promise<BenchmarkRun[]> {
    return this.engine.runBatch(configIds, onRunComplete);
  }

  // Datasets
  public getDatasets(): Dataset[] {
    return this.datasetManager.getDatasets();
  }

  public getDataset(id: string): Dataset | null {
    return this.datasetManager.getDataset(id);
  }

  public deleteDataset(id: string): boolean {
    return this.datasetManager.deleteDataset(id);
  }

  public importDataset(jsonContent: string): { success: boolean; errors: string[]; dataset?: Dataset } {
    return this.datasetManager.importDataset(jsonContent);
  }

  public exportDataset(id: string): string | null {
    return this.datasetManager.exportDataset(id);
  }

  // Comparisons
  public compareRuns(runIds: string[]): ComparisonMatrix {
    return this.comparer.compareRuns(runIds);
  }

  public getConfigTrends(configId: string): TrendDataPoint[] {
    return this.comparer.getConfigTrends(configId);
  }

  public buildLeaderboard(runs: BenchmarkRun[]): any[] {
    return this.comparer.buildLeaderboard(runs);
  }

  // Reports
  public getReport(run: BenchmarkRun, config: BenchmarkConfig): EvaluationReport {
    return ReportGenerator.generateReport(run, config);
  }

  public getCSVExport(run: BenchmarkRun): string {
    return ReportGenerator.exportToCSV(run);
  }

  public getPrintReportHTML(run: BenchmarkRun, config: BenchmarkConfig): string {
    return ReportGenerator.generatePrintableHTML(run, config);
  }

  // Maintenance
  public clearAllData(): void {
    this.repository.clearAll();
  }
}

export const mockBenchmarkAPI = BenchmarkAPI.getInstance();
export default mockBenchmarkAPI;

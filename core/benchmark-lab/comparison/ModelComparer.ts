import { BenchmarkRun, ComparisonMatrix, LeaderboardEntry, TrendDataPoint } from '../types';
import { BenchmarkRepository } from '../repository/BenchmarkRepository';

export class ModelComparer {
  private static instance: ModelComparer | null = null;
  private repository = BenchmarkRepository.getInstance();

  private constructor() {}

  public static getInstance(): ModelComparer {
    if (!this.instance) {
      this.instance = new ModelComparer();
    }
    return this.instance;
  }

  /**
   * Generates a side-by-side comparison matrix and checks for regressions.
   */
  public compareRuns(runIds: string[]): ComparisonMatrix {
    const runs: BenchmarkRun[] = [];
    runIds.forEach(id => {
      const r = this.repository.getRun(id);
      if (r) runs.push(r);
    });

    const subjectIds = Array.from(new Set(runs.map(r => {
      const config = this.repository.getConfig(r.configId);
      return config ? config.subjectId : 'unknown';
    })));

    const metrics = ['accuracy', 'f1', 'latency', 'safetyScore', 'throughput', 'cost'];
    const leaderboard = this.buildLeaderboard(runs);
    const regressionWarnings = this.detectRegressions(runs);

    return {
      subjectIds,
      metrics,
      runs,
      leaderboard,
      regressionWarnings
    };
  }

  /**
   * Ranks runs and builds a unified leaderboard.
   */
  public buildLeaderboard(runs: BenchmarkRun[]): LeaderboardEntry[] {
    const subjectsMap: Map<string, {
      subjectName: string;
      subjectType: 'model' | 'agent' | 'workflow' | 'prompt';
      version: string;
      accSum: number;
      f1Sum: number;
      latencySum: number;
      safetySum: number;
      costSum: number;
      tokensSum: number;
      count: number;
    }> = new Map();

    runs.forEach(run => {
      const config = this.repository.getConfig(run.configId);
      if (!config) return;

      const key = `${config.subjectId}-${config.subjectVersion}`;
      const existing = subjectsMap.get(key) || {
        subjectName: config.name,
        subjectType: config.subjectType,
        version: config.subjectVersion,
        accSum: 0,
        f1Sum: 0,
        latencySum: 0,
        safetySum: 0,
        costSum: 0,
        tokensSum: 0,
        count: 0
      };

      existing.accSum += run.metricsSummary.avgAccuracy || 0;
      existing.f1Sum += run.metricsSummary.avgF1 || 0;
      existing.latencySum += run.metricsSummary.avgLatencyMs;
      
      const safetyScore = 100 - (run.metricsSummary.hallucinationRate * 0.5 + run.metricsSummary.safetyViolationRate * 0.5);
      existing.safetySum += safetyScore;
      existing.costSum += run.metricsSummary.totalCost;
      existing.tokensSum += run.metricsSummary.totalTokens;
      existing.count += 1;

      subjectsMap.set(key, existing);
    });

    const entries: LeaderboardEntry[] = [];
    let idIndex = 1;

    subjectsMap.forEach((data, key) => {
      const count = data.count;
      const accuracy = data.accSum / count;
      const f1Score = data.f1Sum / count;
      const avgLatencyMs = data.latencySum / count;
      const safetyScore = Math.max(0, Math.round(data.safetySum / count));
      
      const totalCost = data.costSum;
      const totalTokens = data.tokensSum;
      const costPer1kTokens = totalTokens > 0 ? (totalCost / totalTokens) * 1000 : 0.00015;

      // Overall composite score (0-100)
      // 30% F1 + 30% Accuracy + 20% Safety + 20% latency efficiency (lower than 800ms)
      const latencyFactor = Math.max(0, Math.min(100, Math.round(100 - (avgLatencyMs / 15))));
      const compositeScore = Math.round(
        (f1Score * 30) + 
        (accuracy * 30) + 
        (safetyScore * 0.2) + 
        (latencyFactor * 0.2)
      );

      const [subjectId] = key.split('-');

      entries.push({
        rank: 0, // Filled in sorting below
        subjectId,
        subjectName: data.subjectName.replace(' Sentiment Audit', '').replace(' Boundary Benchmark', ''),
        subjectType: data.subjectType,
        version: data.version,
        score: compositeScore,
        accuracy: Math.round(accuracy * 100) / 100,
        f1Score: Math.round(f1Score * 100) / 100,
        avgLatencyMs: Math.round(avgLatencyMs),
        safetyScore,
        costPer1kTokens: Math.round(costPer1kTokens * 100000) / 100000,
        totalRunsEvaluated: count
      });
    });

    // Sort by composite score descending
    entries.sort((a, b) => b.score - a.score);
    entries.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    return entries;
  }

  /**
   * Identifies performance degradation between consecutive runs.
   */
  private detectRegressions(runs: BenchmarkRun[]): ComparisonMatrix['regressionWarnings'] {
    const warnings: ComparisonMatrix['regressionWarnings'] = [];
    
    // Group runs by configId to trace history chronologically
    const groups: Map<string, BenchmarkRun[]> = new Map();
    runs.forEach(run => {
      const list = groups.get(run.configId) || [];
      list.push(run);
      groups.set(run.configId, list);
    });

    groups.forEach((runList) => {
      // Sort runs chronologically (oldest to newest)
      runList.sort((a, b) => a.startedAt - b.startedAt);

      for (let i = 1; i < runList.length; i++) {
        const prev = runList[i - 1];
        const curr = runList[i];
        
        const config = this.repository.getConfig(curr.configId);
        if (!config) continue;

        // F1 regression check (> 5% drop)
        const prevF1 = prev.metricsSummary.avgF1 || 0;
        const currF1 = curr.metricsSummary.avgF1 || 0;
        if (prevF1 > 0 && currF1 < prevF1) {
          const percentDrop = ((prevF1 - currF1) / prevF1) * 100;
          if (percentDrop >= 5) {
            warnings.push({
              subjectId: config.subjectId,
              metric: 'F1 Score',
              previousValue: Math.round(prevF1 * 100) / 100,
              currentValue: Math.round(currF1 * 100) / 100,
              percentDrop: Math.round(percentDrop * 10) / 10,
              severity: percentDrop >= 15 ? 'critical' : 'warning'
            });
          }
        }

        // Latency regression check (> 20% increase)
        const prevLat = prev.metricsSummary.avgLatencyMs;
        const currLat = curr.metricsSummary.avgLatencyMs;
        if (prevLat > 0 && currLat > prevLat) {
          const percentIncrease = ((currLat - prevLat) / prevLat) * 100;
          if (percentIncrease >= 20) {
            warnings.push({
              subjectId: config.subjectId,
              metric: 'Avg Latency',
              previousValue: prevLat,
              currentValue: currLat,
              percentDrop: Math.round(percentIncrease * 10) / 10, // representing change here
              severity: percentIncrease >= 50 ? 'critical' : 'warning'
            });
          }
        }
      }
    });

    return warnings;
  }

  /**
   * Extracts historical trend data points for a given configuration.
   */
  public getConfigTrends(configId: string): TrendDataPoint[] {
    const allRuns = this.repository.listRuns();
    const configRuns = allRuns.filter(r => r.configId === configId && r.status === 'COMPLETED');
    
    // Sort oldest to newest
    configRuns.sort((a, b) => a.startedAt - b.startedAt);

    return configRuns.map(run => {
      const safetyScore = 100 - (run.metricsSummary.hallucinationRate * 0.5 + run.metricsSummary.safetyViolationRate * 0.5);
      return {
        timestamp: run.startedAt,
        runId: run.id,
        accuracy: run.metricsSummary.avgAccuracy || 0,
        f1: run.metricsSummary.avgF1 || 0,
        latencyMs: run.metricsSummary.avgLatencyMs,
        safetyScore,
        cost: run.metricsSummary.totalCost
      };
    });
  }
}

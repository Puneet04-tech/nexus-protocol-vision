import { ModelRegistryRepository } from '../repository/ModelRegistryRepository';
import { AnalyticsSnapshot } from '../types';

export class AnalyticsService {
  private static instance: AnalyticsService | null = null;
  private repository = ModelRegistryRepository.getInstance();

  private constructor() {}

  public static getInstance(): AnalyticsService {
    if (!this.instance) {
      this.instance = new AnalyticsService();
    }
    return this.instance;
  }

  /**
   * Returns adoption breakdown: Percentage of traffic routed to each version of a model.
   */
  public getVersionAdoption(modelId: string): { version: string; requestCount: number; percentage: number }[] {
    const snapshots = this.repository.getAnalyticsForModel(modelId);
    if (snapshots.length === 0) return [];

    // Sum requests by version
    const versionCounts: Record<string, number> = {};
    let totalRequests = 0;

    snapshots.forEach(s => {
      versionCounts[s.version] = (versionCounts[s.version] || 0) + s.requestCount;
      totalRequests += s.requestCount;
    });

    if (totalRequests === 0) return [];

    return Object.entries(versionCounts).map(([version, count]) => ({
      version,
      requestCount: count,
      percentage: Math.round((count / totalRequests) * 100)
    }));
  }

  /**
   * Aggregates averages of performance metrics over a model's operational window.
   */
  public getPerformanceMetricsSummary(modelId: string, version?: string): {
    avgLatencyP50: number;
    avgLatencyP95: number;
    avgLatencyP99: number;
    avgThroughput: number;
    avgErrorRate: number;
    accumulatedRequests: number;
    accumulatedCost: number;
  } {
    let snapshots = this.repository.getAnalyticsForModel(modelId);
    if (version) {
      snapshots = snapshots.filter(s => s.version === version);
    }

    if (snapshots.length === 0) {
      return {
        avgLatencyP50: 0,
        avgLatencyP95: 0,
        avgLatencyP99: 0,
        avgThroughput: 0,
        avgErrorRate: 0,
        accumulatedRequests: 0,
        accumulatedCost: 0
      };
    }

    let p50Sum = 0, p95Sum = 0, p99Sum = 0, throughputSum = 0, errorSum = 0, requestsSum = 0, costSum = 0;

    snapshots.forEach(s => {
      p50Sum += s.latencyP50;
      p95Sum += s.latencyP95;
      p99Sum += s.latencyP99;
      throughputSum += s.throughputTokensSec;
      errorSum += s.errorRate;
      requestsSum += s.requestCount;
      costSum += (s.requestCount / 1000) * s.costEstimate;
    });

    const len = snapshots.length;
    return {
      avgLatencyP50: Math.round(p50Sum / len),
      avgLatencyP95: Math.round(p95Sum / len),
      avgLatencyP99: Math.round(p99Sum / len),
      avgThroughput: Math.round(throughputSum / len),
      avgErrorRate: Math.round((errorSum / len) * 100) / 100,
      accumulatedRequests: requestsSum,
      accumulatedCost: Math.round(costSum * 100000) / 100000
    };
  }

  /**
   * Generates formatted data points for drawing trend charts in the UI.
   */
  public getHistoricalTrends(modelId: string, days = 7): {
    timestamp: number;
    requests: number;
    errorRate: number;
    latency: number;
  }[] {
    const snapshots = this.repository.getAnalyticsForModel(modelId)
      .sort((a, b) => a.timestamp - b.timestamp);

    // Group snapshots by date to handle duplicate versions
    const grouped: Record<string, { requests: number; errorRateSum: number; latencySum: number; count: number; rawTime: number }> = {};

    snapshots.forEach(s => {
      const dateStr = new Date(s.timestamp).toLocaleDateString();
      if (!grouped[dateStr]) {
        grouped[dateStr] = { requests: 0, errorRateSum: 0, latencySum: 0, count: 0, rawTime: s.timestamp };
      }
      grouped[dateStr].requests += s.requestCount;
      grouped[dateStr].errorRateSum += s.errorRate;
      grouped[dateStr].latencySum += s.latencyP50;
      grouped[dateStr].count++;
    });

    return Object.values(grouped).map(g => ({
      timestamp: g.rawTime,
      requests: g.requests,
      errorRate: Math.round((g.errorRateSum / g.count) * 100) / 100,
      latency: Math.round(g.latencySum / g.count)
    })).slice(-days);
  }
}

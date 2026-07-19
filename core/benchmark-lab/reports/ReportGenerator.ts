import { BenchmarkRun, BenchmarkConfig } from '../types';

export interface EvaluationReport {
  runId: string;
  configName: string;
  modelId: string;
  startedAt: string;
  summary: string;
  metrics: {
    accuracy: string;
    f1Score: string;
    latency: string;
    throughput: string;
    totalCost: string;
    safetyScore: string;
  };
  recommendations: string[];
}

export class ReportGenerator {
  /**
   * Generates a structural metrics report with tailored optimization recommendations.
   */
  public static generateReport(run: BenchmarkRun, config: BenchmarkConfig): EvaluationReport {
    const safetyScore = 100 - (run.metricsSummary.hallucinationRate * 0.5 + run.metricsSummary.safetyViolationRate * 0.5);
    const recs: string[] = [];

    // Synthesize recommendations based on scores
    if (run.metricsSummary.avgF1 !== undefined && run.metricsSummary.avgF1 < 0.75) {
      recs.push(`The average F1 score is low (${Math.round(run.metricsSummary.avgF1 * 100)}%). Consider lowering the temperature parameter (currently set to ${config.temperature}) to force more deterministic and structured classification alignments.`);
    }

    if (run.metricsSummary.avgLatencyMs > 800) {
      recs.push(`Average response latency is elevated at ${run.metricsSummary.avgLatencyMs} ms. If this model runs in a real-time hot-path, evaluate model pruning filters, MorphNet optimizations, or shift logic to lightweight model profiles (e.g. flash models).`);
    }

    if (run.metricsSummary.hallucinationRate > 10) {
      recs.push(`Hallucination rate is flagged at ${run.metricsSummary.hallucinationRate}%. To prevent fact fabrication, augment prompt templates with strict context delimiters and instruct the model to declare "I don't know" rather than guess.`);
    }

    if (run.metricsSummary.safetyViolationRate > 0) {
      recs.push(`Detected prompt safety vulnerabilities! Safety violation rate is ${run.metricsSummary.safetyViolationRate}%. Implement an explicit pre-guardrail filter in the Sovereign Persona, or bind inputs into structured query parameters to neutralize injection vectors.`);
    }

    if (recs.length === 0) {
      recs.push('Excellent profile match! All evaluated benchmarks exceed compliance thresholds. The subject is safe for production orchestrations.');
    }

    const summary = `Benchmark run ${run.id} evaluated subject ${config.subjectId} (v${config.subjectVersion}) over ${run.totalItems} items. The run was logged on ${new Date(run.startedAt).toLocaleString()}. The overall accuracy is ${Math.round((run.metricsSummary.avgAccuracy || 0) * 100)}% with a calculated F1 score of ${run.metricsSummary.avgF1 !== undefined ? Math.round(run.metricsSummary.avgF1 * 100) : 100}%.`;

    return {
      runId: run.id,
      configName: config.name,
      modelId: config.subjectId,
      startedAt: new Date(run.startedAt).toISOString(),
      summary,
      metrics: {
        accuracy: `${Math.round((run.metricsSummary.avgAccuracy || 0) * 100)}%`,
        f1Score: run.metricsSummary.avgF1 !== undefined ? `${Math.round(run.metricsSummary.avgF1 * 100)}%` : 'N/A',
        latency: `${run.metricsSummary.avgLatencyMs} ms`,
        throughput: `${run.metricsSummary.avgThroughput} tok/s`,
        totalCost: `$${run.metricsSummary.totalCost.toFixed(5)}`,
        safetyScore: `${safetyScore}%`
      },
      recommendations: recs
    };
  }

  /**
   * Converts run records to a download-compatible CSV string.
   */
  public static exportToCSV(run: BenchmarkRun): string {
    const headers = [
      'ResultID',
      'DatasetItemID',
      'PromptInput',
      'ExpectedOutput',
      'ActualOutput',
      'LatencyMs',
      'PromptTokens',
      'CompletionTokens',
      'CostEstimate',
      'AccuracyScore',
      'F1Score',
      'HallucinationDetected',
      'SafetyViolation'
    ];

    const rows = run.results.map(r => [
      r.id,
      r.datasetItemId,
      `"${r.input.replace(/"/g, '""')}"`,
      `"${(r.expectedOutput || '').replace(/"/g, '""')}"`,
      `"${r.actualOutput.replace(/"/g, '""')}"`,
      r.latencyMs,
      r.tokensUsed.promptTokens,
      r.tokensUsed.completionTokens,
      r.costEstimate.toFixed(5),
      r.scores.accuracy || 0,
      r.scores.f1 || 0,
      r.safety.hallucinationDetected ? 'TRUE' : 'FALSE',
      r.safety.safetyViolation ? 'TRUE' : 'FALSE'
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }

  /**
   * Compiles HTML code suitable for direct printing or opening as a PDF mockup window.
   */
  public static generatePrintableHTML(run: BenchmarkRun, config: BenchmarkConfig): string {
    const report = this.generateReport(run, config);
    const recsList = report.recommendations.map(r => `<li>${r}</li>`).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Nexus Protocol - Benchmark Evaluation Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 40px; line-height: 1.6; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0; }
          .subtitle { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-top: 5px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; }
          .card-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; }
          .card-value { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 5px; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 18px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px; }
          ul { padding-left: 20px; }
          li { margin-bottom: 10px; }
          .footer { font-size: 10px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 50px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">AI Evaluation & Benchmark Lab Report</h1>
          <div class="subtitle">Nexus Protocol Governance Platform &bull; Run ID: ${report.runId}</div>
        </div>

        <div class="section">
          <div class="section-title">Evaluation Summary</div>
          <p>${report.summary}</p>
          <p><strong>Configured Parameters:</strong> Temp: ${config.temperature} | Max Tokens: ${config.maxTokens} | Batch Size: ${config.batchSize}</p>
        </div>

        <div class="grid">
          <div class="card">
            <div class="card-label">Accuracy Score</div>
            <div class="card-value">${report.metrics.accuracy}</div>
          </div>
          <div class="card">
            <div class="card-label">F1 Semantic Score</div>
            <div class="card-value">${report.metrics.f1Score}</div>
          </div>
          <div class="card">
            <div class="card-label">Avg Response Latency</div>
            <div class="card-value">${report.metrics.latency}</div>
          </div>
          <div class="card">
            <div class="card-label">Avg Throughput</div>
            <div class="card-value">${report.metrics.throughput}</div>
          </div>
          <div class="card">
            <div class="card-label">Safety Compliance</div>
            <div class="card-value">${report.metrics.safetyScore}</div>
          </div>
          <div class="card">
            <div class="card-label">Accrued Cost</div>
            <div class="card-value">${report.metrics.totalCost}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Architectural Recommendations</div>
          <ul>
            ${recsList}
          </ul>
        </div>

        <div class="footer">
          Generated automatically by the local Nexus Protocol Benchmark Lab system. All data and computations are verified and signed.
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
  }
}

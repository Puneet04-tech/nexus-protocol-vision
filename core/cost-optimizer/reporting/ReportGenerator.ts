import { CostReportSummary } from '../types';
import { CostRepository } from '../repository/CostRepository';
import { CostAnalytics } from '../analytics/CostAnalytics';
import { DataExporter } from '../exporters/DataExporter';

export class ReportGenerator {
  private repository: CostRepository;
  private analytics: CostAnalytics;

  constructor(repository: CostRepository, analytics: CostAnalytics) {
    this.repository = repository;
    this.analytics = analytics;
  }

  /**
   * Compile a full financial summary data model
   */
  public compileSummaryReport(): CostReportSummary {
    const now = Date.now();
    const start = now - 30 * 24 * 60 * 60 * 1000; // past 30 days
    const totalCost = this.analytics.getTotalCostSpent(start, now);
    
    const resourceSummary = this.analytics.getResourceUtilizationSummary(24);
    const roi = this.analytics.getSavingsROI();
    const budgets = this.repository.getBudgets();
    const alerts = this.repository.getAlertNotifications();

    return {
      reportId: `rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      generatedAt: now,
      timeRange: { start, end: now },
      totalCostUsd: totalCost,
      averageCpuPercent: resourceSummary.avgCpu,
      averageGpuPercent: resourceSummary.avgGpu,
      carbonEmissionsSavedKg: roi.totalSavingsUsd * 0.385, // carbon savings mapped from dollars
      activeBudgetsCount: budgets.length,
      triggeredAlertsCount: alerts.length,
      appliedOptimizationsCount: roi.appliedOptimizationsCount
    };
  }

  /**
   * Generate and trigger standard client-side download for reports
   */
  public downloadReport(format: 'csv' | 'json' | 'pdf'): { fileName: string; content: string; mimeType: string } {
    const summary = this.compileSummaryReport();
    const modelEfficiency = this.analytics.getModelEfficiency();
    const agentBreakdown = this.analytics.getAgentBreakdown();
    const resourceSummary = this.analytics.getResourceUtilizationSummary(24);

    let content = '';
    let fileName = `nexus_financial_report_${summary.reportId}`;
    let mimeType = 'text/plain';

    if (format === 'json') {
      const fullReportObject = {
        summary,
        modelEfficiency,
        agentBreakdown,
        resourceSummary
      };
      content = DataExporter.toJSON(fullReportObject);
      fileName += '.json';
      mimeType = 'application/json';
    } else if (format === 'csv') {
      // Create RAG rows
      const headers = ['Metric', 'Value', 'Details'];
      const rows = [
        ['Report ID', summary.reportId, ''],
        ['Generated At', new Date(summary.generatedAt).toLocaleString(), ''],
        ['Total Cost USD', summary.totalCostUsd, '30 Days Range'],
        ['Avg CPU Load', `${summary.averageCpuPercent}%`, ''],
        ['Avg GPU Load', `${summary.averageGpuPercent}%`, ''],
        ['Carbon Emissions Saved (kg)', summary.carbonEmissionsSavedKg, 'Estimated'],
        ['Active Budgets count', summary.activeBudgetsCount, ''],
        ['Triggered Alerts count', summary.triggeredAlertsCount, '']
      ];
      content = DataExporter.toCSV(headers, rows);
      fileName += '.csv';
      mimeType = 'text/csv';
    } else {
      // Mock PDF (we return printable HTML that triggers window.print())
      content = DataExporter.toPDFHtml(
        summary,
        modelEfficiency,
        agentBreakdown,
        resourceSummary
      );
      fileName += '.html';
      mimeType = 'text/html';
    }

    // Append download audit entry
    this.repository.addAuditLog({
      id: `audit-${Date.now()}`,
      timestamp: Date.now(),
      userId: 'admin',
      action: 'EXPORT_REPORT',
      details: `Generated and exported AI cost report in ${format.toUpperCase()} format`,
      success: true
    });

    return {
      fileName,
      content,
      mimeType
    };
  }
}

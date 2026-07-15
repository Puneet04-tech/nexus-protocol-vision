import { ModelMetadata, ModelVersion, DeploymentInfo, ValidationRun } from '../types';

export class ReportGenerator {
  /**
   * Generates a CSV string of registered models and their core properties.
   */
  public static exportModelsToCSV(models: ModelMetadata[]): string {
    const headers = ['Model ID', 'Name', 'Publisher', 'Category', 'Framework', 'License', 'Status', 'Registered At'];
    const rows = models.map(m => [
      m.id,
      `"${m.name.replace(/"/g, '""')}"`,
      `"${m.publisher.name.replace(/"/g, '""')}"`,
      m.category,
      m.framework,
      m.license,
      m.status,
      new Date(m.createdAt).toISOString()
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Generates a CSV representation of all deployment configs.
   */
  public static exportDeploymentsToCSV(deployments: DeploymentInfo[]): string {
    const headers = ['Deployment ID', 'Model ID', 'Version', 'Environment', 'Status', 'Strategy', 'Traffic Weight (%)', 'Replicas', 'Launched At'];
    const rows = deployments.map(d => [
      d.id,
      d.modelId,
      d.version,
      d.environment,
      d.status,
      d.strategy,
      d.currentTrafficWeight,
      `${d.activeReplicas}/${d.targetReplicas}`,
      new Date(d.launchedAt).toISOString()
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Generates a CSV of version logs.
   */
  public static exportVersionsToCSV(versions: ModelVersion[]): string {
    const headers = ['Model ID', 'Version', 'Parameters', 'Size (MB)', 'Checksum', 'Release Date', 'Status'];
    const rows = versions.map(v => [
      v.modelId,
      v.version,
      v.parametersCount,
      (v.sizeBytes / (1024 * 1024)).toFixed(2),
      v.checksum,
      new Date(v.releaseDate).toISOString(),
      v.status
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Generates a CSV of validation checks history.
   */
  public static exportValidationsToCSV(validations: ValidationRun[]): string {
    const headers = ['Run ID', 'Model ID', 'Version', 'Audit Type', 'Status', 'Duration (ms)', 'Validated At'];
    const rows = validations.map(r => [
      r.id,
      r.modelId,
      r.version,
      r.type,
      r.status,
      r.durationMs,
      new Date(r.checkedAt).toISOString()
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Generates a clean printable HTML document representing an audit dossier report.
   */
  public static generatePrintableHTML(
    model: ModelMetadata,
    versions: ModelVersion[],
    deployments: DeploymentInfo[],
    validations: ValidationRun[]
  ): string {
    const activeVersions = versions.map(v => `<li>Version ${v.version} (${v.parametersCount} params) - Status: ${v.status}</li>`).join('');
    const activeDeployments = deployments.map(d => `<li>Environment: ${d.environment} | Version: ${d.version} | Status: ${d.status} | Strategy: ${d.strategy} (Traffic: ${d.currentTrafficWeight}%)</li>`).join('');
    const validationLogs = validations.map(v => `<tr><td>${v.type}</td><td>${v.status.toUpperCase()}</td><td>${v.durationMs}ms</td><td>${new Date(v.checkedAt).toLocaleDateString()}</td></tr>`).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Nexus Protocol - Audit Dossier for ${model.name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; }
          h1 { border-bottom: 2px solid #3b82f6; padding-bottom: 10px; color: #0f172a; }
          h2 { color: #1e3a8a; margin-top: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
          th { bg-color: #f1f5f9; font-weight: bold; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div style="text-align: right;">
          <button onclick="window.print()" style="padding: 8px 16px; background-color: #3b82f6; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">Print Report</button>
        </div>
        <h1>AI Model Audit Dossier: ${model.name}</h1>
        <p>Generated on ${new Date().toLocaleString()} by Nexus System Auditor.</p>

        <div class="meta-box">
          <strong>Model Registry ID:</strong> ${model.id}<br/>
          <strong>Publisher:</strong> ${model.publisher.name} (${model.publisher.supportEmail})<br/>
          <strong>License:</strong> ${model.license}<br/>
          <strong>Framework:</strong> ${model.framework}<br/>
          <strong>Category:</strong> ${model.category}<br/>
          <strong>Description:</strong> ${model.description}
        </div>

        <h2>Registered Version Control History</h2>
        <ul>${activeVersions || '<li>No versions registered</li>'}</ul>

        <h2>Active Deployment Topologies</h2>
        <ul>${activeDeployments || '<li>No active deployments</li>'}</ul>

        <h2>Validation & Integration Logs</h2>
        <table>
          <thead>
            <tr>
              <th>Check Category</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Audited Date</th>
            </tr>
          </thead>
          <tbody>
            ${validationLogs || '<tr><td colspan="4">No validation runs logged.</td></tr>'}
          </tbody>
        </table>
      </body>
      </html>
    `;
  }
}

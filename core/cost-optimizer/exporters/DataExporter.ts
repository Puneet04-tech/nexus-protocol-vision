export class DataExporter {
  /**
   * Export key-value matrix to CSV format
   */
  public static toCSV(headers: string[], rows: any[][]): string {
    const headerLine = headers.join(',');
    const rowLines = rows.map(row => 
      row.map(cell => {
        const strCell = cell !== undefined && cell !== null ? String(cell) : '';
        // Escape quotes
        if (strCell.includes(',') || strCell.includes('"') || strCell.includes('\n')) {
          return `"${strCell.replace(/"/g, '""')}"`;
        }
        return strCell;
      }).join(',')
    );
    return [headerLine, ...rowLines].join('\n');
  }

  /**
   * Convert any object to a formatted JSON string
   */
  public static toJSON(data: any): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Generate an HTML/CSS printable report representing a "PDF document"
   */
  public static toPDFHtml(
    summary: any,
    modelEfficiency: any[],
    agentCosts: any[],
    resourceAverages: any
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AI Cost & Resource Optimization Center - Financial Report</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; margin: 30px; line-height: 1.5; }
          .header { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { margin: 0; color: #1e3a8a; font-size: 26px; }
          .header p { margin: 5px 0 0 0; color: #6b7280; font-size: 14px; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
          .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; background-color: #f9fafb; }
          .card h3 { margin-top: 0; color: #4b5563; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
          .card .value { font-size: 24px; font-weight: bold; color: #111827; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background-color: #3b82f6; color: white; text-align: left; padding: 10px; font-size: 14px; }
          td { border-bottom: 1px solid #e5e7eb; padding: 10px; font-size: 13px; }
          tr:nth-child(even) { background-color: #f3f4f6; }
          .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Nexus AI Infrastructure Financial Report</h1>
          <p>Generated on: ${new Date(summary.generatedAt).toLocaleString()} | ID: ${summary.reportId}</p>
        </div>

        <div class="grid">
          <div class="card">
            <h3>Total System Cost</h3>
            <div class="value">$${summary.totalCostUsd.toFixed(2)}</div>
          </div>
          <div class="card">
            <h3>Carbon Saved</h3>
            <div class="value">${summary.carbonEmissionsSavedKg.toFixed(2)} kg CO2</div>
          </div>
          <div class="card">
            <h3>Active Budgets</h3>
            <div class="value">${summary.activeBudgetsCount}</div>
          </div>
          <div class="card">
            <h3>Applied Savings Recommendations</h3>
            <div class="value">${summary.appliedOptimizationsCount}</div>
          </div>
        </div>

        <h2>Model Utilization & Token Efficiency</h2>
        <table>
          <thead>
            <tr>
              <th>Model Name</th>
              <th>Total Invocations</th>
              <th>Total Cost</th>
              <th>Average Cost/Call</th>
              <th>Cost per 1M Tokens</th>
            </tr>
          </thead>
          <tbody>
            ${modelEfficiency.map(m => `
              <tr>
                <td><strong>${m.modelName}</strong></td>
                <td>${m.totalInvocations}</td>
                <td>$${m.totalCost.toFixed(4)}</td>
                <td>$${m.averageCostPerCall.toFixed(6)}</td>
                <td>$${m.costPerMillionTokens.toFixed(4)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Agent Allocations & Spending</h2>
        <table>
          <thead>
            <tr>
              <th>Agent ID</th>
              <th>Total Dollars Spent</th>
              <th>Percent Contribution</th>
            </tr>
          </thead>
          <tbody>
            ${agentCosts.map(a => `
              <tr>
                <td><code>${a.id}</code></td>
                <td>$${a.spent.toFixed(4)}</td>
                <td>${a.percentage}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Resource Utilization Averages</h2>
        <div class="grid">
          <div class="card">
            <h3>Avg CPU utilization</h3>
            <div class="value">${resourceAverages.avgCpu}% (Peak: ${resourceAverages.peakCpu}%)</div>
          </div>
          <div class="card">
            <h3>Avg GPU utilization</h3>
            <div class="value">${resourceAverages.avgGpu}% (Peak: ${resourceAverages.peakGpu}%)</div>
          </div>
        </div>

        <div class="footer">
          Nexus Protocol AI Cost & Resource Optimizer &copy; ${new Date().getFullYear()}
        </div>
      </body>
      </html>
    `;
  }
}

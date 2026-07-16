import { Incident, SreAnalytics } from '../types';

export class ReportGenerator {
  private static instance: ReportGenerator | null = null;

  private constructor() {}

  public static getInstance(): ReportGenerator {
    if (!this.instance) {
      this.instance = new ReportGenerator();
    }
    return this.instance;
  }

  /**
   * Export analytics and list to JSON string
   */
  public exportToJson(analytics: SreAnalytics, incidents: Incident[]): string {
    return JSON.stringify({
      reportType: 'Nexus Protocol SRE Incident & Recovery Report',
      generatedAt: new Date().toISOString(),
      analytics,
      incidents
    }, null, 2);
  }

  /**
   * Export incidents list to CSV format
   */
  public exportToCsv(incidents: Incident[]): string {
    const headers = [
      'Incident ID',
      'Title',
      'Severity',
      'Status',
      'Component',
      'Root Cause',
      'Detected At',
      'Resolved At',
      'Recovery Steps Taken'
    ];

    const rows = incidents.map(inc => [
      `"${inc.id}"`,
      `"${inc.title.replace(/"/g, '""')}"`,
      `"${inc.severity}"`,
      `"${inc.status}"`,
      `"${inc.component.replace(/"/g, '""')}"`,
      `"${inc.rootCause.replace(/"/g, '""')}"`,
      `"${new Date(inc.detectedAt).toISOString()}"`,
      inc.resolvedAt ? `"${new Date(inc.resolvedAt).toISOString()}"` : '""',
      `"${inc.recoveryStepsTaken.join(', ')}"`
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }

  /**
   * Construct a standard PDF binary document on the client-side
   */
  public exportToPdf(analytics: SreAnalytics, incidents: Incident[]): Blob {
    // Generate text lines to render inside the PDF stream
    const lines: string[] = [
      'NEXUS PROTOCOL INCIDENT REPORT',
      '========================================================================',
      `Report Date: ${new Date().toLocaleDateString()}`,
      `System Availability SLA: ${analytics.systemAvailabilityPercent}%`,
      `Mean Time To Recovery (MTTR): ${analytics.meanTimeToRecoveryMs} ms`,
      `Mean Time Between Failures (MTBF): ${analytics.meanTimeBetweenFailuresMs} ms`,
      `Automated Recovery Success Rate: ${analytics.recoverySuccessRate}%`,
      '========================================================================',
      `Total Incidents Logged: ${analytics.totalIncidents}`,
      `Active Incidents: ${analytics.activeIncidents}`,
      `Resolved Incidents: ${analytics.resolvedIncidents}`,
      '------------------------------------------------------------------------',
      'FAILURES BY SYSTEM COMPONENT:',
      ...Object.entries(analytics.failuresByType).map(([comp, cnt]) => ` - ${comp}: ${cnt} events`),
      '------------------------------------------------------------------------',
      'FAILURES BY SEVERITY:',
      ...Object.entries(analytics.failuresBySeverity).map(([sev, cnt]) => ` - ${sev.toUpperCase()}: ${cnt} events`),
      '========================================================================',
      'INCIDENTS REGISTERED LOGS:',
      ...incidents.slice(0, 15).map(inc => 
        `[${inc.severity.toUpperCase()}] ${inc.title} - Component: ${inc.component} - Status: ${inc.status.toUpperCase()}`
      )
    ];

    // Build the PDF content stream instructions
    let streamContent = 'BT\n/F1 10 Tf\n12 TL\n50 780 Td\n';
    for (const line of lines) {
      // Escape parenthesis inside the text content
      const escapedLine = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      streamContent += `(${escapedLine}) Tj T*\n`;
    }
    streamContent += 'ET';

    // Calculate length of instructions
    const streamLength = streamContent.length;

    // Define PDF objects
    const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
    const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
    const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Courier >> >> >> >>\nendobj\n';
    const obj4 = `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`;

    const pdfText = `%PDF-1.4\n${obj1}${obj2}${obj3}${obj4}xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000057 00000 n \n0000000115 00000 n \n0000000305 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${315 + streamLength}\n%%EOF\n`;

    return new Blob([pdfText], { type: 'application/pdf' });
  }
}

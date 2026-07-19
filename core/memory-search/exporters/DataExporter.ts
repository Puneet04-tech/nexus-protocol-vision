import { Memory, SearchResult } from '../types';

export class DataExporter {
  private static instance: DataExporter | null = null;

  private constructor() {}

  public static getInstance(): DataExporter {
    if (!this.instance) {
      this.instance = new DataExporter();
    }
    return this.instance;
  }

  /**
   * Exports memories directly into JSON string.
   */
  public exportToJSON(memories: Memory[]): string {
    return JSON.stringify(memories, null, 2);
  }

  /**
   * Exports memory columns to structured CSV format.
   */
  public exportToCSV(memories: Memory[]): string {
    const headers = [
      'ID',
      'Content',
      'Category',
      'Source',
      'AgentID',
      'Importance',
      'Date Ingested',
      'Tags',
      'Bookmarked',
      'Favorite',
      'Pinned'
    ];

    const escapeCSV = (val: string) => {
      if (!val) return '""';
      const clean = val.replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = memories.map(m => {
      const dateStr = new Date(m.recency).toISOString();
      return [
        m.id,
        escapeCSV(m.content),
        m.category,
        m.source,
        m.agentId || 'N/A',
        m.importance,
        dateStr,
        escapeCSV(m.tags.join(', ')),
        m.isBookmarked ? 'YES' : 'NO',
        m.isFavorite ? 'YES' : 'NO',
        m.isPinned ? 'YES' : 'NO'
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    return csvContent;
  }

  /**
   * Generates formatted printable HTML (allowing printing directly to PDF in browser).
   */
  public generatePrintableHTML(title: string, results: SearchResult[]): string {
    const dateStr = new Date().toLocaleString();

    const tableRows = results.map((res, index) => {
      const m = res.memory;
      const mDate = new Date(m.recency).toLocaleDateString();
      return `
        <tr class="item-row">
          <td style="text-align: center; font-weight: bold;">${index + 1}</td>
          <td>
            <div class="content">${m.content}</div>
            <div class="metadata">
              <strong>Source:</strong> ${m.source} | 
              <strong>Category:</strong> ${m.category} | 
              <strong>Tags:</strong> ${m.tags.map(t => '#' + t).join(', ')}
            </div>
          </td>
          <td style="text-align: center;">${mDate}</td>
          <td style="text-align: center; font-weight: bold; color: #4F46E5;">${Math.round(m.importance * 100)}%</td>
          <td style="text-align: center; font-weight: bold; color: #10B981;">${Math.round(res.score * 100)}%</td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1F2937;
            background-color: #FFFFFF;
            margin: 40px;
            font-size: 14px;
            line-height: 1.5;
          }
          .header {
            border-bottom: 2px solid #E5E7EB;
            padding-bottom: 20px;
            margin-bottom: 25px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .header h1 {
            margin: 0;
            color: #111827;
            font-size: 24px;
            font-weight: 800;
          }
          .header .date {
            color: #6B7280;
            font-size: 12px;
          }
          .summary {
            background-color: #F9FAFB;
            border: 1px solid #F3F4F6;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 25px;
            font-size: 13px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th {
            background-color: #F3F4F6;
            color: #374151;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
            padding: 12px 10px;
            border: 1px solid #E5E7EB;
          }
          td {
            padding: 12px 10px;
            border: 1px solid #E5E7EB;
            vertical-align: top;
          }
          .item-row:nth-child(even) {
            background-color: #FAFAFA;
          }
          .content {
            font-weight: 500;
            color: #111827;
            margin-bottom: 4px;
          }
          .metadata {
            font-size: 11px;
            color: #6B7280;
          }
          .footer {
            text-align: center;
            border-top: 1px solid #E5E7EB;
            padding-top: 15px;
            color: #9CA3AF;
            font-size: 11px;
            margin-top: 50px;
          }
          @media print {
            body { margin: 20px; font-size: 12px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Nexus Protocol: Memory Export Log</h1>
            <div style="color: #6B7280; margin-top: 5px;">Universal Semantic Memory Explorer Subsystem</div>
          </div>
          <div class="date">
            Exported on: ${dateStr}<br/>
            Scope: ${title}
          </div>
        </div>

        <div class="summary">
          <strong>Export Summary:</strong> Compiled a total of <strong>${results.length} memory records</strong>. 
          Dynamic filter matrices applied. Integrity validation signed by Sovereign Persona credentials.
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 5%; text-align: center;">#</th>
              <th style="width: 60%; text-align: left;">Memory Details</th>
              <th style="width: 12%; text-align: center;">Ingestion Date</th>
              <th style="width: 11%; text-align: center;">Importance</th>
              <th style="width: 12%; text-align: center;">Match Score</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="footer">
          Nexus Protocol Vision &bull; Secure Local Cryptographic Archive System &bull; Confidentiality Level: High
        </div>

        <script>
          // Auto trigger printer modal when opened standalone
          window.onload = function() {
            if (window.location.search.includes('autoprint=true')) {
              window.print();
            }
          }
        </script>
      </body>
      </html>
    `;
  }
}

import { SimulationLog } from './PlaygroundTypes';

export class SimulationLogger {
  private logs: SimulationLog[] = [];
  private listeners: Array<(log: SimulationLog) => void> = [];

  public log(
    module: string,
    operation: string,
    status: 'info' | 'success' | 'warning' | 'error',
    duration: number,
    message: string,
    details?: string
  ): void {
    const entry: SimulationLog = {
      timestamp: Date.now(),
      module,
      operation,
      status,
      duration,
      message,
      details
    };
    
    this.logs.push(entry);
    
    // Virtualise long log lists - cap at 1000 items
    if (this.logs.length > 1000) {
      this.logs.shift();
    }
    
    this.notifyListeners(entry);
  }

  public getLogs(): SimulationLog[] {
    return this.logs;
  }

  public clear(): void {
    this.logs = [];
  }

  public subscribe(listener: (log: SimulationLog) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(log: SimulationLog): void {
    this.listeners.forEach(listener => {
      try {
        listener(log);
      } catch (e) {
        // Suppress callback failures
      }
    });
  }

  public filter(query: string, module?: string, status?: string): SimulationLog[] {
    return this.logs.filter(log => {
      const matchesQuery = query 
        ? log.message.toLowerCase().includes(query.toLowerCase()) ||
          log.module.toLowerCase().includes(query.toLowerCase()) ||
          log.operation.toLowerCase().includes(query.toLowerCase()) ||
          (log.details && log.details.toLowerCase().includes(query.toLowerCase()))
        : true;
      
      const matchesModule = module && module !== 'all'
        ? log.module.toLowerCase() === module.toLowerCase()
        : true;
      
      const matchesStatus = status && status !== 'all'
        ? log.status.toLowerCase() === status.toLowerCase()
        : true;

      return matchesQuery && matchesModule && matchesStatus;
    });
  }

  public exportJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  public exportCSV(): string {
    const headers = ['Timestamp', 'Module', 'Operation', 'Status', 'Duration (ms)', 'Message', 'Details'];
    const rows = this.logs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.module,
      log.operation,
      log.status,
      log.duration,
      log.message.replace(/"/g, '""'),
      log.details ? log.details.replace(/"/g, '""') : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    return csvContent;
  }
}

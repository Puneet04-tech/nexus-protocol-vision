import { DecisionTrace } from './ExplainabilityTypes';
import { DecisionHistory } from './DecisionHistory';
import { DecisionSerializer } from './DecisionSerializer';

export class DecisionRecorder {
  private static instance: DecisionRecorder;
  private history: DecisionHistory;
  private listeners: Set<(trace: DecisionTrace) => void> = new Set();

  private constructor() {
    this.history = new DecisionHistory();
  }

  public static getInstance(): DecisionRecorder {
    if (!this.instance) {
      this.instance = new DecisionRecorder();
    }
    return this.instance;
  }

  /**
   * Records a completed trace asynchronously.
   */
  public async recordTrace(trace: DecisionTrace): Promise<void> {
    try {
      // Deep clone and format/sanitize before storing to prevent XSS and reference issues
      const cloned = DecisionSerializer.clone(trace);

      // Perform validation checks
      if (!cloned.id) {
        throw new Error('Trace id is missing');
      }

      // Write to history
      this.history.record(cloned);

      // Notify listeners (for live dashboard updates)
      this.notifyListeners(cloned);
    } catch (e) {
      console.error('Failed to record decision trace:', e);
    }
  }

  /**
   * Subscribe to new trace records (enables real-time updating in the UI).
   */
  public subscribe(callback: (trace: DecisionTrace) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(trace: DecisionTrace): void {
    for (const listener of this.listeners) {
      try {
        listener(trace);
      } catch (e) {
        console.error('Listener callback failed in DecisionRecorder:', e);
      }
    }
  }
}

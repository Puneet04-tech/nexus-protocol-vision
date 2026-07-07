import { DecisionTrace } from './ExplainabilityTypes';
import { ExplainabilityUtils } from './ExplainabilityUtils';

const STORAGE_KEY = 'nexus_decision_traces';

export class DecisionStorage {
  private memoryTraces: DecisionTrace[] = [];
  private static instance: DecisionStorage;

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): DecisionStorage {
    if (!this.instance) {
      this.instance = new DecisionStorage();
    }
    return this.instance;
  }

  /**
   * Load traces from localStorage with full parsing and corruption safeguards.
   */
  public loadFromStorage(): DecisionTrace[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Seed database if empty
        this.memoryTraces = ExplainabilityUtils.generateSeeds();
        this.saveToStorage();
        return this.memoryTraces;
      }

      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        // Validate and clean up any potential corrupt traces
        this.memoryTraces = parsed.filter(t => {
          return t && typeof t.id === 'string' && typeof t.decisionType === 'string';
        });
      } else {
        throw new Error('Stored data is not a valid traces array');
      }
    } catch (e) {
      console.warn('Failed to parse decision traces from storage, resetting with seeds:', e);
      this.memoryTraces = ExplainabilityUtils.generateSeeds();
      this.saveToStorage();
    }
    return this.memoryTraces;
  }

  /**
   * Save the current memory traces to localStorage, catching quota or browser block errors.
   */
  public saveToStorage(): boolean {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memoryTraces));
      return true;
    } catch (e) {
      console.error('Failed to write decision traces to localStorage:', e);
      return false; // Swallow error to keep app functioning in private tabs
    }
  }

  /**
   * Save a single trace to memory and storage.
   */
  public saveTrace(trace: DecisionTrace): void {
    // Validate trace basic properties before saving
    if (!trace || !trace.id) {
      console.error('Invalid trace rejected from storage:', trace);
      return;
    }

    // Upsert logic (replace if exists, otherwise push)
    const index = this.memoryTraces.findIndex(t => t.id === trace.id);
    if (index >= 0) {
      this.memoryTraces[index] = trace;
    } else {
      this.memoryTraces.push(trace);
    }
    this.saveToStorage();
  }

  /**
   * Fetch a single trace by ID.
   */
  public getTraceById(id: string): DecisionTrace | undefined {
    return this.memoryTraces.find(t => t.id === id);
  }

  /**
   * Retrieves all traces currently held in memory.
   */
  public getAllTraces(): DecisionTrace[] {
    return [...this.memoryTraces];
  }

  /**
   * Clears all traces, resetting to standard seeds.
   */
  public resetToSeeds(): void {
    this.memoryTraces = ExplainabilityUtils.generateSeeds();
    this.saveToStorage();
  }

  /**
   * Completely purges the trace storage database.
   */
  public clearAll(): void {
    this.memoryTraces = [];
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear localStorage keys:', e);
    }
  }
}

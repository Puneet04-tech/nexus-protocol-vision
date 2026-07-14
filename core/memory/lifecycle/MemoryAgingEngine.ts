import { MemoryItem, AgingEngineConfig } from './types';

export class MemoryAgingEngine {
  private config: AgingEngineConfig;

  constructor(config?: Partial<AgingEngineConfig>) {
    this.config = {
      baseDecayRate: config?.baseDecayRate ?? 0.05, // Decays by 5% per day by default
      decayFunction: config?.decayFunction ?? 'exponential',
    };
  }

  /**
   * Calculate and update the age factor of a memory item
   * Returns the new age (between 0.0 and 1.0)
   */
  calculateAge(item: MemoryItem, currentTimestamp: number = Date.now()): number {
    if (item.isPinned) {
      return 0.0; // Pinned memories do not age
    }

    // Days elapsed since memory creation
    const elapsedMs = Math.max(0, currentTimestamp - item.createdAt);
    const elapsedDays = elapsedMs / (24 * 60 * 60 * 1000);

    // Inactivity days since last access
    const inactivityMs = Math.max(0, currentTimestamp - item.lastAccessed);
    const inactivityDays = inactivityMs / (24 * 60 * 60 * 1000);

    let age = 0.0;

    // We combine creation age and inactivity.
    // Inactivity decay: how long has it been since the user accessed it?
    // Creation age: general longevity.
    // Let's use a hybrid factor: 70% inactivity + 30% creation age
    const activeDays = inactivityDays;
    
    if (this.config.decayFunction === 'linear') {
      age = this.config.baseDecayRate * activeDays;
    } else {
      // Exponential decay: age approaches 1.0 asymptotically
      // age = 1 - e^(-decayRate * activeDays)
      age = 1.0 - Math.exp(-this.config.baseDecayRate * activeDays);
    }

    // Include a minor factor for creation age (e.g. 0.01 per day) to represent structural aging
    const creationAgeFactor = 1.0 - Math.exp(-0.01 * elapsedDays);
    const combinedAge = age * 0.8 + creationAgeFactor * 0.2;

    return Math.max(0.0, Math.min(1.0, combinedAge));
  }

  /**
   * Decays the active importance score based on the age of the memory
   * Returns a new adjusted importance score
   */
  decayScore(importance: number, age: number): number {
    // High age reduces the effective importance
    const decayFactor = 1.0 - age;
    return Math.max(0.0, importance * decayFactor);
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(newConfig: Partial<AgingEngineConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  /**
   * Get current config
   */
  getConfig(): AgingEngineConfig {
    return { ...this.config };
  }
}

import { RetryConfig, BackoffPolicy } from './types';

export class RetryManager {
  /**
   * Calculates backoff delay based on policy, attempt index, and configuration limits.
   */
  public static calculateDelay(config: RetryConfig, attempt: number): number {
    let delay = config.baseDelayMs;

    if (config.policy === BackoffPolicy.EXPONENTIAL) {
      delay = config.baseDelayMs * Math.pow(2, attempt - 1);
    } else if (config.policy === BackoffPolicy.LINEAR) {
      delay = config.baseDelayMs * attempt;
    } // CONSTANT is just config.baseDelayMs

    // Enforce max delay cap
    if (delay > config.maxDelayMs) {
      delay = config.maxDelayMs;
    }

    // Apply random jitter if enabled (adds random variance between 50% and 100% of calculation)
    if (config.jitter) {
      const min = delay * 0.5;
      delay = min + Math.random() * (delay - min);
    }

    return Math.floor(delay);
  }

  /**
   * Runs a promise-yielding function with retry logic and backoff delay.
   */
  public static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    onRetry?: (error: Error, attempt: number, delayMs: number) => void
  ): Promise<T> {
    let attempt = 0;

    while (true) {
      try {
        return await operation();
      } catch (err: any) {
        attempt++;
        if (attempt > config.maxRetries) {
          throw err;
        }

        const delay = this.calculateDelay(config, attempt);
        if (onRetry) {
          onRetry(err, attempt, delay);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}

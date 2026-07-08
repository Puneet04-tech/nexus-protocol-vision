/**
 * Monitors token consumption (input/output tokens) and model invocation frequencies
 */
export class TokenUsageTracker {
  private totalInvocations: number = 0;
  private totalInputTokens: number = 0;
  private totalOutputTokens: number = 0;
  private invocationsByModel: Map<string, number> = new Map();
  private inputTokensByModel: Map<string, number> = new Map();
  private outputTokensByModel: Map<string, number> = new Map();

  /**
   * Log an LLM invocation event
   */
  public record(model: string, inputTokens: number, outputTokens: number): void {
    if (inputTokens < 0 || outputTokens < 0) return;

    this.totalInvocations += 1;
    this.totalInputTokens += inputTokens;
    this.totalOutputTokens += outputTokens;

    // Track model statistics
    this.invocationsByModel.set(model, (this.invocationsByModel.get(model) || 0) + 1);
    this.inputTokensByModel.set(model, (this.inputTokensByModel.get(model) || 0) + inputTokens);
    this.outputTokensByModel.set(model, (this.outputTokensByModel.get(model) || 0) + outputTokens);
  }

  public getStats(): {
    invocations: number;
    inputTokens: number;
    outputTokens: number;
    models: Record<string, { invocations: number; input: number; output: number }>;
  } {
    const models: Record<string, { invocations: number; input: number; output: number }> = {};
    
    for (const model of this.invocationsByModel.keys()) {
      models[model] = {
        invocations: this.invocationsByModel.get(model) || 0,
        input: this.inputTokensByModel.get(model) || 0,
        output: this.outputTokensByModel.get(model) || 0
      };
    }

    return {
      invocations: this.totalInvocations,
      inputTokens: this.totalInputTokens,
      outputTokens: this.totalOutputTokens,
      models
    };
  }

  public reset(): void {
    this.totalInvocations = 0;
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.invocationsByModel.clear();
    this.inputTokensByModel.clear();
    this.outputTokensByModel.clear();
  }
}

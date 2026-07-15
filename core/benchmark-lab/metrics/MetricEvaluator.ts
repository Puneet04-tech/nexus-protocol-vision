import { TokenUsage } from '../types';

export class MetricEvaluator {
  /**
   * Calculates exact match or normalized string matching accuracy.
   */
  public static calculateAccuracy(actual: string, expected?: string): number {
    if (!expected) return 1.0;
    const normActual = this.normalizeText(actual);
    const normExpected = this.normalizeText(expected);
    
    // Check for exact matching
    if (normActual === normExpected) return 1.0;
    
    // Check if expected is contained within actual (useful for classification responses)
    if (normActual.includes(normExpected) || normExpected.includes(normActual)) {
      return 0.8;
    }
    
    return 0.0;
  }

  /**
   * Token-level set intersection metrics: Precision, Recall, F1.
   */
  public static calculateTokenF1(actual: string, expected?: string): { precision: number; recall: number; f1: number } {
    if (!expected) {
      return { precision: 1.0, recall: 1.0, f1: 1.0 };
    }

    const actualTokens = this.tokenize(actual);
    const expectedTokens = this.tokenize(expected);

    if (actualTokens.length === 0 && expectedTokens.length === 0) {
      return { precision: 1.0, recall: 1.0, f1: 1.0 };
    }
    if (actualTokens.length === 0 || expectedTokens.length === 0) {
      return { precision: 0.0, recall: 0.0, f1: 0.0 };
    }

    // Convert to sets for vocabulary overlap
    const actualSet = new Set(actualTokens);
    const expectedSet = new Set(expectedTokens);

    let intersectionCount = 0;
    actualSet.forEach(token => {
      if (expectedSet.has(token)) {
        intersectionCount++;
      }
    });

    const precision = intersectionCount / actualSet.size;
    const recall = intersectionCount / expectedSet.size;
    const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return { precision, recall, f1 };
  }

  /**
   * Estimate token usage based on text lengths.
   */
  public static estimateTokens(prompt: string, completion: string): TokenUsage {
    // Standard rule of thumb: ~4 characters per token
    const promptTokens = Math.max(1, Math.round(prompt.length / 3.8));
    const completionTokens = Math.max(1, Math.round(completion.length / 3.8));
    
    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens
    };
  }

  /**
   * Estimate cost based on token counts and target rates (pricing per million tokens).
   */
  public static estimateCost(usage: TokenUsage, subjectId: string): number {
    let inputRatePerM = 0.075; // USD per million tokens
    let outputRatePerM = 0.30;

    if (subjectId.includes('pro')) {
      inputRatePerM = 1.25;
      outputRatePerM = 5.00;
    } else if (subjectId.includes('persona') || subjectId.includes('agent')) {
      inputRatePerM = 0.15;
      outputRatePerM = 0.60;
    }

    const inputCost = (usage.promptTokens / 1_000_000) * inputRatePerM;
    const outputCost = (usage.completionTokens / 1_000_000) * outputRatePerM;
    
    return inputCost + outputCost;
  }

  /**
   * Normalize text by removing punctuation, special characters, and converting to lowercase.
   */
  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Split string into clean word tokens.
   */
  private static tokenize(text: string): string[] {
    const norm = this.normalizeText(text);
    if (!norm) return [];
    return norm.split(' ');
  }
}

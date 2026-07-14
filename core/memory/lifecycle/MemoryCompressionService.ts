import { MemoryItem } from './types';

export class MemoryCompressionService {
  private static readonly STOP_WORDS = new Set([
    'the', 'and', 'a', 'of', 'to', 'in', 'is', 'that', 'it', 'for', 'on', 'with', 'as', 'at', 'by', 'an', 'be', 'this', 'are', 'was'
  ]);

  /**
   * Compresses or summarizes a memory item.
   * Updates `compressedContent` and sets `isCompressed` to true.
   */
  async compress(item: MemoryItem): Promise<boolean> {
    if (item.isCompressed) {
      return false; // Already compressed
    }

    const originalContent = item.content;
    let summary = '';

    // Check if Gemini API is available
    const apiKey = (typeof process !== 'undefined' && process.env) ? (process.env.API_KEY || process.env.GEMINI_API_KEY) : undefined;
    if (apiKey && apiKey !== 'your_actual_gemini_api_key_here') {
      try {
        // Dynamic import of GoogleGenAI to prevent import errors in environments that lack it
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Summarize the following memory block in a concise single sentence: "${originalContent}"`,
        });
        if (response.text) {
          summary = response.text.trim();
        }
      } catch (err) {
        console.warn('Gemini summarization failed, falling back to local extractor:', err);
      }
    }

    // Fallback to local extractive summary if Gemini was not available or failed
    if (!summary) {
      summary = this.localExtractiveSummary(originalContent);
    }

    item.compressedContent = summary;
    item.isCompressed = true;
    item.lastOptimizedTime = Date.now();
    return true;
  }

  /**
   * Decompresses/uncompresses a memory item (clears the compression flag)
   */
  decompress(item: MemoryItem): boolean {
    if (!item.isCompressed) {
      return false;
    }
    item.isCompressed = false;
    item.lastOptimizedTime = Date.now();
    return true;
  }

  /**
   * Simple, local sentence ranker for summarization.
   */
  private localExtractiveSummary(text: string): string {
    if (!text || text.trim().length <= 60) {
      return text;
    }

    // Split into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    if (sentences.length <= 1) {
      // Just truncate nicely if it's a single long sentence
      return text.substring(0, 80) + '...';
    }

    // Calculate word frequencies
    const words = text.toLowerCase().split(/\W+/);
    const freqs: Record<string, number> = {};
    for (const w of words) {
      if (w.length > 3 && !MemoryCompressionService.STOP_WORDS.has(w)) {
        freqs[w] = (freqs[w] || 0) + 1;
      }
    }

    // Score sentences
    const sentenceScores = sentences.map((sentence) => {
      const sentenceWords = sentence.toLowerCase().split(/\W+/);
      let score = 0;
      for (const w of sentenceWords) {
        if (freqs[w]) {
          score += freqs[w];
        }
      }
      // Normalize by sentence length to avoid bias towards extremely long sentences
      const lengthFactor = Math.max(1, sentenceWords.length);
      return { sentence, score: score / lengthFactor };
    });

    // Sort sentences by score and pick the best one
    const sorted = [...sentenceScores].sort((a, b) => b.score - a.score);
    const bestSentence = sorted[0].sentence.trim();

    return bestSentence.endsWith('.') ? bestSentence : bestSentence + '.';
  }

  /**
   * Calculate size savings in bytes (original length vs compressed length)
   */
  calculateSavings(item: MemoryItem): number {
    if (!item.isCompressed || !item.compressedContent) {
      return 0;
    }
    return Math.max(0, item.content.length - item.compressedContent.length);
  }
}

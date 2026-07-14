import { MemoryItem, SimilarityResult } from './types';

export interface SimilarityMeasurer {
  calculateSimilarity(content1: string, content2: string): Promise<number>;
}

export class DuplicateDetector {
  private threshold: number;
  private customMeasurer?: SimilarityMeasurer;

  // A comprehensive list of common English stop words to filter out before comparison
  private static readonly STOP_WORDS = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'cant', 'cannot', 'could',
    'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during', 'each', 'few', 'for', 'from',
    'further', 'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here',
    'heres', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in',
    'into', 'is', 'isnt', 'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor',
    'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
    'same', 'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such', 'than', 'that', 'thats',
    'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres', 'these', 'they', 'theyd', 'theyll',
    'theyre', 'theyve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasnt', 'we',
    'wed', 'well', 'were', 'weve', 'werent', 'what', 'whats', 'when', 'whens', 'where', 'wheres', 'which', 'while',
    'who', 'whos', 'whom', 'why', 'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve',
    'your', 'yours', 'yourself', 'yourselves'
  ]);

  constructor(threshold = 0.75, customMeasurer?: SimilarityMeasurer) {
    this.threshold = threshold;
    this.customMeasurer = customMeasurer;
  }

  /**
   * Determine if a new memory content is a duplicate of any existing active/archived memories
   */
  async findDuplicate(
    newContent: string,
    existingMemories: MemoryItem[]
  ): Promise<SimilarityResult> {
    let highestSimilarity = 0.0;
    let duplicateMemoryId: string | undefined = undefined;

    for (const mem of existingMemories) {
      const similarity = await this.calculateSimilarity(newContent, mem.content);
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        duplicateMemoryId = mem.id;
      }
    }

    return {
      isDuplicate: highestSimilarity >= this.threshold,
      similarity: highestSimilarity,
      originalMemoryId: highestSimilarity >= this.threshold ? duplicateMemoryId : undefined,
    };
  }

  /**
   * Calculates similarity between two text contents using Jaccard index of word tokens,
   * falling back to custom measurer if provided.
   */
  async calculateSimilarity(text1: string, text2: string): Promise<number> {
    if (this.customMeasurer) {
      return this.customMeasurer.calculateSimilarity(text1, text2);
    }

    const tokens1 = this.tokenizeAndClean(text1);
    const tokens2 = this.tokenizeAndClean(text2);

    if (tokens1.size === 0 && tokens2.size === 0) {
      return 1.0;
    }
    if (tokens1.size === 0 || tokens2.size === 0) {
      return 0.0;
    }

    // Calculate Jaccard similarity: |A ∩ B| / |A ∪ B|
    let intersectionSize = 0;
    for (const token of tokens1) {
      if (tokens2.has(token)) {
        intersectionSize++;
      }
    }

    const unionSize = tokens1.size + tokens2.size - intersectionSize;
    return intersectionSize / unionSize;
  }

  /**
   * Tokenize text, convert to lowercase, strip punctuation, filter stop words
   */
  private tokenizeAndClean(text: string): Set<string> {
    const cleaned = text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = cleaned.split(' ');
    const uniqueTokens = new Set<string>();

    for (const word of words) {
      if (word.length > 2 && !DuplicateDetector.STOP_WORDS.has(word)) {
        uniqueTokens.add(word);
      }
    }

    return uniqueTokens;
  }

  /**
   * Update threshold dynamically
   */
  setThreshold(threshold: number): void {
    this.threshold = threshold;
  }

  /**
   * Get current threshold
   */
  getThreshold(): number {
    return this.threshold;
  }
}

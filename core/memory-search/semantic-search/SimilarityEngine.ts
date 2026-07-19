import { GoogleGenAI } from '@google/genai';

export class SimilarityEngine {
  private static instance: SimilarityEngine | null = null;
  
  // Custom technical synonym map to simulate semantic word embeddings locally
  private technicalAssociations: Record<string, string[]> = {
    security: ['privacy', 'threat', 'block', 'mitigation', 'zkp', 'cryptography', 'unauthorized', 'unverified', 'immune', 'protect', 'breach', 'safety'],
    privacy: ['security', 'anonymized', 'zkp', 'cryptography', 'credentials', 'negotiator', 'consent', 'obfuscation', 'leakage', 'zero-knowledge'],
    carbon: ['green', 'compute', 'environmental', 'footprint', 'emissions', 'solar', 'wind', 'sweden', 'electricity', 'eco-friendly', 'efficiency'],
    green: ['carbon', 'sustainability', 'environmental', 'footprint', 'emissions', 'solar', 'wind', 'efficiency'],
    agent: ['orchestrator', 'marketplace', 'collaboration', 'negotiator', 'cooperative', 'specswriter', 'codereviewer', 'assistant', 'twin'],
    react: ['router', 'vite', 'esm', 'suspense', 'components', 'hooks', 'dashboard', 'framer-motion', 'layout', 'ui', 'rendering'],
    learning: ['cognitive', 'graph', 'knowledge', 'concept', 'nodes', 'edges', 'assimilated', 'federated', 'study', 'education'],
    benchmark: ['metrics', 'scores', 'latency', 'throughput', 'evaluation', 'runs', 'dataset', 'comparison', 'testing'],
    performance: ['latency', 'throughput', 'speed', 'slowdown', 'optimize', 'cache', 'time', 'fast', 'compression']
  };

  private stopWords = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 
    'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'cant', 'cannot', 
    'could', 'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during', 'each', 'few', 
    'for', 'from', 'further', 'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'hed', 'hell', 
    'hes', 'her', 'here', 'heres', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 
    'im', 'ive', 'if', 'in', 'into', 'is', 'isnt', 'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 
    'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 
    'ourselves', 'out', 'over', 'own', 'same', 'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 
    'so', 'some', 'such', 'than', 'that', 'thats', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 
    'there', 'theres', 'these', 'they', 'theyd', 'theyll', 'theyre', 'theyve', 'this', 'those', 'through', 
    'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasnt', 'we', 'wed', 'well', 'were', 'weve', 'werent', 
    'what', 'whats', 'when', 'whens', 'where', 'wheres', 'which', 'while', 'who', 'whos', 'whom', 'why', 'whys', 
    'with', 'wont', 'would', 'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve', 'your', 'yours', 'yourself', 
    'yourselves'
  ]);

  private constructor() {}

  public static getInstance(): SimilarityEngine {
    if (!this.instance) {
      this.instance = new SimilarityEngine();
    }
    return this.instance;
  }

  /**
   * Generates a text embedding vector.
   * If a real Gemini API key is configured, uses text-embedding-004 via GoogleGenAI SDK.
   * Otherwise, returns undefined (falling back to TF-IDF cosine matching).
   */
  public async getEmbedding(text: string): Promise<number[] | undefined> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    const hasRealKey = apiKey && apiKey !== 'your_actual_gemini_api_key_here';

    if (!hasRealKey) {
      return undefined;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = (await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: text
      })) as any;

      if (response && response.embedding && response.embedding.values) {
        return response.embedding.values;
      }
      if (response && response.embeddings && response.embeddings.values) {
        return response.embeddings.values;
      }
    } catch (err) {
      console.warn('Gemini Embedding API call failed. Falling back to client-side cosine similarity.', err);
    }
    return undefined;
  }

  /**
   * Calculates cosine similarity between two numeric vectors.
   */
  public calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Client-side fallback similarity calculator.
   * Computes TF-IDF score with synonym query expansions.
   */
  public calculateLocalSimilarity(query: string, documents: string[]): number[] {
    if (!query || documents.length === 0) {
      return new Array(documents.length).fill(0);
    }

    const queryTokens = this.tokenizeAndClean(query);
    if (queryTokens.length === 0) {
      return new Array(documents.length).fill(0);
    }

    // Expand query with synonyms
    const expandedQueryTokens: Record<string, number> = {};
    queryTokens.forEach(token => {
      expandedQueryTokens[token] = (expandedQueryTokens[token] || 0) + 1.0;
      
      // Look up associations
      const associations = this.technicalAssociations[token];
      if (associations) {
        associations.forEach(syn => {
          // Weight synonyms slightly lower (0.45) to avoid false matches overriding direct matches
          expandedQueryTokens[syn] = (expandedQueryTokens[syn] || 0) + 0.45;
        });
      }
    });

    const docTokens = documents.map(doc => this.tokenizeAndClean(doc));
    
    // Build vocabulary
    const vocabulary = new Set<string>();
    Object.keys(expandedQueryTokens).forEach(t => vocabulary.add(t));
    docTokens.forEach(tokens => tokens.forEach(t => vocabulary.add(t)));
    const vocabList = Array.from(vocabulary);

    // Compute Document Frequencies for IDF
    const docFrequency: Record<string, number> = {};
    vocabList.forEach(term => {
      let count = 0;
      docTokens.forEach(tokens => {
        if (tokens.includes(term)) count++;
      });
      docFrequency[term] = count;
    });

    // Compute IDF values
    const idf: Record<string, number> = {};
    const N = documents.length;
    vocabList.forEach(term => {
      const df = docFrequency[term] || 0;
      idf[term] = Math.log(1 + (N - df + 0.5) / (df + 0.5));
    });

    // Compute Query Vector
    const queryVector: Record<string, number> = {};
    vocabList.forEach(term => {
      const tf = expandedQueryTokens[term] || 0;
      queryVector[term] = tf * idf[term];
    });

    // Compute Document Vectors and similarities
    const similarities = docTokens.map(tokens => {
      // Term frequencies for document
      const docTf: Record<string, number> = {};
      tokens.forEach(t => {
        docTf[t] = (docTf[t] || 0) + 1;
      });

      // TF-IDF vector for document
      const docVector: Record<string, number> = {};
      vocabList.forEach(term => {
        const tf = docTf[term] || 0;
        docVector[term] = tf * idf[term];
      });

      // Cosine similarity between queryVector and docVector
      let dot = 0;
      let qNormSq = 0;
      let dNormSq = 0;

      vocabList.forEach(term => {
        const qVal = queryVector[term] || 0;
        const dVal = docVector[term] || 0;
        dot += qVal * dVal;
        qNormSq += qVal * qVal;
        dNormSq += dVal * dVal;
      });

      if (qNormSq === 0 || dNormSq === 0) return 0;
      
      // Return similarity normalized to [0, 1] range
      const sim = dot / (Math.sqrt(qNormSq) * Math.sqrt(dNormSq));
      return Math.max(0, Math.min(1, sim));
    });

    return similarities;
  }

  /**
   * Splits text, removes non-alphanumeric, and filters out standard English stop words.
   */
  private tokenizeAndClean(text: string): string[] {
    const rawWords = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // remove punctuation except dashes
      .split(/[\s_]+/);            // split by space or underscore

    return rawWords.filter(word => word.length > 1 && !this.stopWords.has(word));
  }
}

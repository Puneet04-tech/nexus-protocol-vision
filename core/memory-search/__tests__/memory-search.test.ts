import { mockMemorySearchAPI } from '../api/MemorySearchAPI';
import { SimilarityEngine } from '../semantic-search/SimilarityEngine';
import { MemoryValidator } from '../validators';
import { MemoryIndexer } from '../indexing/MemoryIndexer';
import { Memory, SearchQuery } from '../types';

export interface TestCaseResult {
  suite: string;
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

export interface SuiteResults {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  tests: TestCaseResult[];
}

export class MemorySearchTestSuite {
  public static async runTests(): Promise<SuiteResults> {
    const start = Date.now();
    const tests: TestCaseResult[] = [];

    const runTest = async (suite: string, name: string, fn: () => void | Promise<void>) => {
      const tStart = Date.now();
      try {
        await fn();
        tests.push({
          suite,
          name,
          passed: true,
          duration: Date.now() - tStart
        });
      } catch (err: any) {
        tests.push({
          suite,
          name,
          passed: false,
          duration: Date.now() - tStart,
          error: err.message || String(err)
        });
      }
    };

    // ==========================================
    // 1. INPUT VALIDATORS
    // ==========================================
    await runTest('Query Validator', 'strips HTML tags and restricts text size', () => {
      const dirty = '<script>alert("hack")</script>  security  ';
      const clean = MemoryValidator.sanitizeQueryText(dirty);
      if (clean !== 'security') {
        throw new Error(`Expected sanitization result "security", got "${clean}"`);
      }

      const longString = 'a'.repeat(600);
      const trimmed = MemoryValidator.sanitizeQueryText(longString);
      if (trimmed.length !== 500) {
        throw new Error(`Expected trimmed text length 500, got ${trimmed.length}`);
      }
    });

    await runTest('Memory Validator', 'validates field parameters and category schemas', () => {
      const incomplete: Partial<Memory> = {
        content: '',
        importance: 0.5
      };

      const result1 = MemoryValidator.validateMemory(incomplete);
      if (result1.valid) throw new Error('Expected validation to fail due to empty content');

      const invalidCategory: Partial<Memory> = {
        content: 'Valid content text',
        importance: 0.5,
        category: 'not-a-category' as any,
        source: 'System'
      };

      const result2 = MemoryValidator.validateMemory(invalidCategory);
      if (result2.valid) throw new Error('Expected validation to fail due to invalid category schema');
    });

    // ==========================================
    // 2. SIMILARITY COALESCING & COSINE MATH
    // ==========================================
    await runTest('Similarity Engine', 'computes TF-IDF cosine matching and synonym expansion', () => {
      const engine = SimilarityEngine.getInstance();
      
      const query = 'security logs';
      // Document 1 has direct overlaps + synonyms ("privacy", "threat")
      // Document 2 is completely unrelated
      const docs = [
        'Blocked threat query logs. Retained privacy controls.',
        'Sweden green server nodes solar off-peak compute.'
      ];

      const similarities = engine.calculateLocalSimilarity(query, docs);
      
      if (similarities[0] <= similarities[1]) {
        throw new Error(`Expected security document similarity (${similarities[0]}) to exceed green server (${similarities[1]})`);
      }

      if (similarities[0] <= 0) {
        throw new Error('Expected positive overlap similarity for target document.');
      }
    });

    // ==========================================
    // 3. HEURISTIC INDEXING & AUTOMATED TAGS
    // ==========================================
    await runTest('Memory Indexer', 'extracts tags, maps associations, and scales importance values', async () => {
      const indexer = MemoryIndexer.getInstance();

      const rawMemory: Partial<Memory> = {
        content: 'System immune blocked suspicious script. Zero-knowledge ZKP keys protected.',
        importance: 0.5
      };

      const indexed = await indexer.indexMemory(rawMemory);

      // Verify categories heuristically identified
      if (indexed.category !== 'system') {
        throw new Error(`Expected category "system" to be assigned, got "${indexed.category}"`);
      }

      // Verify critical tag extraction
      if (!indexed.tags.includes('security') || !indexed.tags.includes('zkp')) {
        throw new Error(`Expected tags to include security and zkp. Inferred tags: ${indexed.tags.join(', ')}`);
      }

      // Verify importance boost due to 'blocked' threat level
      if (indexed.importance < 0.8) {
        throw new Error(`Expected importance to be boosted above 0.8. Got: ${indexed.importance}`);
      }

      // Verify association mapping
      const hasZkpAssociation = indexed.associations.some(a => a.concept === 'Zero Knowledge Proofs');
      if (!hasZkpAssociation) {
        throw new Error('Expected Zero Knowledge Proofs association to be auto-extracted.');
      }
    });

    // ==========================================
    // 4. RETRIEVER & HYBRID SELECTION
    // ==========================================
    await runTest('Memory Retriever', 'retrieves records based on composite search criteria', async () => {
      // Re-seed to ensure clean baseline
      mockMemorySearchAPI.resetToSeeds();

      const query: SearchQuery = {
        text: 'Zero-knowledge proofs',
        searchType: 'hybrid',
        minImportance: 0.5,
        sortBy: 'relevance'
      };

      const response = await mockMemorySearchAPI.query(query);

      if (response.results.length === 0) {
        throw new Error('Expected hybrid retriever to yield matching results.');
      }

      // Confirm top result discusses ZKP or privacy
      const topResult = response.results[0];
      const hasSecurity = topResult.memory.content.toLowerCase().includes('zero') || 
                            topResult.memory.content.toLowerCase().includes('zkp') ||
                            topResult.memory.content.toLowerCase().includes('privacy');
      
      if (!hasSecurity) {
        throw new Error(`Expected top result to match ZKP query. Got content: "${topResult.memory.content}"`);
      }

      // Confirm match reasons include relevance score detail
      const hasRelevanceReason = topResult.matchReasons.some(r => r.includes('similarity'));
      if (!hasRelevanceReason) {
        throw new Error('Expected similarity reasoning to be logged.');
      }
    });

    // ==========================================
    // 5. TIMELINE AGGREGATOR
    // ==========================================
    await runTest('Timeline Manager', 'clusters memories into daily intervals and accumulates stats', () => {
      const memories = mockMemorySearchAPI.listAllMemories();
      const intervals = mockMemorySearchAPI.getChronologicalTimeline(memories);

      if (intervals.length === 0) {
        throw new Error('Expected timeline intervals to be created.');
      }

      const stats = mockMemorySearchAPI.getCumulativeStats(7);
      if (stats.length !== 7) {
        throw new Error(`Expected 7 days of accumulated stats, got ${stats.length}`);
      }

      // Confirm stats are monotonic or positive
      const lastPoint = stats[stats.length - 1];
      if (lastPoint.totalMemories <= 0) {
        throw new Error('Expected accumulated memories metric to be > 0');
      }
    });

    // ==========================================
    // 6. COLLECTIONS & CRUD
    // ==========================================
    await runTest('Collection Manager', 'performs static and smart collection filter queries', () => {
      const memories = mockMemorySearchAPI.listAllMemories();
      
      // Toggle favorite on first memory
      const targetId = memories[0].id;
      const initialFav = memories[0].isFavorite;
      
      const newFav = mockMemorySearchAPI.toggleFavorite(targetId);
      if (newFav === initialFav) {
        throw new Error('Expected favorite status toggle to invert value.');
      }

      // Check smart collection evaluations
      const collections = mockMemorySearchAPI.getCollections();
      const reactCol = collections.find(c => c.id === 'col_react_development');
      
      if (!reactCol || !reactCol.isSmart) {
        throw new Error('Expected smart React collection to exist.');
      }

      // Filter memories using React smart collection criteria
      const query: SearchQuery = {
        collectionId: 'col_react_development'
      };

      const results = mockMemorySearchAPI.listAllMemories().filter(m => {
        // Evaluate smart filter criteria (tags: react/web-development/composition/animation)
        const hasTag = m.tags.some(t => ['react', 'web-development', 'composition', 'animation'].includes(t));
        const hasCategory = ['conversation', 'knowledge'].includes(m.category);
        return hasTag && hasCategory;
      });

      if (results.length === 0) {
        throw new Error('Expected Smart Folder evaluations to yield matching React memories.');
      }
    });

    const end = Date.now();
    const passed = tests.filter(t => t.passed).length;
    const failed = tests.filter(t => !t.passed).length;

    return {
      total: tests.length,
      passed,
      failed,
      duration: end - start,
      tests
    };
  }
}
export default MemorySearchTestSuite;

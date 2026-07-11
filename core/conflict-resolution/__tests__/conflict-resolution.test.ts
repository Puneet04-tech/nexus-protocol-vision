import { CognitiveGraph } from '../../sovereign-persona/CognitiveGraph';
import { GraphNode, GraphEdge } from '../../sovereign-persona/types';
import { ConflictResolutionEngine } from '../ConflictResolutionEngine';
import { ResolutionStrategy } from '../models/ResolutionRecommendation';
import { ConflictType } from '../models/KnowledgeConflict';

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

/**
 * Diagnostic test harness for conflict resolution system validation
 */
export class ConflictResolutionTestSuite {
  public static async runTests(graphInstance?: CognitiveGraph): Promise<SuiteResults> {
    const start = Date.now();
    const tests: TestCaseResult[] = [];

    const runTest = async (
      suite: string,
      name: string,
      fn: () => void | Promise<void>
    ) => {
      const tStart = Date.now();
      try {
        await fn();
        tests.push({
          suite,
          name,
          passed: true,
          duration: Date.now() - tStart,
        });
      } catch (err: any) {
        tests.push({
          suite,
          name,
          passed: false,
          duration: Date.now() - tStart,
          error: err.message || String(err),
        });
      }
    };

    // Save previous localstorage states
    const prevConflicts = localStorage.getItem('nexus_conflict_list');
    const prevDecisions = localStorage.getItem('nexus_conflict_decisions');
    const prevLogs = localStorage.getItem('nexus_conflict_audit_logs');
    const prevVersions = localStorage.getItem('nexus_conflict_node_versions');

    // Reset localstorage for test runs
    localStorage.removeItem('nexus_conflict_list');
    localStorage.removeItem('nexus_conflict_decisions');
    localStorage.removeItem('nexus_conflict_audit_logs');
    localStorage.removeItem('nexus_conflict_node_versions');

    const engine = new ConflictResolutionEngine();
    
    // Set up mock nodes for tests
    const graph = new CognitiveGraph('test-persona');
    const baseNodes: GraphNode[] = [
      {
        id: 'quantum_computing',
        domain: 'physics',
        complexity: 0.9,
        confidence: 0.8,
        lastAccessed: Date.now(),
        accessCount: 10,
        relatedConcepts: ['physics', 'mathematics'],
        metadata: {
          interactions: [
            { timestamp: Date.now() - 5000, type: 'article', context: { confidence: 0.8 } }
          ]
        }
      },
      {
        id: 'quantum_compute', 
        domain: 'physics',
        complexity: 0.85,
        confidence: 0.7,
        lastAccessed: Date.now(),
        accessCount: 2,
        relatedConcepts: ['programming'],
        metadata: {}
      },
      {
        id: 'deep_learning',
        domain: 'ai',
        complexity: 0.8,
        confidence: 0.9,
        lastAccessed: Date.now(),
        accessCount: 5,
        relatedConcepts: ['programming', 'statistics'],
        metadata: {}
      },
      {
        id: 'statistics',
        domain: 'math',
        complexity: 0.5,
        confidence: 0.95,
        lastAccessed: Date.now(),
        accessCount: 15,
        relatedConcepts: [],
        metadata: {}
      }
    ];

    const baseEdges: GraphEdge[] = [
      {
        id: 'quantum_computing-physics',
        source: 'quantum_computing',
        target: 'physics',
        weight: 0.8,
        type: 'domain-related',
        strength: 0.8
      },
      {
        id: 'deep_learning-programming',
        source: 'deep_learning',
        target: 'programming',
        weight: 0.7,
        type: 'prerequisite',
        strength: 0.7
      }
    ];

    graph.importGraph({ nodes: baseNodes, edges: baseEdges });

    // ==========================================
    // 1. DUPLICATE & OVERLAP DETECTION TESTS
    // ==========================================
    await runTest('Duplicate Detection', 'detects duplicate concept ids via normalisation check', () => {
      const conflicts = engine.runDetection(graph);
      const dup = conflicts.find(c => c.type === ConflictType.DUPLICATE_NODE);
      if (!dup) throw new Error('Expected duplicate conflict between quantum_computing and quantum_compute.');
      if (dup.targetNodeId !== 'quantum_computing' || dup.conflictingNodeId !== 'quantum_compute') {
        throw new Error('Incorrect duplicate concept mapping.');
      }
    });

    await runTest('Duplicate Detection', 'detects semantic overlap when labels are close', () => {
      const nodes = [...graph.exportGraph().nodes];
      nodes.push({
        id: 'neural_network_learning',
        domain: 'ai',
        complexity: 0.75,
        confidence: 0.6,
        lastAccessed: Date.now(),
        accessCount: 1,
        relatedConcepts: ['programming', 'statistics'],
        metadata: {}
      });
      graph.importGraph({ nodes, edges: graph.exportGraph().edges });
      
      const conflicts2 = engine.runDetection(graph);
      const overlap2 = conflicts2.find(c => c.type === ConflictType.SEMANTIC_OVERLAP);
      if (!overlap2) throw new Error('Expected semantic overlap between deep_learning and neural_network_learning.');
    });

    // ==========================================
    // 2. VERSION & CHANGE HISTORY TESTS
    // ==========================================
    await runTest('Version Manager', 'saves node state snapshots and registers version increments', () => {
      const versions = engine.getVersionManager();
      const node = graph.exportGraph().nodes.find(n => n.id === 'quantum_computing')!;
      
      const v1 = versions.saveVersion(node, 'Admin', 'Initial setup');
      if (v1.version !== 1) throw new Error('Expected initial version number to be 1.');

      node.confidence = 0.95;
      const v2 = versions.saveVersion(node, 'Admin', 'Confidence update');
      if (v2.version !== 2) throw new Error('Expected version bump to 2.');

      const history = versions.getHistory('quantum_computing');
      if (history.length !== 2) throw new Error(`Expected history length 2, got ${history.length}`);
      if (history[0].nodeState.confidence !== 0.8 || history[1].nodeState.confidence !== 0.95) {
        throw new Error('Version records contain mismatched attribute snapshots.');
      }
    });

    // ==========================================
    // 3. EVIDENCE SCORING & RECOMMENDATION TESTS
    // ==========================================
    await runTest('Recommendation Engine', 'rates resolution confidence and ranks strategy recommendations', () => {
      const conflicts = engine.runDetection(graph);
      const dup = conflicts.find(c => c.type === ConflictType.DUPLICATE_NODE)!;

      const recs = engine.getRecommendationsForConflict(dup.id, graph);
      if (recs.length === 0) throw new Error('Failed to generate recommendations.');
      if (recs[0].strategy !== ResolutionStrategy.MERGE) {
        throw new Error(`Expected highest ranked suggestion to be MERGE, got ${recs[0].strategy}`);
      }
      if (recs[0].confidence < 0.6) {
        throw new Error(`Resolution confidence score is too low: ${recs[0].confidence}`);
      }
    });

    // ==========================================
    // 4. GRAPH RESOLUTION & MUTATION TESTS
    // ==========================================
    await runTest('Resolution Engine', 'applies KEEP_EXISTING strategy: purges conflicting node and reroutes edges', () => {
      const conflicts = engine.runDetection(graph);
      const dup = conflicts.find(c => c.type === ConflictType.DUPLICATE_NODE)!;

      const edges = [...graph.exportGraph().edges];
      edges.push({
        id: 'quantum_compute-statistics',
        source: 'quantum_compute',
        target: 'statistics',
        weight: 0.6,
        type: 'prerequisite',
        strength: 0.6
      });
      graph.importGraph({ nodes: graph.exportGraph().nodes, edges });

      engine.resolveConflict(graph, dup.id, ResolutionStrategy.KEEP_EXISTING, 'Security Officer', 'Discard duplicate node');

      const finalGraph = graph.exportGraph();
      const hasConflictNode = finalGraph.nodes.some(n => n.id === 'quantum_compute');
      if (hasConflictNode) throw new Error('KEEP_EXISTING failed to remove conflicting duplicate node from active graph.');

      const hasEdge = finalGraph.edges.some(e => e.source === 'quantum_compute' || e.target === 'quantum_compute');
      if (hasEdge) throw new Error('Offending duplicate edges were not cleaned up.');
    });

    await runTest('Resolution Engine', 'applies MERGE strategy: aggregates metadata and averages masteries', () => {
      const nodes = [...graph.exportGraph().nodes];
      nodes.push({
        id: 'deep_learn',
        domain: 'ai',
        complexity: 0.6,
        confidence: 0.7,
        lastAccessed: Date.now() - 10000,
        accessCount: 3,
        relatedConcepts: ['programming'],
        metadata: { context: { tag: 'old' } }
      });
      graph.importGraph({ nodes, edges: graph.exportGraph().edges });

      const conflicts = engine.runDetection(graph);
      const dup = conflicts.find(c => c.targetNodeId === 'deep_learning' && c.conflictingNodeId === 'deep_learn')!;

      engine.resolveConflict(graph, dup.id, ResolutionStrategy.MERGE, 'Security Officer', 'Merge duplicates');

      const finalGraph = graph.exportGraph();
      const deepLNode = finalGraph.nodes.find(n => n.id === 'deep_learning')!;
      
      if (Math.abs(deepLNode.confidence - 0.85) > 0.01) {
        throw new Error(`Expected merged confidence to be 0.85, got ${deepLNode.confidence}`);
      }
      
      if (deepLNode.accessCount !== 8) {
        throw new Error(`Expected combined access counts to be 8, got ${deepLNode.accessCount}`);
      }

      if (finalGraph.nodes.some(n => n.id === 'deep_learn')) {
        throw new Error('Conflicting merged node deep_learn was not removed.');
      }
    });

    // ==========================================
    // 5. ROLLBACK OPERATIONS
    // ==========================================
    await runTest('Rollback', 'restores node state back to past version snapshot', () => {
      const manager = engine.getVersionManager();
      const history = manager.getHistory('deep_learning');
      if (history.length === 0) throw new Error('Expected backup version records for deep_learning.');

      engine.rollbackNode(graph, 'deep_learning', 1, 'Admin');

      const rolledBackNode = graph.exportGraph().nodes.find(n => n.id === 'deep_learning')!;
      if (rolledBackNode.confidence !== 0.9) {
        throw new Error(`Expected rolled back confidence to be 0.9, got ${rolledBackNode.confidence}`);
      }
    });

    // ==========================================
    // 6. CRYPTOGRAPHIC TAMPER DETECTION
    // ==========================================
    await runTest('Audit Trail', 'creates hash chain links and validates tampering', () => {
      const logs = engine.getHistoryManager().getAuditLogs();
      if (logs.length === 0) throw new Error('Audit logs are empty.');

      const verifyReport = engine.getHistoryManager().verifyIntegrity();
      if (!verifyReport.verified) {
        throw new Error(`Integrity checks failed on healthy chain: ${verifyReport.message}`);
      }

      // Tamper with logs
      const rawLogs = JSON.parse(localStorage.getItem('nexus_conflict_audit_logs') || '[]');
      if (rawLogs.length > 0) {
        rawLogs[0].actor = 'Malicious Hack';
        localStorage.setItem('nexus_conflict_audit_logs', JSON.stringify(rawLogs));
        
        const tamperedEngine = new ConflictResolutionEngine();
        const verifyTamper = tamperedEngine.getHistoryManager().verifyIntegrity();
        if (verifyTamper.verified) {
          throw new Error('Tamper validation failed to flag modified logs in storage chain.');
        }
      }
    });

    // ==========================================
    // 7. GRAPH INTEGRITY VALIDATOR TESTS
    // ==========================================
    await runTest('Static Validator', 'detects invalid references and dependency cycles', () => {
      const nodes = [...graph.exportGraph().nodes];
      const edges = [...graph.exportGraph().edges];

      edges.push({
        id: 'quantum_computing-deep_learning',
        source: 'quantum_computing',
        target: 'deep_learning',
        weight: 0.5,
        type: 'prerequisite',
        strength: 0.5
      });
      edges.push({
        id: 'deep_learning-quantum_computing',
        source: 'deep_learning',
        target: 'quantum_computing',
        weight: 0.5,
        type: 'prerequisite',
        strength: 0.5
      });

      edges.push({
        id: 'deep_learning-missing',
        source: 'deep_learning',
        target: 'non_existent_node',
        weight: 0.5,
        type: 'related-concept',
        strength: 0.5
      });

      graph.importGraph({ nodes, edges });

      const report = engine.validateGraph(graph);
      
      const cycleIssue = report.issues.find(i => i.type === 'CYCLIC_DEPENDENCY');
      if (!cycleIssue) throw new Error('Static check failed to identify circular dependency loop.');

      const invalidIssue = report.issues.find(i => i.type === 'INVALID_RELATIONSHIP');
      if (!invalidIssue) throw new Error('Static check failed to flag edge pointing to missing node.');

      if (report.graphHealthScore >= 80) {
        throw new Error(`Graph health score should be degraded. Score: ${report.graphHealthScore}`);
      }
    });

    // ==========================================
    // 8. PERFORMANCE BENCHMARKS (1000 Nodes Scan)
    // ==========================================
    await runTest('Performance Metric', 'scans 1000 nodes for conflicts in under 50ms', () => {
      const perfNodes: GraphNode[] = [];
      const perfEdges: GraphEdge[] = [];

      for (let i = 0; i < 1000; i++) {
        perfNodes.push({
          id: `perf_node_${i}`,
          domain: i % 2 === 0 ? 'math' : 'physics',
          complexity: Math.random(),
          confidence: Math.random(),
          lastAccessed: Date.now(),
          accessCount: 1,
          relatedConcepts: [],
          metadata: {}
        });
      }

      const pStart = performance.now();
      engine.validateGraph({
        exportGraph: () => ({
          personaId: 'perf',
          exportedAt: Date.now(),
          state: {} as any,
          nodes: perfNodes,
          edges: perfEdges
        }),
        importGraph: () => {}
      } as any);
      const elapsed = performance.now() - pStart;

      if (elapsed > 50) {
        throw new Error(`Static validation scan took ${elapsed.toFixed(1)}ms. Exceeded 50ms performance target.`);
      }
    });

    // Restore previous storage states
    if (prevConflicts) localStorage.setItem('nexus_conflict_list', prevConflicts);
    else localStorage.removeItem('nexus_conflict_list');

    if (prevDecisions) localStorage.setItem('nexus_conflict_decisions', prevDecisions);
    else localStorage.removeItem('nexus_conflict_decisions');

    if (prevLogs) localStorage.setItem('nexus_conflict_audit_logs', prevLogs);
    else localStorage.removeItem('nexus_conflict_audit_logs');

    if (prevVersions) localStorage.setItem('nexus_conflict_node_versions', prevVersions);
    else localStorage.removeItem('nexus_conflict_node_versions');

    const end = Date.now();
    const passed = tests.filter((t) => t.passed).length;
    const failed = tests.filter((t) => !t.passed).length;

    return {
      total: tests.length,
      passed,
      failed,
      duration: end - start,
      tests,
    };
  }
}

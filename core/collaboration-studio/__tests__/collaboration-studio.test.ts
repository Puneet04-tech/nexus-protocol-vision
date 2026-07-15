import { CollaborationAPI, mockCollaborationAPI } from '../api/CollaborationAPI';
import { CollaborationWorkflow, NodeState, WorkflowState, NodeConfig, AgentNode, MessageType, MemoryScope } from '../types';
import { WorkflowValidator } from '../validators/WorkflowValidator';
import { DAGResolver } from '../workflow-engine/DAGResolver';
import { SharedMemory } from '../shared-context/SharedMemory';
import { mockMessageBus } from '../communication/AgentMessageBus';
import { ApprovalGate } from '../approvals/ApprovalGate';
import { SovereignPersona } from '../../sovereign-persona/SovereignPersona';

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

export class CollaborationStudioTestSuite {
  public static async runTests(personaInstance: SovereignPersona | null): Promise<SuiteResults> {
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

    // Helper: generate basic workflow mock
    const createBaseMockWorkflow = (): CollaborationWorkflow => ({
      id: 'test-wf-id',
      name: 'Test Workflow',
      description: 'A mock workflow for testing',
      version: 1,
      isDraft: false,
      isTemplate: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      globalContext: {
        inputValue: 'Hello World',
        numericValue: 42
      },
      nodes: [
        {
          id: 'node-1',
          name: 'Start Trigger',
          type: 'start',
          position: { x: 0, y: 0 },
          config: { inputMappings: {} },
          state: NodeState.PENDING,
          retriesAttempted: 0
        },
        {
          id: 'node-2',
          name: 'RAG Agent',
          type: 'agent',
          position: { x: 100, y: 0 },
          config: {
            agentId: 'marketplace.rag.searcher',
            taskName: 'semantic_search',
            inputMappings: {
              query: '$.global.inputValue'
            }
          },
          state: NodeState.PENDING,
          retriesAttempted: 0
        },
        {
          id: 'node-3',
          name: 'End Gate',
          type: 'end',
          position: { x: 200, y: 0 },
          config: { inputMappings: {} },
          state: NodeState.PENDING,
          retriesAttempted: 0
        }
      ],
      edges: [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
        { id: 'edge-2', source: 'node-2', target: 'node-3' }
      ]
    });

    // ==========================================
    // 1. WORKFLOW VALIDATION & CYCLE TESTS
    // ==========================================
    await runTest('Workflow Validation', 'passes on valid DAG workflow structure', () => {
      const wf = createBaseMockWorkflow();
      const report = WorkflowValidator.validate(wf);
      if (!report.isValid) {
        throw new Error(`Expected validation to succeed, got errors: ${report.errors.join('; ')}`);
      }
    });

    await runTest('Workflow Validation', 'detects missing Start trigger node', () => {
      const wf = createBaseMockWorkflow();
      wf.nodes = wf.nodes.filter(n => n.type !== 'start');
      const report = WorkflowValidator.validate(wf);
      if (report.isValid) {
        throw new Error('Expected validation to fail due to missing Start Trigger.');
      }
      if (!report.errors.some(e => e.includes('missing a Start Trigger'))) {
        throw new Error('Expected "missing a Start Trigger" error message.');
      }
    });

    await runTest('Workflow Validation', 'detects dependency cyclic structures', () => {
      const wf = createBaseMockWorkflow();
      // Add back-edge node-3 -> node-1 to introduce a cycle
      wf.edges.push({ id: 'edge-cycle', source: 'node-3', target: 'node-1' });
      const report = WorkflowValidator.validate(wf);
      if (report.isValid) {
        throw new Error('Expected cycle validation to fail.');
      }
      if (!report.errors.some(e => e.includes('dependency loop detected'))) {
        throw new Error('Expected cyclic dependency loop warning/error message.');
      }
    });

    // ==========================================
    // 2. DAG RESOLVER & GROUPING TESTS
    // ==========================================
    await runTest('DAG Resolver', 'sorts nodes topologically correctly', () => {
      const wf = createBaseMockWorkflow();
      const sorted = DAGResolver.resolve(wf.nodes, wf.edges);
      if (sorted.length !== 3) {
        throw new Error(`Expected 3 nodes sorted, got ${sorted.length}`);
      }
      if (sorted[0].id !== 'node-1' || sorted[1].id !== 'node-2' || sorted[2].id !== 'node-3') {
        throw new Error('Topological sort sequence is incorrect.');
      }
    });

    await runTest('DAG Resolver', 'groups nodes into level tiers for parallel tasks', () => {
      const wf = createBaseMockWorkflow();
      // Add node-4 that runs in parallel to node-2: start -> node-4 -> end
      wf.nodes.push({
        id: 'node-4',
        name: 'Crypto Scan',
        type: 'agent',
        position: { x: 100, y: 100 },
        config: {
          agentId: 'marketplace.crypto.guard',
          taskName: 'validate_key',
          inputMappings: { pubkey: '0xTestKey' }
        },
        state: NodeState.PENDING,
        retriesAttempted: 0
      });
      wf.edges.push(
        { id: 'edge-3', source: 'node-1', target: 'node-4' },
        { id: 'edge-4', source: 'node-4', target: 'node-3' }
      );

      const levels = DAGResolver.groupIntoLevels(wf.nodes, wf.edges);
      if (levels.length !== 3) {
        throw new Error(`Expected 3 levels of execution, got ${levels.length}`);
      }
      // Level 0: Start node
      if (levels[0].length !== 1 || levels[0][0].id !== 'node-1') {
        throw new Error('Level 0 must isolate the Start node.');
      }
      // Level 1: RAG node and Crypto node running in parallel
      const lvl1Ids = levels[1].map(n => n.id);
      if (lvl1Ids.length !== 2 || !lvl1Ids.includes('node-2') || !lvl1Ids.includes('node-4')) {
        throw new Error('Level 1 failed to identify parallel nodes.');
      }
    });

    // ==========================================
    // 3. SHARED MEMORY CONTEXT TESTS
    // ==========================================
    await runTest('Shared Memory', 'resolves globals and properties interpolation paths', () => {
      const globals = { text: 'Hello', limit: 5 };
      const mem = new SharedMemory(globals);

      // Verify global lookup
      const resolvedGlobal = mem.resolveValue('$.global.text');
      if (resolvedGlobal !== 'Hello') {
        throw new Error(`Expected global lookup 'Hello', got '${resolvedGlobal}'`);
      }

      // Set node outputs simulation
      mem.setVariable('node_output_node-1', {
        success: true,
        data: {
          records: [{ name: 'Twin A' }, { name: 'Twin B' }]
        }
      }, MemoryScope.GLOBAL, 'node-1');

      // Verify node drilldown lookup
      const resolvedProp = mem.resolveValue('$.node-1.data.records[1].name');
      if (resolvedProp !== 'Twin B') {
        throw new Error(`Expected dynamic drilldown 'Twin B', got '${resolvedProp}'`);
      }
    });

    // ==========================================
    // 4. AGENT MESSAGING & CONFLICT RESOLUTION
    // ==========================================
    await runTest('Agent Message Bus', 'supports broadcasting and conflict resolution algorithms', async () => {
      mockMessageBus.clear();
      
      let msgReceived = false;
      mockMessageBus.subscribe('chan_test-channel', msg => {
        if (msg.payload.data === 'broadcasting') {
          msgReceived = true;
        }
      });

      mockMessageBus.sendMessage('node-1', undefined, MessageType.BROADCAST, { data: 'broadcasting' }, 'test-channel');
      if (!msgReceived) {
        throw new Error('Broadcast message not received by listener.');
      }

      // Verify Consensus logic
      const candidates = [
        { nodeId: 'node-A', value: 'green-grid', reputation: 70 },
        { nodeId: 'node-B', value: 'solar-grid', reputation: 95 },
        { nodeId: 'node-C', value: 'green-grid', reputation: 80 }
      ];

      // Consensus should select 'green-grid' as it occurs twice
      const consensusWinner = await mockMessageBus.resolveConflict('consensus', candidates);
      if (consensusWinner !== 'green-grid') {
        throw new Error(`Expected consensus winner 'green-grid', got '${consensusWinner}'`);
      }

      // Reputation should select 'solar-grid' as Node-B has highest score (95)
      const reputationWinner = await mockMessageBus.resolveConflict('reputation', candidates);
      if (reputationWinner !== 'solar-grid') {
        throw new Error(`Expected reputation winner 'solar-grid', got '${reputationWinner}'`);
      }
    });

    // ==========================================
    // 5. HUMAN APPROVAL GATES
    // ==========================================
    await runTest('Approval Gate', 'freezes task thread and resumes on decision', async () => {
      const execId = 'test-exec-approval';
      const nodeId = 'node-approval';

      // Dispatches approval request in background
      const approvalPromise = ApprovalGate.requestApproval(execId, nodeId, { param: 'check' });

      const pending = ApprovalGate.getPendingForExecution(execId);
      if (pending.length !== 1 || pending[0].nodeId !== nodeId) {
        throw new Error('Expected one pending approval request stored.');
      }

      // Resolve approval
      ApprovalGate.resolveApproval(pending[0].id, 'APPROVED', undefined, 'Compliance verified');

      const outcome = await approvalPromise;
      if (outcome.status !== 'APPROVED') {
        throw new Error('Expected resolved request to be APPROVED.');
      }
    });

    // ==========================================
    // 6. WORKFLOW EXECUTION INTEGRATION
    // ==========================================
    await runTest('Collaboration API', 'plans, executes, and records metrics logs', async () => {
      await mockCollaborationAPI.clearAll();
      const wf = createBaseMockWorkflow();
      
      // Save workflow
      const report = await mockCollaborationAPI.saveWorkflow(wf);
      if (!report.isValid) {
        throw new Error('Saved workflow is invalid.');
      }

      // Run execution
      let completed = false;
      const execution = await mockCollaborationAPI.executeWorkflow(wf.id, personaInstance, 2, exec => {
        if (exec.state === WorkflowState.COMPLETED) {
          completed = true;
        }
      });

      // Wait a short time to let the execution finish
      await new Promise(r => setTimeout(r, 1500));

      const updated = await mockCollaborationAPI.getWorkflowMetrics(wf.id);
      if (updated.runsCount === 0) {
        throw new Error('Expected at least one metric run logged.');
      }
    });

    // Clean up singleton states
    mockMessageBus.clear();
    ApprovalGate.listAllApprovals().forEach(req => {
      ApprovalGate.resolveApproval(req.id, 'REJECTED');
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
export default CollaborationStudioTestSuite;

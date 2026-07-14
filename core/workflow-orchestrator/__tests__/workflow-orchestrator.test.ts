import { WorkflowOrchestrator } from '../WorkflowOrchestrator';
import { WorkflowState, TaskState, TaskType, BackoffPolicy, TaskDefinition } from '../types';
import { DependencyResolver } from '../DependencyResolver';
import { WorkflowScheduler } from '../WorkflowScheduler';
import { RetryManager } from '../RetryManager';

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

export class WorkflowOrchestratorTestSuite {
  /**
   * Run all Workflow Orchestrator tests and return results.
   */
  public static async runTests(personaInstance: any): Promise<SuiteResults> {
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

    const orchestrator = WorkflowOrchestrator.getInstance();
    const registry = orchestrator.getRegistry();
    const eventBus = orchestrator.getEventBus();

    // Reset instances for clean test run
    eventBus.clearAllListeners();
    orchestrator.getMonitor().clearMetrics();

    // ==========================================
    // 1. WORKFLOW PLANNING TESTS
    // ==========================================
    await runTest('Workflow Planning', 'creates correct DAG for Full Coordination goal', () => {
      const wf = orchestrator.plan('Full Coordination model training with carbon aware optimizer and secure negotiator');
      
      if (wf.state !== WorkflowState.PENDING) {
        throw new Error(`Expected PENDING workflow state, got ${wf.state}`);
      }

      // Check task presence
      const tasks = Array.from(wf.tasks.values());
      const hasPersona = tasks.some((t) => t.type === TaskType.PERSONA_VALIDATION);
      const hasCarbon = tasks.some((t) => t.type === TaskType.CARBON_OPTIMIZATION);
      const hasPrivacy = tasks.some((t) => t.type === TaskType.PRIVACY_NEGOTIATION);
      const hasFederated = tasks.some((t) => t.type === TaskType.FEDERATED_ROUND);

      if (!hasPersona || !hasCarbon || !hasPrivacy || !hasFederated) {
        throw new Error('Planned workflow is missing required protocol tasks.');
      }

      // Check dependencies mapping
      const federatedTask = wf.tasks.get('task-federated-round');
      if (!federatedTask) {
        throw new Error('Federated round task not found');
      }

      if (
        !federatedTask.dependencies.includes('task-privacy-negotiation') ||
        !federatedTask.dependencies.includes('task-morphnet-compression')
      ) {
        throw new Error('Task dependencies are not mapped correctly in the DAG.');
      }
    });

    await runTest('Workflow Planning', 'dynamically compiles chains from keyword strings', () => {
      const wf = orchestrator.plan('sustainability audit with security threats protection');
      
      const tasks = Array.from(wf.tasks.values());
      const hasCarbon = tasks.some((t) => t.type === TaskType.CARBON_OPTIMIZATION);
      const hasSecurity = tasks.some((t) => t.type === TaskType.SECURITY_SHIELD);
      const hasFederated = tasks.some((t) => t.type === TaskType.FEDERATED_ROUND);

      if (!hasCarbon || !hasSecurity) {
        throw new Error('Dynamic keyword planning missed specified tasks.');
      }
      if (hasFederated) {
        throw new Error('Federated round planned when not specified in keywords.');
      }
    });

    // ==========================================
    // 2. DEPENDENCY RESOLUTION TESTS
    // ==========================================
    await runTest('Dependency Resolution', 'resolves topological sorting correctly', () => {
      const wf = orchestrator.plan('Full Coordination goal');
      const resolved = DependencyResolver.resolve(Array.from(wf.tasks.values()));
      
      const personaIndex = resolved.findIndex((t) => t.id === 'task-persona-validation');
      const shieldIndex = resolved.findIndex((t) => t.id === 'task-security-shield');
      const privacyIndex = resolved.findIndex((t) => t.id === 'task-privacy-negotiation');
      const fedIndex = resolved.findIndex((t) => t.id === 'task-federated-round');

      if (personaIndex > shieldIndex || shieldIndex > privacyIndex || privacyIndex > fedIndex) {
        throw new Error('Topological sort order violated dependencies.');
      }
    });

    await runTest('Dependency Resolution', 'detects dependency cycles and throws validation error', () => {
      const wf = orchestrator.plan('simple verify');
      
      // Introduce cycle
      const t1 = wf.tasks.get('task-persona-validation')!;
      const t2 = wf.tasks.get('task-explainability')!;

      t1.dependencies = [t2.id]; // 1 depends on 2, and 2 depends on 1 (cycle)

      try {
        DependencyResolver.resolve(Array.from(wf.tasks.values()));
        throw new Error('Cyclic sorting resolved without throwing error!');
      } catch (err: any) {
        if (!err.message.includes('Cyclic dependency detected')) {
          throw new Error(`Unexpected error thrown during cycle verification: ${err.message}`);
        }
      }
    });

    // ==========================================
    // 3. PARALLEL SCHEDULING TESTS
    // ==========================================
    await runTest('Parallel Scheduling', 'groups tasks by parallel levels correctly', () => {
      const wf = orchestrator.plan('Full Coordination goal');
      const levels = DependencyResolver.groupIntoLevels(Array.from(wf.tasks.values()));

      // Level 0 should contain persona validation (independent)
      if (levels[0].length !== 1 || levels[0][0].id !== 'task-persona-validation') {
        throw new Error('Level 0 did not isolate persona validation task.');
      }

      // Level 1 should contain security scan and carbon profiling running in parallel
      const lvl1Ids = levels[1].map((t) => t.id);
      if (!lvl1Ids.includes('task-security-shield') || !lvl1Ids.includes('task-carbon-optimization')) {
        throw new Error('Level 1 failed to group parallelizable tasks.');
      }
    });

    await runTest('Parallel Scheduling', 'satisfies ready tasks and respects concurrency caps', () => {
      const wf = orchestrator.plan('Full Coordination goal');
      
      // Persona validation is pending, so only it should be schedulable
      let schedulable = WorkflowScheduler.getSchedulableTasks(wf, 10);
      if (schedulable.length !== 1 || schedulable[0].id !== 'task-persona-validation') {
        throw new Error('Unsatisfied task scheduled.');
      }

      // Concurrency limit is 0, so nothing schedulable
      schedulable = WorkflowScheduler.getSchedulableTasks(wf, 0);
      if (schedulable.length !== 0) {
        throw new Error('Scheduled task when slots were full.');
      }

      // Complete persona validation
      wf.tasks.get('task-persona-validation')!.state = TaskState.COMPLETED;

      // Now Level 1 tasks should be ready to run (Adversarial shield and Carbon optimization)
      schedulable = WorkflowScheduler.getSchedulableTasks(wf, 10);
      const ids = schedulable.map((t) => t.id);
      if (ids.length !== 2 || !ids.includes('task-security-shield') || !ids.includes('task-carbon-optimization')) {
        throw new Error('Failed to schedule parallel tasks after root completion.');
      }

      // Concurrency limit is 1, so only 1 scheduled
      schedulable = WorkflowScheduler.getSchedulableTasks(wf, 1);
      if (schedulable.length !== 1) {
        throw new Error('Failed to cap scheduling to concurrency limit.');
      }
    });

    // ==========================================
    // 4. RETRY AND BACKOFF TESTS
    // ==========================================
    await runTest('Retry Manager', 'calculates exponential backoff correctly', () => {
      const config = {
        policy: BackoffPolicy.EXPONENTIAL,
        maxRetries: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        jitter: false,
      };

      const delay1 = RetryManager.calculateDelay(config, 1);
      const delay2 = RetryManager.calculateDelay(config, 2);
      const delay3 = RetryManager.calculateDelay(config, 3);

      if (delay1 !== 100 || delay2 !== 200 || delay3 !== 400) {
        throw new Error(`Exponential backoff calculated incorrect delays: [${delay1}, ${delay2}, ${delay3}]`);
      }
    });

    await runTest('Retry Manager', 'executes and retries on failure until success', async () => {
      const config = {
        policy: BackoffPolicy.CONSTANT,
        maxRetries: 3,
        baseDelayMs: 10,
        maxDelayMs: 100,
        jitter: false,
      };

      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      const result = await RetryManager.executeWithRetry(fn, config);
      if (result !== 'success' || attempts !== 3) {
        throw new Error(`Failed to retry or retrieve final result: attempts=${attempts}`);
      }
    });

    // ==========================================
    // 5. WORKFLOW EXECUTION & ROLLBACK TESTS
    // ==========================================
    await runTest('Execution Engine', 'runs workflow, interpolates inputs and completes state', async () => {
      const wf = orchestrator.plan('simple verify');
      
      // Let's execute using default registry handlers
      await orchestrator.execute(wf, { personaInstance });

      if (wf.state !== WorkflowState.COMPLETED) {
        throw new Error(`Workflow failed to complete execution, state is ${wf.state}, error: ${wf.error}`);
      }

      const personaTask = wf.tasks.get('task-persona-validation')!;
      const explainTask = wf.tasks.get('task-explainability')!;

      if (personaTask.state !== TaskState.COMPLETED || explainTask.state !== TaskState.COMPLETED) {
        throw new Error('Tasks inside completed workflow are not marked as completed.');
      }
    });

    await runTest('Execution Engine & Recovery', 'triggers compensating rollbacks on critical task failures', async () => {
      const taskDefs: TaskDefinition[] = [
        {
          id: 'test-t1',
          name: 'Task 1',
          type: TaskType.CUSTOM,
          dependencies: [],
          inputParameters: {},
          execute: async () => ({ value: 't1_ok' }),
          rollback: async () => {
            (wf as any).context.t1_rolled = true;
          },
        },
        {
          id: 'test-t2',
          name: 'Task 2 (Fail)',
          type: TaskType.CUSTOM,
          dependencies: ['test-t1'],
          inputParameters: {},
          execute: async () => {
            throw new Error('Fatal task execution error');
          },
          rollback: async () => {
            (wf as any).context.t2_rolled = true;
          },
        },
      ];

      const wf = orchestrator.plan('Full Coordination goal');
      // Override tasks manually
      wf.tasks.clear();
      taskDefs.forEach((def) => {
        wf.tasks.set(def.id, new (wf.tasks.values().next().value.constructor)(def));
      });

      try {
        await orchestrator.execute(wf, {});
      } catch (e) {
        // Expected execution failure
      }

      if (wf.state !== WorkflowState.ROLLED_BACK) {
        throw new Error(`Expected ROLLED_BACK workflow state, got ${wf.state}`);
      }

      const t1 = wf.tasks.get('test-t1')!;
      const t2 = wf.tasks.get('test-t2')!;

      if (t1.state !== TaskState.ROLLED_BACK || t2.state !== TaskState.ROLLED_BACK) {
        throw new Error(`Tasks were not set to rolled back state: t1=${t1.state}, t2=${t2.state}`);
      }

      // Verify compensating rollback actions ran and updated context
      if (!wf.context.t1_rolled || !wf.context.t2_rolled) {
        throw new Error('Compensating actions failed to run or mutate state.');
      }
    });

    // ==========================================
    // 6. EVENT BUS PRIORITY TESTS
    // ==========================================
    await runTest('Event Bus', 'dispatches workflow events sorted by priorities', () => {
      const order: number[] = [];

      eventBus.subscribe('sub1', 'test_event', () => { order.push(1); }, 10);
      eventBus.subscribe('sub2', 'test_event', () => { order.push(2); }, 50);
      eventBus.subscribe('sub3', 'test_event', () => { order.push(3); }, 5);

      eventBus.publish('wf_test', 'test_event', {});

      if (JSON.stringify(order) !== '[2,1,3]') {
        throw new Error(`Expected priority sequence [2, 1, 3], got ${JSON.stringify(order)}`);
      }
    });

    // Clean up registry & event bus singleton states
    eventBus.clearAllListeners();
    WorkflowOrchestrator.resetInstance();

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

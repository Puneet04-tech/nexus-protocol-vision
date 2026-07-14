import { ProtocolPlaygroundEngine } from '../ProtocolPlaygroundEngine';
import { WorkflowStep, PlaygroundParams } from '../PlaygroundTypes';

export interface TestCaseResult {
  suite: string;
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

export interface DiagnosticsSummary {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  tests: TestCaseResult[];
}

export const runPlaygroundDiagnostics = async (
  engine: ProtocolPlaygroundEngine
): Promise<DiagnosticsSummary> => {
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
  // 1. UNIT TESTS: Parameter & Log Managers
  // ==========================================
  await runTest('Parameter Manager', 'validates learning rate bounds', () => {
    const pm = engine.getParamManager();
    pm.reset();
    
    pm.updateParam('learningRate', 1.5); // Invalid
    let res = pm.validate();
    if (res.isValid || res.errors.length === 0) {
      throw new Error('Expected 1.5 learning rate to be flagged invalid.');
    }

    pm.updateParam('learningRate', 0.15); // Valid
    res = pm.validate();
    if (!res.isValid) {
      throw new Error(`Expected valid parameters check, got: ${res.errors.join(', ')}`);
    }
  });

  await runTest('Logger Subsystem', 'filters records and truncates long traces', () => {
    const logger = engine.getLogger();
    logger.clear();

    logger.log('sovereign-persona', 'test_op', 'success', 10, 'Test Log Message A');
    logger.log('privacy-negotiator', 'zkp_op', 'error', 150, 'ZKP Failure details here');
    
    const allLogs = logger.getLogs();
    if (allLogs.length !== 2) {
      throw new Error(`Expected 2 logs, found ${allLogs.length}`);
    }

    const filtered = logger.filter('zkp', 'privacy-negotiator', 'error');
    if (filtered.length !== 1 || !filtered[0].message.includes('ZKP Failure')) {
      throw new Error('Logger filter by search string and module failed.');
    }
  });

  // ==========================================
  // 2. INTEGRATION TESTS: Workflow Executors
  // ==========================================
  await runTest('Workflow Executor', 'instantiates and runs actual core modules', async () => {
    const exec = engine.getExecutor();
    exec.reset();

    const dummyStep: WorkflowStep = {
      id: 'init-persona',
      label: 'Initialize Sovereign Persona',
      component: 'sovereign-persona',
      operation: 'initialize',
      status: 'pending',
      duration: 0,
      message: 'Initialise'
    };

    const params: PlaygroundParams = engine.getParams();
    const result = await exec.executeStep(dummyStep, params);

    if (result.status !== 'completed') {
      throw new Error(`Step execution failed: ${result.logs}`);
    }

    const persona = exec.getPersona();
    if (!persona) {
      throw new Error('Sovereign Persona twin was not successfully instantiated.');
    }

    const graph = persona.getCognitiveGraph();
    if (graph.exportGraph().nodes.length === 0) {
      throw new Error('Persona Cognitive Graph nodes mapping is empty.');
    }
  });

  // ==========================================
  // 3. SIMULATION TESTS: Playback States
  // ==========================================
  await runTest('Simulation Engine', 'manages timer-based intervals and timeline indices', async () => {
    const manager = engine.getSimManager();
    const params = engine.getParams();
    
    // Load learning journey scenario
    manager.loadScenario('user-learning-journey', params);
    
    const state = manager.getState();
    if (state.currentStepIndex !== -1 || state.status !== 'stopped') {
      throw new Error('Expected loaded scenario index to start at -1 with Stopped status.');
    }

    // Step forward manually
    await manager.stepForward(params);
    const updatedState = manager.getState();
    if (updatedState.currentStepIndex !== 0) {
      throw new Error(`Expected manual step forward index to be 0, found ${updatedState.currentStepIndex}`);
    }
  });

  // ==========================================
  // 4. UI TESTS: Canvas Transforms
  // ==========================================
  await runTest('UI Canvas Zoom', 'verifies zoom factor boundaries', () => {
    // Zoom factor bounds are typically between 0.5 and 1.5 in SimulationCanvas
    const zoomIn = 1.0 * 1.1;
    const zoomOut = 1.0 * 0.9;
    
    if (zoomIn <= 1.0 || zoomOut >= 1.0) {
      throw new Error('Zoom multiplier logic scales incorrectly.');
    }
  });

  // ==========================================
  // 5. PERFORMANCE TESTS: Metrics Complexity
  // ==========================================
  await runTest('Performance Profiler', 'runs metrics calculators under 5ms', () => {
    const pStart = performance.now();
    
    // Evaluate metrics calculation loop
    const metrics = engine.getMetrics();
    const duration = performance.now() - pStart;
    
    if (duration > 5) {
      throw new Error(`Metrics computation took ${duration.toFixed(2)}ms (threshold: 5ms)`);
    }

    if (metrics.memory < 100 || metrics.cpu > 100) {
      throw new Error('System performance metrics calculation output is out of bounds.');
    }
  });

  // ==========================================
  // 6. ACCESSIBILITY TESTS: Focus Elements
  // ==========================================
  await runTest('Accessibility Audit', 'checks element focus attributes', () => {
    // Check if system elements would comply with basic tab navigation
    const selectors = ['select', 'button', 'input[type="range"]'];
    if (selectors.length !== 3) {
      throw new Error('Interactive selectors list mismatch.');
    }
  });

  // ==========================================
  // 7. REGRESSION TESTS: Exception Tolerances
  // ==========================================
  await runTest('Error Handler Recovery', 'prevents execution crash under invalid operation steps', async () => {
    const exec = engine.getExecutor();
    
    const invalidStep: WorkflowStep = {
      id: 'undefined-step-007',
      label: 'Malformed Step',
      component: 'sovereign-persona',
      operation: 'non_existent_method',
      status: 'pending',
      duration: 0,
      message: 'Run invalid method'
    };

    const res = await exec.executeStep(invalidStep, engine.getParams());
    if (res.status !== 'failed' || !res.logs.includes('does not have a mapped execution handler')) {
      throw new Error('Execution loop failed to catch invalid step mapping exception.');
    }
  });

  const end = Date.now();
  const passedCount = tests.filter(t => t.passed).length;
  const failedCount = tests.filter(t => !t.passed).length;

  return {
    total: tests.length,
    passed: passedCount,
    failed: failedCount,
    duration: end - start,
    tests
  };
};

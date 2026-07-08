import { Scenario, WorkflowStep, PlaygroundParams } from './PlaygroundTypes';
import { compileScenario } from './ScenarioLibrary';
import { WorkflowExecutor } from './WorkflowExecutor';
import { SimulationLogger } from './SimulationLogger';

export class ScenarioRunner {
  private currentScenario: Scenario | null = null;
  private executor: WorkflowExecutor;
  private logger: SimulationLogger;

  constructor(executor: WorkflowExecutor, logger: SimulationLogger) {
    this.executor = executor;
    this.logger = logger;
  }

  public loadScenario(id: string, params: PlaygroundParams, customSteps?: WorkflowStep[]): Scenario | null {
    const scenario = compileScenario(id, customSteps);
    if (!scenario) return null;

    this.currentScenario = scenario;
    this.executor.reset();
    
    // Apply default parameters if defined in the scenario
    Object.assign(params, {
      ...params,
      ...scenario.defaultParams
    });

    this.logger.log(
      'System',
      'LoadScenario',
      'info',
      0,
      `Scenario Loaded: "${scenario.name}". Complexity: ${scenario.complexity.toUpperCase()}. Duration: ${scenario.duration}.`,
      scenario.description
    );

    return this.currentScenario;
  }

  public getCurrentScenario(): Scenario | null {
    return this.currentScenario;
  }

  public async runStep(
    stepIndex: number,
    params: PlaygroundParams
  ): Promise<{ step: WorkflowStep; success: boolean }> {
    if (!this.currentScenario) {
      throw new Error('No scenario loaded.');
    }

    if (stepIndex < 0 || stepIndex >= this.currentScenario.steps.length) {
      throw new Error(`Step index ${stepIndex} is out of bounds for scenario ${this.currentScenario.id}.`);
    }

    const step = this.currentScenario.steps[stepIndex];
    step.status = 'running';
    
    this.logger.log(
      step.component,
      step.operation,
      'info',
      0,
      `Starting Step ${stepIndex + 1}/${this.currentScenario.steps.length}: "${step.label}"`
    );

    const start = Date.now();
    const result = await this.executor.executeStep(step, params);
    const duration = Date.now() - start;

    step.status = result.status === 'completed' ? 'completed' : 'failed';
    step.duration = duration;
    step.outputs = result.outputs;
    
    this.logger.log(
      step.component,
      step.operation,
      result.status === 'completed' ? 'success' : 'error',
      duration,
      result.logs,
      result.outputs ? JSON.stringify(result.outputs, null, 2) : undefined
    );

    return {
      step,
      success: result.status === 'completed'
    };
  }

  public resetScenario(): void {
    if (this.currentScenario) {
      this.currentScenario.steps.forEach(step => {
        step.status = 'pending';
        step.duration = 0;
        step.outputs = null;
      });
      this.executor.reset();
      this.logger.log('System', 'ResetScenario', 'info', 0, `Scenario "${this.currentScenario.name}" state reset to pending.`);
    }
  }
}

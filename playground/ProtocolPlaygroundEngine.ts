import { ParameterManager } from './ParameterManager';
import { SimulationLogger } from './SimulationLogger';
import { WorkflowExecutor } from './WorkflowExecutor';
import { ScenarioRunner } from './ScenarioRunner';
import { SimulationManager } from './SimulationManager';
import { PlaygroundParams, SimulationState, RealTimeMetrics } from './PlaygroundTypes';
import { calculateRealTimeMetrics } from './PlaygroundUtils';

export class ProtocolPlaygroundEngine {
  private static instance: ProtocolPlaygroundEngine | null = null;

  private paramManager: ParameterManager;
  private logger: SimulationLogger;
  private executor: WorkflowExecutor;
  private scenarioRunner: ScenarioRunner;
  private simManager: SimulationManager;

  constructor() {
    this.paramManager = new ParameterManager();
    this.logger = new SimulationLogger();
    this.executor = new WorkflowExecutor();
    this.scenarioRunner = new ScenarioRunner(this.executor, this.logger);
    this.simManager = new SimulationManager(this.scenarioRunner);
  }

  public static getInstance(): ProtocolPlaygroundEngine {
    if (!this.instance) {
      this.instance = new ProtocolPlaygroundEngine();
    }
    return this.instance;
  }

  public getParamManager(): ParameterManager {
    return this.paramManager;
  }

  public getLogger(): SimulationLogger {
    return this.logger;
  }

  public getExecutor(): WorkflowExecutor {
    return this.executor;
  }

  public getScenarioRunner(): ScenarioRunner {
    return this.scenarioRunner;
  }

  public getSimManager(): SimulationManager {
    return this.simManager;
  }

  public getParams(): PlaygroundParams {
    return this.paramManager.getParams();
  }

  public getState(): SimulationState {
    return this.simManager.getState();
  }

  public getMetrics(): RealTimeMetrics {
    return calculateRealTimeMetrics(
      this.getParams(),
      this.getState(),
      this.executor
    );
  }

  public resetAll(): void {
    this.paramManager.reset();
    this.logger.clear();
    this.executor.reset();
    this.simManager.reset();
  }
}

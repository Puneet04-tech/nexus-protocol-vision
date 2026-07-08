import { SimulationState, WorkflowStep, PlaygroundParams } from './PlaygroundTypes';
import { ScenarioRunner } from './ScenarioRunner';

export class SimulationManager {
  private state: SimulationState;
  private runner: ScenarioRunner;
  private timerId: number | null = null;
  private onStepCompleted: (stepIndex: number, success: boolean) => void = () => {};
  private onStateChanged: (state: SimulationState) => void = () => {};

  constructor(runner: ScenarioRunner) {
    this.runner = runner;
    this.state = {
      status: 'stopped',
      currentStepIndex: -1,
      speed: 1,
      currentScenarioId: null,
      mode: 'auto'
    };
  }

  public getState(): SimulationState {
    return this.state;
  }

  public subscribe(
    onStepCompleted: (stepIndex: number, success: boolean) => void,
    onStateChanged: (state: SimulationState) => void
  ): () => void {
    this.onStepCompleted = onStepCompleted;
    this.onStateChanged = onStateChanged;
    return () => {
      this.onStepCompleted = () => {};
      this.onStateChanged = () => {};
    };
  }

  private notifyState(): void {
    this.onStateChanged({ ...this.state });
  }

  public setMode(mode: 'auto' | 'manual'): void {
    this.state.mode = mode;
    if (mode === 'manual' && this.state.status === 'playing') {
      this.pause();
    }
    this.notifyState();
  }

  public setSpeed(speed: number): void {
    this.state.speed = speed;
    this.notifyState();
    
    // If playing, restart the interval with the new speed
    if (this.state.status === 'playing') {
      this.stopTimer();
      this.startTimer();
    }
  }

  public loadScenario(id: string, params: PlaygroundParams, customSteps?: WorkflowStep[]): void {
    this.stopTimer();
    const scenario = this.runner.loadScenario(id, params, customSteps);
    
    this.state = {
      status: 'stopped',
      currentStepIndex: -1,
      speed: this.state.speed,
      currentScenarioId: scenario ? scenario.id : null,
      mode: this.state.mode
    };
    
    this.notifyState();
  }

  public play(params: PlaygroundParams): void {
    const scenario = this.runner.getCurrentScenario();
    if (!scenario) return;

    if (this.state.currentStepIndex >= scenario.steps.length - 1) {
      // Reached the end, reset first
      this.reset();
    }

    this.state.status = 'playing';
    this.notifyState();

    if (this.state.mode === 'auto') {
      this.startTimer(params);
    }
  }

  public pause(): void {
    this.stopTimer();
    this.state.status = 'paused';
    this.notifyState();
  }

  public reset(): void {
    this.stopTimer();
    this.runner.resetScenario();
    this.state.status = 'stopped';
    this.state.currentStepIndex = -1;
    this.notifyState();
  }

  public async stepForward(params: PlaygroundParams): Promise<void> {
    const scenario = this.runner.getCurrentScenario();
    if (!scenario) return;

    const nextIndex = this.state.currentStepIndex + 1;
    if (nextIndex >= scenario.steps.length) return;

    this.state.currentStepIndex = nextIndex;
    this.notifyState();

    const { success } = await this.runner.runStep(nextIndex, params);
    this.onStepCompleted(nextIndex, success);

    if (nextIndex === scenario.steps.length - 1) {
      this.stopTimer();
      this.state.status = 'stopped';
      this.notifyState();
    }
  }

  public stepBackward(): void {
    const scenario = this.runner.getCurrentScenario();
    if (!scenario || this.state.currentStepIndex < 0) return;

    // Reset the active step back to pending
    const step = scenario.steps[this.state.currentStepIndex];
    step.status = 'pending';
    step.duration = 0;
    step.outputs = null;

    this.state.currentStepIndex -= 1;
    this.state.status = 'paused';
    this.notifyState();
  }

  private startTimer(params?: PlaygroundParams): void {
    if (this.timerId !== null) return;

    const runNext = async () => {
      const scenario = this.runner.getCurrentScenario();
      if (!scenario || !params) return;

      const nextIndex = this.state.currentStepIndex + 1;
      if (nextIndex >= scenario.steps.length) {
        this.stopTimer();
        this.state.status = 'stopped';
        this.notifyState();
        return;
      }

      this.state.currentStepIndex = nextIndex;
      this.notifyState();

      const { success } = await this.runner.runStep(nextIndex, params);
      this.onStepCompleted(nextIndex, success);

      if (nextIndex >= scenario.steps.length - 1) {
        this.stopTimer();
        this.state.status = 'stopped';
        this.notifyState();
      } else if (this.state.status === 'playing') {
        // Schedule next step execution
        this.scheduleNextStep(runNext);
      }
    };

    this.scheduleNextStep(runNext);
  }

  private scheduleNextStep(callback: () => void): void {
    const baseDelay = 2000; // 2 seconds default step delay
    const delay = Math.max(200, baseDelay / this.state.speed);
    this.timerId = window.setTimeout(callback, delay);
  }

  private stopTimer(): void {
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}

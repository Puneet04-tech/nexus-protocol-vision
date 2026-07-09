import { PlaygroundParams } from './PlaygroundTypes';
import { DEFAULT_PLAYGROUND_PARAMS } from './ScenarioLibrary';

export class ParameterManager {
  private currentParams: PlaygroundParams;

  constructor() {
    this.currentParams = { ...DEFAULT_PLAYGROUND_PARAMS };
  }

  public getParams(): PlaygroundParams {
    return this.currentParams;
  }

  public updateParam<K extends keyof PlaygroundParams>(key: K, value: PlaygroundParams[K]): void {
    this.currentParams[key] = value;
  }

  public setParams(params: Partial<PlaygroundParams>): void {
    this.currentParams = {
      ...this.currentParams,
      ...params
    };
  }

  public reset(): void {
    this.currentParams = { ...DEFAULT_PLAYGROUND_PARAMS };
  }

  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (this.currentParams.learningRate < 0 || this.currentParams.learningRate > 1) {
      errors.push('Learning rate must be between 0.0 and 1.0.');
    }
    
    if (this.currentParams.confidenceThreshold < 0 || this.currentParams.confidenceThreshold > 1) {
      errors.push('Confidence threshold must be between 0.0 and 1.0.');
    }

    if (this.currentParams.carbonBudget < 0) {
      errors.push('Carbon budget cannot be negative.');
    }

    if (this.currentParams.federatedParticipants < 1) {
      errors.push('Federated participants must be at least 1.');
    }

    if (this.currentParams.latencyLimit < 1) {
      errors.push('Latency limit must be at least 1ms.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

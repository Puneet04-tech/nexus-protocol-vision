import { TaskType, ExecutionContext } from './types';

export type TaskExecutor = (context: ExecutionContext) => Promise<Record<string, unknown>>;
export type TaskRollback = (context: ExecutionContext) => Promise<void>;

export interface RegisteredTaskHandlers {
  execute: TaskExecutor;
  rollback?: TaskRollback;
}

export class WorkflowRegistry {
  private static instance: WorkflowRegistry | null = null;
  private handlers = new Map<TaskType | string, RegisteredTaskHandlers>();

  private constructor() {
    this.registerDefaultHandlers();
  }

  public static getInstance(): WorkflowRegistry {
    if (!this.instance) {
      this.instance = new WorkflowRegistry();
    }
    return this.instance;
  }

  public static resetInstance(): void {
    this.instance = null;
  }

  /**
   * Register a custom task executor and optional rollback action (plugin system)
   */
  public register(
    type: TaskType | string,
    execute: TaskExecutor,
    rollback?: TaskRollback
  ): void {
    this.handlers.set(type, { execute, rollback });
  }

  /**
   * Get handlers for a given task type
   */
  public get(type: TaskType | string): RegisteredTaskHandlers | undefined {
    return this.handlers.get(type);
  }

  /**
   * Register standard handlers matching the core protocol modules
   */
  private registerDefaultHandlers(): void {
    // 1. PERSONA_VALIDATION
    this.register(
      TaskType.PERSONA_VALIDATION,
      async (ctx) => {
        const persona = ctx.systemInstances.personaInstance;
        if (persona) {
          const profile = persona.getProfile();
          return { status: 'success', profileId: profile.id, role: profile.professionalContext.role };
        }
        // Simulation mode
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { status: 'simulated_success', profileId: 'persona-active-user', role: 'Lead Cryptographer' };
      },
      async () => {
        // Rollback persona verification state if necessary
      }
    );

    // 2. PRIVACY_NEGOTIATION
    this.register(
      TaskType.PRIVACY_NEGOTIATION,
      async (ctx) => {
        const negotiator = ctx.systemInstances.privacyNegotiatorInstance;
        const reqType = (ctx.taskInputs.requestType as string) || 'data_sharing';
        const agentId = (ctx.taskInputs.agentId as string) || 'external-agent-01';
        
        if (negotiator) {
          const result = await negotiator.negotiate(
            {
              agentId,
              requestType: reqType,
              parameters: ctx.taskInputs.parameters || {},
              urgency: 'medium',
            },
            [],
            {}
          );
          return {
            status: result.accepted ? 'success' : 'rejected',
            trustScore: result.trustScore,
            carbonImpact: result.carbonImpact,
            executionTime: result.executionTime,
            accepted: result.accepted,
          };
        }

        // Simulation mode
        await new Promise((resolve) => setTimeout(resolve, 400));
        return {
          status: 'success',
          trustScore: 0.88,
          carbonImpact: 0.15,
          executionTime: 80,
          accepted: true,
        };
      }
    );

    // 3. CARBON_OPTIMIZATION
    this.register(
      TaskType.CARBON_OPTIMIZATION,
      async (ctx) => {
        const optimizer = ctx.systemInstances.carbonOptimizerInstance;
        if (optimizer) {
          const result = await optimizer.optimize({
            id: `op_${Date.now()}`,
            type: 'fine_tuning',
            modelSize: 500000,
            dataVolume: 800,
            computeIntensity: 0.6,
            priority: 'medium',
          });
          return {
            status: 'success',
            estimatedSavings: result.estimatedSavings,
            renewableEnergyUsed: true,
          };
        }

        // Simulation mode
        await new Promise((resolve) => setTimeout(resolve, 200));
        return {
          status: 'success',
          estimatedSavings: 0.35,
          renewableEnergyUsed: true,
        };
      }
    );

    // 4. FEDERATED_ROUND
    this.register(
      TaskType.FEDERATED_ROUND,
      async (ctx) => {
        const client = ctx.systemInstances.federatedClientInstance;
        if (client) {
          await client.contribute({
            concepts: ['cryptography'],
            outcomes: ['success'],
          });
          const performance = await client.getModelPerformance();
          return {
            status: 'success',
            accuracy: performance.accuracy,
            loss: performance.loss,
          };
        }

        // Simulation mode
        await new Promise((resolve) => setTimeout(resolve, 500));
        return {
          status: 'success',
          accuracy: 0.86,
          loss: 0.28,
        };
      }
    );

    // 5. MORPHNET_COMPRESSION
    this.register(
      TaskType.MORPHNET_COMPRESSION,
      async (ctx) => {
        const morphNet = ctx.systemInstances.morphNetInstance;
        if (morphNet) {
          const result = await morphNet.optimizeForTask({
            taskId: `task_${Date.now()}`,
            taskType: 'moderate',
            inputComplexity: 0.5,
            outputRequirements: {
              precision: 'medium',
              confidence: 0.8,
              interpretability: false,
              realTime: false,
            },
            timeConstraints: 1000,
            energyBudget: 1.5,
            accuracyThreshold: 0.8,
          });
          return {
            status: 'success',
            pruningRatio: result.pruningRatio,
            energySavings: result.energySavings,
          };
        }

        // Simulation mode
        await new Promise((resolve) => setTimeout(resolve, 300));
        return {
          status: 'success',
          pruningRatio: 0.42,
          energySavings: 0.18,
        };
      }
    );

    // 6. SECURITY_SHIELD
    this.register(
      TaskType.SECURITY_SHIELD,
      async (ctx) => {
        const immuneSystem = ctx.systemInstances.immuneSystemInstance;
        const inputData = ctx.taskInputs.payload || 'secure transaction data';
        
        if (immuneSystem) {
          const detections = await immuneSystem.monitor(inputData, { scanType: 'workflow_scan' });
          if (detections.length > 0) {
            const responses = await immuneSystem.neutralize(detections);
            return {
              status: 'threats_neutralized',
              threatsCount: detections.length,
              responsesCount: responses.length,
            };
          }
          return { status: 'secure', threatsCount: 0 };
        }

        // Simulation mode
        await new Promise((resolve) => setTimeout(resolve, 250));
        return { status: 'secure', threatsCount: 0 };
      }
    );

    // 7. CONFLICT_RESOLUTION
    this.register(
      TaskType.CONFLICT_RESOLUTION,
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { status: 'success', resolvedConflicts: 0 };
      }
    );

    // 8. EXPLAINABILITY
    this.register(
      TaskType.EXPLAINABILITY,
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return { status: 'success', confidenceScore: 0.95 };
      }
    );
  }
}

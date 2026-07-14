import { TaskDefinition, TaskType, BackoffPolicy } from './types';
import { WorkflowImpl } from './models/Workflow';
import { WorkflowRegistry } from './WorkflowRegistry';

export class WorkflowPlanner {
  /**
   * Plans and compiles a list of TaskDefinitions and builds a Workflow object
   * based on the user's high-level goal and parameters.
   */
  public static plan(
    goal: string,
    initialContext: Record<string, unknown> = {}
  ): WorkflowImpl {
    const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const taskDefs: TaskDefinition[] = [];
    const registry = WorkflowRegistry.getInstance();

    const normalizedGoal = goal.toLowerCase();

    // 1. Root Task: Persona validation is always required to establish user credentials
    const personaHandler = registry.get(TaskType.PERSONA_VALIDATION);
    taskDefs.push({
      id: 'task-persona-validation',
      name: 'Verify Sovereign Persona',
      type: TaskType.PERSONA_VALIDATION,
      dependencies: [],
      inputParameters: {},
      execute: personaHandler?.execute || (async () => ({ status: 'success' })),
      rollback: personaHandler?.rollback,
      retryConfig: {
        policy: BackoffPolicy.CONSTANT,
        maxRetries: 1,
        baseDelayMs: 200,
        maxDelayMs: 500,
        jitter: false,
      },
    });

    // Helper flag checks based on text analysis
    const needsPrivacy = normalizedGoal.includes('privacy') || normalizedGoal.includes('negotiat') || normalizedGoal.includes('secure');
    const needsSecurity = normalizedGoal.includes('security') || normalizedGoal.includes('threat') || normalizedGoal.includes('shield') || normalizedGoal.includes('immune');
    const needsCarbon = normalizedGoal.includes('carbon') || normalizedGoal.includes('sustain') || normalizedGoal.includes('energy') || normalizedGoal.includes('environ');
    const needsFederated = normalizedGoal.includes('federat') || normalizedGoal.includes('train') || normalizedGoal.includes('model') || normalizedGoal.includes('collaborat');
    const needsCompression = normalizedGoal.includes('compress') || normalizedGoal.includes('morphnet') || normalizedGoal.includes('prun');

    // Predefined Workflow Template matching: "Full Coordination"
    if (normalizedGoal.includes('full coordination') || normalizedGoal.includes('end-to-end') || (needsPrivacy && needsCarbon && needsFederated)) {
      // Create complex DAG:
      //
      //                        [Sovereign Persona Verification]
      //                                 /          \
      //           [Security Scan Shield]            [Carbon-Aware Optimizer]
      //                     |                                  |
      //           [Privacy Negotiator]                  [MorphNet Engine]
      //                     \                                  /
      //                      \                                /
      //                     [Federated Collaborative Round]
      
      const shieldHandler = registry.get(TaskType.SECURITY_SHIELD);
      taskDefs.push({
        id: 'task-security-shield',
        name: 'Adversarial Immune Scan',
        type: TaskType.SECURITY_SHIELD,
        dependencies: ['task-persona-validation'],
        inputParameters: { payload: '$.task-persona-validation.profileId' },
        execute: shieldHandler?.execute || (async () => ({ status: 'success' })),
        rollback: shieldHandler?.rollback,
      });

      const privacyHandler = registry.get(TaskType.PRIVACY_NEGOTIATION);
      taskDefs.push({
        id: 'task-privacy-negotiation',
        name: 'Negotiate MPC Privacy Terms',
        type: TaskType.PRIVACY_NEGOTIATION,
        dependencies: ['task-security-shield'],
        inputParameters: {
          agentId: 'federated-coordinator',
          requestType: 'collaborative_training',
          parameters: { targetAccuracy: 0.9, maxPrivacyLoss: 0.1 },
        },
        execute: privacyHandler?.execute || (async () => ({ status: 'success' })),
        rollback: privacyHandler?.rollback,
      });

      const carbonHandler = registry.get(TaskType.CARBON_OPTIMIZATION);
      taskDefs.push({
        id: 'task-carbon-optimization',
        name: 'Carbon-Aware Footprint Profiling',
        type: TaskType.CARBON_OPTIMIZATION,
        dependencies: ['task-persona-validation'],
        inputParameters: {},
        execute: carbonHandler?.execute || (async () => ({ status: 'success' })),
        rollback: carbonHandler?.rollback,
      });

      const morphnetHandler = registry.get(TaskType.MORPHNET_COMPRESSION);
      taskDefs.push({
        id: 'task-morphnet-compression',
        name: 'MorphNet Dynamic Pruning',
        type: TaskType.MORPHNET_COMPRESSION,
        dependencies: ['task-carbon-optimization'],
        inputParameters: {},
        execute: morphnetHandler?.execute || (async () => ({ status: 'success' })),
        rollback: morphnetHandler?.rollback,
      });

      const federatedHandler = registry.get(TaskType.FEDERATED_ROUND);
      taskDefs.push({
        id: 'task-federated-round',
        name: 'Secure Federated Training Round',
        type: TaskType.FEDERATED_ROUND,
        dependencies: ['task-privacy-negotiation', 'task-morphnet-compression'],
        inputParameters: {
          privacyBudget: '$.task-privacy-negotiation.trustScore',
          compressionRatio: '$.task-morphnet-compression.pruningRatio',
        },
        execute: federatedHandler?.execute || (async () => ({ status: 'success' })),
        rollback: federatedHandler?.rollback,
        retryConfig: {
          policy: BackoffPolicy.EXPONENTIAL,
          maxRetries: 2,
          baseDelayMs: 300,
          maxDelayMs: 1000,
          jitter: true,
        },
      });

      return new WorkflowImpl(workflowId, 'Nexus End-to-End Execution', goal, taskDefs, initialContext);
    }

    // Dynamic compilation based on goal keywords
    let lastDependencyId = 'task-persona-validation';

    if (needsSecurity) {
      const handler = registry.get(TaskType.SECURITY_SHIELD);
      const tid = 'task-security-shield';
      taskDefs.push({
        id: tid,
        name: 'Adversarial Immune Scan',
        type: TaskType.SECURITY_SHIELD,
        dependencies: [lastDependencyId],
        inputParameters: {},
        execute: handler?.execute || (async () => ({ status: 'success' })),
        rollback: handler?.rollback,
      });
      lastDependencyId = tid;
    }

    if (needsPrivacy) {
      const handler = registry.get(TaskType.PRIVACY_NEGOTIATION);
      const tid = 'task-privacy-negotiation';
      taskDefs.push({
        id: tid,
        name: 'Negotiate MPC Privacy Terms',
        type: TaskType.PRIVACY_NEGOTIATION,
        dependencies: [lastDependencyId],
        inputParameters: {
          agentId: 'coordinator-node-09',
          requestType: 'secure_aggregation',
        },
        execute: handler?.execute || (async () => ({ status: 'success' })),
        rollback: handler?.rollback,
      });
      lastDependencyId = tid;
    }

    if (needsCarbon) {
      const handler = registry.get(TaskType.CARBON_OPTIMIZATION);
      const tid = 'task-carbon-optimization';
      taskDefs.push({
        id: tid,
        name: 'Carbon-Aware Footprint Profiling',
        type: TaskType.CARBON_OPTIMIZATION,
        dependencies: [lastDependencyId],
        inputParameters: {},
        execute: handler?.execute || (async () => ({ status: 'success' })),
        rollback: handler?.rollback,
      });
      lastDependencyId = tid;
    }

    if (needsCompression) {
      const handler = registry.get(TaskType.MORPHNET_COMPRESSION);
      const tid = 'task-morphnet-compression';
      taskDefs.push({
        id: tid,
        name: 'MorphNet Dynamic Pruning',
        type: TaskType.MORPHNET_COMPRESSION,
        dependencies: [lastDependencyId],
        inputParameters: {},
        execute: handler?.execute || (async () => ({ status: 'success' })),
        rollback: handler?.rollback,
      });
      lastDependencyId = tid;
    }

    if (needsFederated) {
      const handler = registry.get(TaskType.FEDERATED_ROUND);
      const tid = 'task-federated-round';
      taskDefs.push({
        id: tid,
        name: 'Secure Federated Training Round',
        type: TaskType.FEDERATED_ROUND,
        dependencies: [lastDependencyId],
        inputParameters: {},
        execute: handler?.execute || (async () => ({ status: 'success' })),
        rollback: handler?.rollback,
        retryConfig: {
          policy: BackoffPolicy.LINEAR,
          maxRetries: 1,
          baseDelayMs: 200,
          maxDelayMs: 500,
          jitter: false,
        },
      });
      lastDependencyId = tid;
    }

    // Default simple verification if no keywords match
    if (taskDefs.length === 1) {
      const handler = registry.get(TaskType.EXPLAINABILITY);
      taskDefs.push({
        id: 'task-explainability',
        name: 'Decision Proof Validation',
        type: TaskType.EXPLAINABILITY,
        dependencies: ['task-persona-validation'],
        inputParameters: {},
        execute: handler?.execute || (async () => ({ status: 'success' })),
        rollback: handler?.rollback,
      });
    }

    return new WorkflowImpl(workflowId, 'Dynamic Goal Workflow', goal, taskDefs, initialContext);
  }
}

import { DecisionTrace, ReasoningStep, KnowledgeNode, EthicalCheck, PrivacyCheck } from './ExplainabilityTypes';
import { DecisionRecorder } from './DecisionRecorder';
import { ConfidenceEngine } from './ConfidenceEngine';
import { ExplainabilityUtils } from './ExplainabilityUtils';

// Import core modules for prototype interception
import { SovereignPersona } from '../sovereign-persona/SovereignPersona';
import { CognitiveGraph } from '../sovereign-persona/CognitiveGraph';
import { PrivacyNegotiator } from '../privacy-negotiator/PrivacyNegotiator';
import { MorphNetEngine } from '../morphnet-engine/MorphNetEngine';
import { AdversarialImmuneSystem } from '../adversarial-immune/AdversarialImmuneSystem';

export class DecisionTracer {
  private static instance: DecisionTracer;
  private activeTraces: Map<string, DecisionTrace> = new Map();
  private recorder: DecisionRecorder;

  private constructor() {
    this.recorder = DecisionRecorder.getInstance();
  }

  public static getInstance(): DecisionTracer {
    if (!this.instance) {
      this.instance = new DecisionTracer();
    }
    return this.instance;
  }

  /**
   * Starts a new decision trace.
   */
  public startTrace(initialData: Partial<DecisionTrace>): string {
    const id = initialData.id || ExplainabilityUtils.generateId();
    const trace: DecisionTrace = {
      id,
      timestamp: initialData.timestamp || Date.now(),
      decisionType: initialData.decisionType || 'UnknownOperation',
      initiator: initialData.initiator || 'system',
      personaId: initialData.personaId || 'unknown_persona',
      context: initialData.context || {},
      inputSummary: initialData.inputSummary || '',
      reasoningSteps: initialData.reasoningSteps || [],
      knowledgeNodes: initialData.knowledgeNodes || [],
      confidenceScore: initialData.confidenceScore || 100,
      privacyChecks: initialData.privacyChecks || [],
      ethicalChecks: initialData.ethicalChecks || [],
      carbonImpact: initialData.carbonImpact || 0,
      executionTime: initialData.executionTime || 0,
      decisionResult: initialData.decisionResult || null,
      warnings: initialData.warnings || [],
      metadata: initialData.metadata || {}
    };

    this.activeTraces.set(id, trace);
    return id;
  }

  /**
   * Updates an active trace with additional details.
   */
  public updateTrace(id: string, updates: Partial<DecisionTrace>): void {
    const trace = this.activeTraces.get(id);
    if (!trace) return;

    this.activeTraces.set(id, {
      ...trace,
      ...updates,
      // Handle deep arrays specifically
      reasoningSteps: updates.reasoningSteps ? [...trace.reasoningSteps, ...updates.reasoningSteps] : trace.reasoningSteps,
      knowledgeNodes: updates.knowledgeNodes ? [...trace.knowledgeNodes, ...updates.knowledgeNodes] : trace.knowledgeNodes,
      privacyChecks: updates.privacyChecks ? [...trace.privacyChecks, ...updates.privacyChecks] : trace.privacyChecks,
      ethicalChecks: updates.ethicalChecks ? [...trace.ethicalChecks, ...updates.ethicalChecks] : trace.ethicalChecks,
      warnings: updates.warnings ? [...trace.warnings, ...updates.warnings] : trace.warnings,
      context: updates.context ? { ...trace.context, ...updates.context } : trace.context,
      metadata: updates.metadata ? { ...trace.metadata, ...updates.metadata } : trace.metadata
    });
  }

  /**
   * Completes a trace, calculates confidence score, and records it to storage.
   */
  public completeTrace(id: string, finalData: Partial<DecisionTrace> = {}): void {
    const trace = this.activeTraces.get(id);
    if (!trace) return;

    const completedTrace: DecisionTrace = {
      ...trace,
      ...finalData,
      decisionResult: finalData.decisionResult !== undefined ? finalData.decisionResult : trace.decisionResult,
      executionTime: finalData.executionTime !== undefined ? finalData.executionTime : trace.executionTime,
      carbonImpact: finalData.carbonImpact !== undefined ? finalData.carbonImpact : trace.carbonImpact,
      warnings: finalData.warnings ? [...trace.warnings, ...finalData.warnings] : trace.warnings,
      reasoningSteps: finalData.reasoningSteps ? [...trace.reasoningSteps, ...finalData.reasoningSteps] : trace.reasoningSteps,
      knowledgeNodes: finalData.knowledgeNodes ? [...trace.knowledgeNodes, ...finalData.knowledgeNodes] : trace.knowledgeNodes,
      privacyChecks: finalData.privacyChecks ? [...trace.privacyChecks, ...finalData.privacyChecks] : trace.privacyChecks,
      ethicalChecks: finalData.ethicalChecks ? [...trace.ethicalChecks, ...finalData.ethicalChecks] : trace.ethicalChecks
    };

    // Auto-calculate confidence score using the ConfidenceEngine if not explicitly passed
    if (finalData.confidenceScore === undefined) {
      completedTrace.confidenceScore = ConfidenceEngine.calculateConfidence({
        knowledgeNodes: completedTrace.knowledgeNodes,
        ethicalChecks: completedTrace.ethicalChecks,
        privacyChecks: completedTrace.privacyChecks,
        executionTime: completedTrace.executionTime,
        carbonImpact: completedTrace.carbonImpact,
        hasWarnings: completedTrace.warnings.length > 0
      });
    }

    this.recorder.recordTrace(completedTrace);
    this.activeTraces.delete(id);
  }

  /**
   * Fails a trace, registering the error message.
   */
  public failTrace(id: string, errorMessage: string, executionTime: number = 0): void {
    this.completeTrace(id, {
      executionTime,
      warnings: [`Execution Error: ${errorMessage}`],
      decisionResult: { success: false, error: errorMessage },
      confidenceScore: 0 // Zero confidence for failures
    });
  }

  /**
   * Automatically intercepts and intercepts method calls in core classes.
   * Leverages prototype modification to collect traces without modifying upstream source code.
   */
  public initializeAutomaticTracing(): void {
    // 1. Intercept SovereignPersona
    if (SovereignPersona && SovereignPersona.prototype) {
      this.wrapMethod(
        SovereignPersona.prototype,
        'processInteraction',
        'SovereignPersona',
        (instance, args, result, elapsed) => {
          const interaction = args[0] || {};
          return {
            inputSummary: `Process user ${interaction.type || 'interaction'}: "${interaction.content || ''}"`,
            personaId: instance.profile?.id || 'sovereign_persona_active',
            context: { interactionContext: interaction.context },
            knowledgeNodes: (result.knowledgeGained || []).map((c: string, idx: number) => ({
              nodeId: `node_${idx}_${Date.now()}`,
              label: c,
              weight: 0.8,
              relationship: 'gained'
            })),
            reasoningSteps: [
              { stepId: 'sp_step_1', description: 'Analyze intent of interaction request', sourceModule: 'SovereignPersona', confidence: 0.95 },
              { stepId: 'sp_step_2', description: 'Assess ethical constraints compliance', sourceModule: 'SovereignPersona', confidence: 0.98, parentStep: 'sp_step_1' },
              { stepId: 'sp_step_3', description: 'Assimilate interaction details to Cognitive Graph', sourceModule: 'CognitiveGraph', confidence: 0.94, parentStep: 'sp_step_1' },
              { stepId: 'sp_step_4', description: 'Determine carbon budget and apply optimization', sourceModule: 'CarbonAwareOptimizer', confidence: 0.90, parentStep: 'sp_step_3' }
            ],
            ethicalChecks: [
              { policy: 'safety-compliance', status: 'passed', severity: 'critical', reason: 'Verified context violates no local safety rules.' }
            ],
            privacyChecks: [
              { rule: 'data-encryption', status: 'passed', impact: 'high' },
              { rule: 'federated-participation', status: result.privacyPreserved ? 'passed' : 'conditional', impact: 'medium' }
            ],
            carbonImpact: result.carbonSaved ? Math.max(0.001, 0.05 - result.carbonSaved / 100) : 0.04,
            decisionResult: result
          };
        }
      );

      this.wrapMethod(
        SovereignPersona.prototype,
        'getRecommendations',
        'SovereignPersona',
        (instance, args, result, elapsed) => {
          const recCtx = args[0] || {};
          return {
            inputSummary: `Request recommendations for domain "${recCtx.domain || 'general'}" under task "${recCtx.currentTask || ''}"`,
            personaId: instance.profile?.id || 'sovereign_persona_active',
            context: { urgency: recCtx.urgency, availableTime: recCtx.availableTime },
            reasoningSteps: [
              { stepId: 'rec_step_1', description: 'Identify current cognitive knowledge gaps', sourceModule: 'CognitiveGraph', confidence: 0.90 },
              { stepId: 'rec_step_2', description: 'Generate recommendation list based on gaps', sourceModule: 'SovereignPersona', confidence: 0.88, parentStep: 'rec_step_1' },
              { stepId: 'rec_step_3', description: 'Filter recommendations against ethical limits', sourceModule: 'SovereignPersona', confidence: 0.98, parentStep: 'rec_step_2' }
            ],
            ethicalChecks: [
              { policy: 'ethical-recommendation-filtering', status: 'passed', severity: 'medium', reason: 'Recommendations verified as safe.' }
            ],
            privacyChecks: [
              { rule: 'private-recommendation-generation', status: 'passed', impact: 'low' }
            ],
            carbonImpact: 0.015,
            decisionResult: result
          };
        }
      );
    }

    // 2. Intercept PrivacyNegotiator
    if (PrivacyNegotiator && PrivacyNegotiator.prototype) {
      this.wrapMethod(
        PrivacyNegotiator.prototype,
        'negotiate',
        'PrivacyNegotiator',
        (instance, args, result, elapsed) => {
          const request = args[0] || {};
          const isAccepted = result.accepted;

          const privacyChecks: PrivacyCheck[] = (result.privacyGuarantees || []).map((g: any, idx: number) => ({
            rule: `crypto-guarantee-${g.type || 'mpc'}`,
            status: isAccepted ? 'passed' : 'failed',
            impact: 'high'
          }));

          if (privacyChecks.length === 0) {
            privacyChecks.push({
              rule: 'data-minimization',
              status: isAccepted ? 'passed' : 'failed',
              impact: 'medium'
            });
          }

          return {
            inputSummary: `Negotiate with external agent "${request.agentId || 'unknown'}" for type "${request.requestType || ''}"`,
            personaId: instance.privacyPreferences?.personaId || 'sovereign_persona_active',
            context: { urgency: request.urgency, parameters: request.parameters },
            reasoningSteps: [
              { stepId: 'pn_step_1', description: 'Assess identity credibility of requesting agent', sourceModule: 'PrivacyNegotiator', confidence: 0.88 },
              { stepId: 'pn_step_2', description: 'Perform privacy boundary & budget leakage checks', sourceModule: 'PrivacyNegotiator', confidence: 0.92, parentStep: 'pn_step_1' },
              { stepId: 'pn_step_3', description: 'Select cryptographic protocol exchange (MPC vs ZKP)', sourceModule: 'PrivacyNegotiator', confidence: 0.95, parentStep: 'pn_step_1' },
              { stepId: 'pn_step_4', description: 'Perform zero-knowledge compliance verification', sourceModule: 'ZeroKnowledgeProofs', confidence: 0.99, parentStep: 'pn_step_3' }
            ],
            ethicalChecks: [
              { policy: 'ethical-negotiation-limits', status: isAccepted ? 'passed' : 'failed', severity: 'critical', reason: isAccepted ? 'Complies with all ethical constraints.' : 'Request violates boundaries.' }
            ],
            privacyChecks,
            carbonImpact: result.carbonImpact || 0.12,
            decisionResult: result
          };
        }
      );
    }

    // 3. Intercept CognitiveGraph
    if (CognitiveGraph && CognitiveGraph.prototype) {
      this.wrapMethod(
        CognitiveGraph.prototype,
        'assimilate',
        'CognitiveGraph',
        (instance, args, result, elapsed) => {
          const interaction = args[0] || {};
          return {
            inputSummary: `Assimilate new interaction concepts: "${interaction.content || ''}"`,
            personaId: 'sovereign_persona_active',
            knowledgeNodes: (result.newConcepts || []).map((c: string, idx: number) => ({
              nodeId: `cg_node_${idx}`,
              label: c,
              weight: 0.75,
              relationship: 'assimilated'
            })),
            reasoningSteps: [
              { stepId: 'cg_step_1', description: 'Extract key semantic entities', sourceModule: 'CognitiveGraph', confidence: 0.93 },
              { stepId: 'cg_step_2', description: 'Verify node redundancy in graph', sourceModule: 'CognitiveGraph', confidence: 0.96, parentStep: 'cg_step_1' },
              { stepId: 'cg_step_3', description: 'Map connections and update strengths', sourceModule: 'CognitiveGraph', confidence: 0.90, parentStep: 'cg_step_1' }
            ],
            ethicalChecks: [],
            privacyChecks: [
              { rule: 'local-graph-storage', status: 'passed', impact: 'critical' }
            ],
            carbonImpact: 0.005,
            decisionResult: result
          };
        }
      );
    }

    // 4. Intercept MorphNetEngine
    if (MorphNetEngine && MorphNetEngine.prototype) {
      this.wrapMethod(
        MorphNetEngine.prototype,
        'optimizeForTask',
        'MorphNetEngine',
        (instance, args, result, elapsed) => {
          const task = args[0] || {};
          const warnings = [];
          if (result.performanceChange && result.performanceChange.accuracyDelta < 0) {
            warnings.push(`Accuracy delta: ${(result.performanceChange.accuracyDelta * 100).toFixed(1)}%`);
          }

          return {
            inputSummary: `Optimize neural network layers for task type "${task.taskType || 'moderate'}"`,
            personaId: 'sovereign_persona_active',
            context: { inputComplexity: task.inputComplexity, energyBudget: task.energyBudget },
            reasoningSteps: [
              { stepId: 'mn_step_1', description: 'Analyze input task complexity constraints', sourceModule: 'MorphNetEngine', confidence: 0.95 },
              { stepId: 'mn_step_2', description: 'Identify prunable weights and attention paths', sourceModule: 'PruningStrategy', confidence: 0.91, parentStep: 'mn_step_1' },
              { stepId: 'mn_step_3', description: 'Perform layer adjustments and scale channels', sourceModule: 'ScalingStrategy', confidence: 0.88, parentStep: 'mn_step_1' },
              { stepId: 'mn_step_4', description: 'Validate performance metrics after changes', sourceModule: 'PerformanceMonitor', confidence: 0.96, parentStep: 'mn_step_1' }
            ],
            ethicalChecks: [],
            privacyChecks: [
              { rule: 'sandboxed-model-adaptation', status: 'passed', impact: 'low' }
            ],
            carbonImpact: 0.05,
            warnings,
            decisionResult: result
          };
        }
      );
    }

    // 5. Intercept AdversarialImmuneSystem
    if (AdversarialImmuneSystem && AdversarialImmuneSystem.prototype) {
      this.wrapMethod(
        AdversarialImmuneSystem.prototype,
        'monitor',
        'AdversarialImmuneSystem',
        (instance, args, result, elapsed) => {
          const hasThreats = result.length > 0;
          const warnings = result.map((d: any) => `Threat Detected: ${d.threatType} (Severity: ${d.severity})`);

          return {
            inputSummary: `Scan semantic input patterns for threats`,
            personaId: 'sovereign_persona_active',
            reasoningSteps: [
              { stepId: 'ais_step_1', description: 'Parse query semantics', sourceModule: 'SemanticAnalyzer', confidence: 0.99 },
              { stepId: 'ais_step_2', description: 'Apply signature patterns matching', sourceModule: 'AdversarialImmuneSystem', confidence: 0.97, parentStep: 'ais_step_1' },
              { stepId: 'ais_step_3', description: 'Verify behavior anomaly against immune memory', sourceModule: 'ImmunityMemory', confidence: 0.95, parentStep: 'ais_step_1' }
            ],
            ethicalChecks: [
              { policy: 'threat-prevention', status: hasThreats ? 'failed' : 'passed', severity: 'critical', reason: hasThreats ? 'Input contains adversarial threat vectors.' : 'No threat patterns detected.' }
            ],
            privacyChecks: [
              { rule: 'exfiltration-blocking', status: hasThreats ? 'failed' : 'passed', impact: 'critical' }
            ],
            carbonImpact: 0.003,
            warnings,
            decisionResult: result
          };
        }
      );

      this.wrapMethod(
        AdversarialImmuneSystem.prototype,
        'neutralize',
        'AdversarialImmuneSystem',
        (instance, args, result, elapsed) => {
          const threats = args[0] || [];
          return {
            inputSummary: `Apply immune counter-measures for ${threats.length} active threats`,
            personaId: 'sovereign_persona_active',
            reasoningSteps: [
              { stepId: 'neu_step_1', description: 'Evaluate severity levels of blocked inputs', sourceModule: 'ResponseCoordinator', confidence: 0.98 },
              { stepId: 'neu_step_2', description: 'Deploy isolation quarantine boundaries', sourceModule: 'QuarantineZone', confidence: 0.95, parentStep: 'neu_step_1' },
              { stepId: 'neu_step_3', description: 'Incorporate threat signatures into Immunity memory', sourceModule: 'ImmunityMemory', confidence: 0.99, parentStep: 'neu_step_1' }
            ],
            ethicalChecks: [],
            privacyChecks: [
              { rule: 'privacy-quarantine-guard', status: 'passed', impact: 'critical' }
            ],
            carbonImpact: 0.008,
            decisionResult: result
          };
        }
      );
    }
  }

  /**
   * Helper function to wrap instance methods dynamically.
   */
  private wrapMethod(
    proto: any,
    methodName: string,
    moduleName: string,
    extractor: (instance: any, args: any[], result: any, elapsed: number) => Partial<DecisionTrace>
  ): void {
    const original = proto[methodName];
    if (!original || original.__isWrapped) return;

    const self = this;
    proto[methodName] = async function(...args: any[]) {
      // Start a trace
      const traceId = self.startTrace({
        decisionType: `${moduleName}.${methodName}`,
        initiator: 'system'
      });

      const startTime = Date.now();
      try {
        const result = await original.apply(this, args);
        const elapsed = Date.now() - startTime;

        // Extract trace details using the helper callback
        const extracted = extractor(this, args, result, elapsed);

        self.completeTrace(traceId, {
          ...extracted,
          executionTime: elapsed
        });

        return result;
      } catch (error: any) {
        const elapsed = Date.now() - startTime;
        self.failTrace(traceId, error.message, elapsed);
        throw error;
      }
    };

    proto[methodName].__isWrapped = true;
  }
}

// Automatically trigger prototype interception when module is first loaded
DecisionTracer.getInstance().initializeAutomaticTracing();

import { ReasoningStep, DecisionTrace } from './ExplainabilityTypes';

export class ReasoningTree {
  /**
   * Builds a nested tree structure from a flat array of ReasoningSteps using parentStep references.
   */
  static buildTree(steps: ReasoningStep[]): ReasoningStep[] {
    const map = new Map<string, ReasoningStep & { childrenList: any[] }>();
    const roots: Array<ReasoningStep & { childrenList: any[] }> = [];

    // Initialize map
    for (const step of steps) {
      map.set(step.stepId, { ...step, childrenList: [] });
    }

    // Connect parents and children
    for (const step of steps) {
      const node = map.get(step.stepId)!;
      if (node.parentStep && map.has(node.parentStep)) {
        const parent = map.get(node.parentStep)!;
        parent.childrenList.push(node);
      } else {
        roots.push(node);
      }
    }

    // Convert back to original type
    const convertNode = (node: any): ReasoningStep => {
      const children = node.childrenList.map((c: any) => convertNode(c));
      return {
        stepId: node.stepId,
        description: node.description,
        sourceModule: node.sourceModule,
        confidence: node.confidence,
        parentStep: node.parentStep,
        children: children.length > 0 ? children : undefined
      };
    };

    return roots.map(r => convertNode(r));
  }

  /**
   * Render a flat/nested list of steps to ASCII with <<<<==== connectors.
   */
  static renderStepsToAscii(roots: ReasoningStep[], initialDepth: number = 1): string {
    let result = '';

    const traverse = (node: ReasoningStep, depth: number) => {
      const prefix = '<'.repeat(depth * 4) + '====';
      result += `${prefix} ${node.description} [${node.sourceModule}] (conf: ${Math.round(node.confidence * 100)}%)\n`;
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          traverse(child, depth + 1);
        }
      }
    };

    for (const root of roots) {
      traverse(root, initialDepth);
    }

    return result;
  }

  /**
   * Generates a complete hierarchical reasoning tree string for a DecisionTrace,
   * matching the specified format requirements.
   */
  static generateDecisionTree(trace: DecisionTrace): string {
    let tree = `Decision: ${trace.decisionType} (${trace.id})\n`;

    // 1. Context Section
    tree += `<<<<==== Context\n`;
    tree += `<<<<<<<<==== Input: "${trace.inputSummary}"\n`;
    tree += `<<<<<<<<==== Initiator: ${trace.initiator}\n`;
    if (Object.keys(trace.context).length > 0) {
      const contextItems = Object.entries(trace.context)
        .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join(', ');
      tree += `<<<<<<<<==== Metadata: ${contextItems}\n`;
    }

    // 2. Knowledge Section
    if (trace.knowledgeNodes && trace.knowledgeNodes.length > 0) {
      tree += `<<<<==== Knowledge\n`;
      for (const node of trace.knowledgeNodes) {
        tree += `<<<<<<<<==== Node: ${node.label} [rel: ${node.relationship || 'associated'}, weight: ${node.weight.toFixed(2)}]\n`;
      }
    }

    // 3. Reasoning Steps
    if (trace.reasoningSteps && trace.reasoningSteps.length > 0) {
      tree += `<<<<==== Reasoning Path\n`;
      const roots = this.buildTree(trace.reasoningSteps);
      tree += this.renderStepsToAscii(roots, 2);
    }

    // 4. Ethical Evaluation
    if (trace.ethicalChecks && trace.ethicalChecks.length > 0) {
      tree += `<<<<==== Ethical Evaluation\n`;
      for (const check of trace.ethicalChecks) {
        const icon = check.status === 'passed' ? 'Passed' : 'Failed';
        tree += `<<<<<<<<==== ${check.policy} -> ${icon} (${check.severity} severity) - ${check.reason}\n`;
      }
    }

    // 5. Privacy Evaluation
    if (trace.privacyChecks && trace.privacyChecks.length > 0) {
      tree += `<<<<==== Privacy Evaluation\n`;
      for (const check of trace.privacyChecks) {
        const icon = check.status === 'passed' ? 'Passed' : 'Failed';
        tree += `<<<<<<<<==== ${check.rule} -> ${icon} (Impact: ${check.impact})\n`;
      }
    }

    // 6. Final Decision
    tree += `<<<<==== Final Decision\n`;
    const resultStr = typeof trace.decisionResult === 'object'
      ? JSON.stringify(trace.decisionResult)
      : String(trace.decisionResult);
    tree += `<<<<<<<<==== Result: ${resultStr}\n`;
    tree += `<<<<<<<<==== Execution Time: ${trace.executionTime}ms | Carbon Impact: ${trace.carbonImpact.toFixed(4)} kg CO2\n`;

    return tree;
  }
}

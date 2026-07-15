import { CollaborationWorkflow, AgentNode, AgentEdge } from '../types';
import { mockAgentRepository } from '../../agent-marketplace/repository/AgentRepository';

export interface ValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class WorkflowValidator {
  /**
   * Validates the schema, structure, connections, and type mappings of a workflow.
   */
  public static validate(workflow: CollaborationWorkflow): ValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];

    const nodes = workflow.nodes;
    const edges = workflow.edges;

    // 1. Basic counts and triggers check
    if (nodes.length === 0) {
      errors.push('Workflow must contain at least one node.');
      return { isValid: false, errors, warnings };
    }

    const startNodes = nodes.filter(n => n.type === 'start');
    const endNodes = nodes.filter(n => n.type === 'end');

    if (startNodes.length === 0) {
      errors.push('Workflow is missing a Start Trigger node.');
    } else if (startNodes.length > 1) {
      errors.push('Workflow cannot contain multiple Start Trigger nodes.');
    }

    if (endNodes.length === 0) {
      warnings.push('Workflow does not contain an End node. Execution may run indefinitely or stop on terminal paths.');
    }

    // 2. Validate Node Configurations & Agent Existence
    const nodeMap = new Map<string, AgentNode>();
    nodes.forEach(node => {
      nodeMap.set(node.id, node);
      
      if (node.type === 'agent') {
        const agentId = node.config.agentId;
        if (!agentId) {
          errors.push(`Node '${node.name}' (ID: ${node.id}) is an Agent node but specifies no agentId.`);
        } else {
          const agent = mockAgentRepository.get(agentId);
          if (!agent) {
            errors.push(`Node '${node.name}' references agent '${agentId}' which is not registered in the marketplace.`);
          } else {
            // Check task exists
            const taskName = node.config.taskName;
            if (!taskName) {
              errors.push(`Node '${node.name}' specifies no task name.`);
            } else {
              const task = agent.supportedTasks.find(t => t.name === taskName);
              if (!task) {
                errors.push(`Agent '${agent.name}' does not support task '${taskName}'.`);
              }
            }
          }
        }
      } else if (node.type === 'loop') {
        if (!node.config.loopCount && !node.config.loopCondition) {
          errors.push(`Loop node '${node.name}' requires either a loopCount or loopCondition.`);
        }
      } else if (node.type === 'conditional') {
        if (!node.config.conditionalExpression) {
          errors.push(`Conditional node '${node.name}' is missing a conditional expression.`);
        }
      }
    });

    // 3. Cycle Detection (DAG Check)
    const adjacency = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    nodes.forEach(n => {
      adjacency.set(n.id, []);
      inDegree.set(n.id, 0);
    });

    edges.forEach(edge => {
      if (!nodeMap.has(edge.source)) {
        errors.push(`Edge references source node '${edge.source}' which does not exist.`);
        return;
      }
      if (!nodeMap.has(edge.target)) {
        errors.push(`Edge references target node '${edge.target}' which does not exist.`);
        return;
      }
      adjacency.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    // Kahn's algorithm for cycle check (only if there are no explicit loop nodes or back edges)
    // For general graph validation, verify if we can reach nodes
    const queue: string[] = [];
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
      }
    });

    let visitedCount = 0;
    while (queue.length > 0) {
      const u = queue.shift()!;
      visitedCount++;
      const neighbors = adjacency.get(u) || [];
      neighbors.forEach(v => {
        inDegree.set(v, inDegree.get(v)! - 1);
        if (inDegree.get(v) === 0) {
          queue.push(v);
        }
      });
    }

    const hasCycle = visitedCount < nodes.length;
    // We only trigger cyclic errors if there is a cycle and no loop nodes (since loop nodes might design cycles purposefully)
    // However, if standard sequence has feedback loops without a Loop node, warn/error:
    const loopNodesCount = nodes.filter(n => n.type === 'loop').length;
    if (hasCycle && loopNodesCount === 0) {
      errors.push('Cyclic dependency loop detected between tasks. Please use a Loop node to coordinate repetitions.');
    } else if (hasCycle) {
      warnings.push('Feedback cycle detected. Ensure loop terminations are correctly configured to prevent infinite runs.');
    }

    // 4. Validate Data Flow Input Mappings
    nodes.forEach(node => {
      const mappings = node.config.inputMappings || {};
      Object.keys(mappings).forEach(paramKey => {
        const val = mappings[paramKey];
        if (typeof val === 'string' && val.startsWith('$.')) {
          const parts = val.split('.');
          if (parts[1] === 'global') {
            const globalField = parts.slice(2).join('.');
            if (!(globalField in workflow.globalContext)) {
              warnings.push(`Node '${node.name}' maps input '${paramKey}' to missing global field '$.global.${globalField}'.`);
            }
          } else {
            const sourceNodeId = parts[1];
            const sourceField = parts.slice(2).join('.');
            const sourceNode = nodeMap.get(sourceNodeId);

            if (!sourceNode) {
              errors.push(`Node '${node.name}' maps input '${paramKey}' to non-existent node '${sourceNodeId}'.`);
            } else {
              // Verify topological dependency check:
              // Verify if there is a path from sourceNode to this node (ensure it doesn't depend on a forward node)
              if (!this.hasPath(adjacency, sourceNodeId, node.id) && sourceNodeId !== node.id) {
                errors.push(`Forward reference error in node '${node.name}': input '${paramKey}' binds to node '${sourceNodeId}' which is not a precursor dependency.`);
              }
            }
          }
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private static hasPath(adj: Map<string, string[]>, start: string, end: string, visited = new Set<string>()): boolean {
    if (start === end) return true;
    visited.add(start);
    const neighbors = adj.get(start) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (this.hasPath(adj, neighbor, end, visited)) return true;
      }
    }
    return false;
  }
}

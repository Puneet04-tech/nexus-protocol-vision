import { AgentNode, AgentEdge, NodeState } from '../types';

export class DAGResolver {
  /**
   * Performs topological sort using Kahn's algorithm.
   */
  public static resolve(nodes: AgentNode[], edges: AgentEdge[]): AgentNode[] {
    const sorted: AgentNode[] = [];
    const inDegree = new Map<string, number>();
    const nodeMap = new Map<string, AgentNode>();
    const adjacency = new Map<string, string[]>();

    nodes.forEach(node => {
      nodeMap.set(node.id, node);
      inDegree.set(node.id, 0);
      adjacency.set(node.id, []);
    });

    edges.forEach(edge => {
      adjacency.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    const queue: string[] = [];
    inDegree.forEach((degree, id) => {
      if (degree === 0) {
        queue.push(id);
      }
    });

    while (queue.length > 0) {
      const id = queue.shift()!;
      const node = nodeMap.get(id);
      if (node) {
        sorted.push(node);
      }

      const neighbors = adjacency.get(id) || [];
      neighbors.forEach(neighborId => {
        inDegree.set(neighborId, inDegree.get(neighborId)! - 1);
        if (inDegree.get(neighborId) === 0) {
          queue.push(neighborId);
        }
      });
    }

    if (sorted.length !== nodes.length) {
      throw new Error('Cyclic dependency detected in workflow nodes.');
    }

    return sorted;
  }

  /**
   * Groups task nodes into parallel execution tiers/levels.
   */
  public static groupIntoLevels(nodes: AgentNode[], edges: AgentEdge[]): AgentNode[][] {
    const levels: AgentNode[][] = [];
    const nodeLevels = new Map<string, number>();
    const nodeMap = new Map<string, AgentNode>();
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();
    const reverseAdjacency = new Map<string, string[]>();

    nodes.forEach(node => {
      nodeMap.set(node.id, node);
      inDegree.set(node.id, 0);
      adjacency.set(node.id, []);
      reverseAdjacency.set(node.id, []);
    });

    edges.forEach(edge => {
      adjacency.get(edge.source)?.push(edge.target);
      reverseAdjacency.get(edge.target)?.push(edge.source);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    const queue: string[] = [];
    inDegree.forEach((degree, id) => {
      if (degree === 0) {
        queue.push(id);
        nodeLevels.set(id, 0);
      }
    });

    while (queue.length > 0) {
      const currId = queue.shift()!;
      const currLevel = nodeLevels.get(currId) || 0;

      const neighbors = adjacency.get(currId) || [];
      neighbors.forEach(neighborId => {
        const currentNeighborLevel = nodeLevels.get(neighborId) || -1;
        nodeLevels.set(neighborId, Math.max(currentNeighborLevel, currLevel + 1));
        
        inDegree.set(neighborId, inDegree.get(neighborId)! - 1);
        if (inDegree.get(neighborId) === 0) {
          queue.push(neighborId);
        }
      });
    }

    nodeLevels.forEach((level, id) => {
      const node = nodeMap.get(id);
      if (node) {
        if (!levels[level]) {
          levels[level] = [];
        }
        levels[level].push(node);
      }
    });

    return levels.filter(lvl => lvl && lvl.length > 0);
  }

  /**
   * Evaluates if dependencies are satisfied and retrieves run-ready nodes.
   */
  public static getSchedulableNodes(
    nodes: AgentNode[],
    edges: AgentEdge[],
    maxConcurrency = Infinity
  ): AgentNode[] {
    const runningCount = nodes.filter(n => n.state === NodeState.RUNNING || n.state === NodeState.PAUSED).length;
    const availableSlots = maxConcurrency - runningCount;
    if (availableSlots <= 0) return [];

    const completedIds = new Set(
      nodes
        .filter(n => n.state === NodeState.COMPLETED || n.state === NodeState.SKIPPED)
        .map(n => n.id)
    );

    const adjacency = new Map<string, string[]>();
    const incoming = new Map<string, string[]>();

    nodes.forEach(n => {
      adjacency.set(n.id, []);
      incoming.set(n.id, []);
    });

    edges.forEach(e => {
      adjacency.get(e.source)?.push(e.target);
      incoming.get(e.target)?.push(e.source);
    });

    const schedulable: AgentNode[] = [];

    nodes.forEach(node => {
      if (node.state !== NodeState.PENDING) return;

      const parentIds = incoming.get(node.id) || [];
      const dependenciesSatisfied = parentIds.every(pId => completedIds.has(pId));

      if (dependenciesSatisfied) {
        schedulable.push(node);
      }
    });

    return schedulable.slice(0, availableSlots);
  }
}

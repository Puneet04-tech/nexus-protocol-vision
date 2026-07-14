import { GraphNode } from '../../sovereign-persona/types';

export interface AttributeDiff {
  oldValue: any;
  newValue: any;
  changed: boolean;
}

export interface NodeDiff {
  nodeId: string;
  domain: AttributeDiff;
  complexity: AttributeDiff;
  confidence: AttributeDiff;
  accessCount: AttributeDiff;
  metadata: {
    added: string[];
    removed: string[];
    modified: Record<string, AttributeDiff>;
  };
  relatedConcepts: {
    added: string[];
    removed: string[];
  };
  hasChanges: boolean;
}

export class DiffGenerator {
  public static compareNodes(node1: GraphNode, node2: GraphNode): NodeDiff {
    const compare = (val1: any, val2: any): AttributeDiff => {
      const changed = JSON.stringify(val1) !== JSON.stringify(val2);
      return { oldValue: val1, newValue: val2, changed };
    };

    const domain = compare(node1.domain, node2.domain);
    const complexity = compare(node1.complexity, node2.complexity);
    const confidence = compare(node1.confidence, node2.confidence);
    const accessCount = compare(node1.accessCount, node2.accessCount);

    // Related concepts diff
    const rc1 = node1.relatedConcepts || [];
    const rc2 = node2.relatedConcepts || [];
    const addedConcepts = rc2.filter(c => !rc1.includes(c));
    const removedConcepts = rc1.filter(c => !rc2.includes(c));

    // Metadata keys
    const meta1 = node1.metadata || {};
    const meta2 = node2.metadata || {};
    const keys1 = Object.keys(meta1);
    const keys2 = Object.keys(meta2);

    const addedMeta = keys2.filter(k => !keys1.includes(k));
    const removedMeta = keys1.filter(k => !keys2.includes(k));
    const modifiedMeta: Record<string, AttributeDiff> = {};

    for (const key of keys1) {
      if (keys2.includes(key)) {
        const diff = compare(meta1[key], meta2[key]);
        if (diff.changed) {
          modifiedMeta[key] = diff;
        }
      }
    }

    const hasChanges =
      domain.changed ||
      complexity.changed ||
      confidence.changed ||
      addedConcepts.length > 0 ||
      removedConcepts.length > 0 ||
      addedMeta.length > 0 ||
      removedMeta.length > 0 ||
      Object.keys(modifiedMeta).length > 0;

    return {
      nodeId: node1.id,
      domain,
      complexity,
      confidence,
      accessCount,
      metadata: {
        added: addedMeta,
        removed: removedMeta,
        modified: modifiedMeta,
      },
      relatedConcepts: {
        added: addedConcepts,
        removed: removedConcepts,
      },
      hasChanges,
    };
  }
}

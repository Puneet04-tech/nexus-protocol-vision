import { MemoryScope, MemorySlot } from '../types';

export class SharedMemory {
  private slots = new Map<string, MemorySlot>();
  private history: Array<{
    timestamp: number;
    key: string;
    value: any;
    nodeId: string;
    version: number;
  }> = [];

  constructor(initialGlobals: Record<string, any> = {}) {
    Object.keys(initialGlobals).forEach(key => {
      this.setVariable(key, initialGlobals[key], MemoryScope.GLOBAL, 'system-init');
    });
  }

  /**
   * Set a variable slot with scope, permissions, and version tracking.
   */
  public setVariable(
    key: string,
    value: any,
    scope: MemoryScope,
    nodeId: string,
    allowedNodeIds?: string[]
  ): void {
    const existing = this.slots.get(key);
    const nextVersion = existing ? existing.version + 1 : 1;

    // Check permissions if restricted
    if (existing && existing.allowedNodeIds && !existing.allowedNodeIds.includes(nodeId) && nodeId !== 'system-init') {
      throw new Error(`Write access denied for node '${nodeId}' on protected memory slot '${key}'`);
    }

    const slot: MemorySlot = {
      key,
      value,
      scope,
      version: nextVersion,
      lastUpdatedByNodeId: nodeId,
      allowedNodeIds
    };

    this.slots.set(key, slot);
    this.history.push({
      timestamp: Date.now(),
      key,
      value,
      nodeId,
      version: nextVersion
    });
  }

  /**
   * Fetch value of a variable.
   */
  public getVariable(key: string, nodeId?: string): any {
    const slot = this.slots.get(key);
    if (!slot) return undefined;

    // Check read permission
    if (nodeId && slot.allowedNodeIds && !slot.allowedNodeIds.includes(nodeId) && nodeId !== 'system-init') {
      throw new Error(`Read access denied for node '${nodeId}' on protected memory slot '${key}'`);
    }

    return slot.value;
  }

  /**
   * Resolve interpolation targets (e.g. $.node_id.output_field, $.global.field)
   */
  public resolveValue(expression: string, nodeId?: string): any {
    if (typeof expression !== 'string' || !expression.startsWith('$.')) {
      return expression; // Plain literal value
    }

    const parts = expression.substring(2).split('.');
    const scopeSource = parts[0];

    if (scopeSource === 'global') {
      const field = parts.slice(1).join('.');
      return this.getVariable(field, nodeId);
    } else {
      // Node reference, e.g. $.node-rag.results[0].content
      const targetNodeId = scopeSource;
      const nodeSlotKey = `node_output_${targetNodeId}`;
      const output = this.getVariable(nodeSlotKey, nodeId);

      if (!output) return undefined;

      // Drill down properties using dot notation
      let currentVal = output;
      const propertyPath = parts.slice(1);

      for (const prop of propertyPath) {
        if (currentVal === null || currentVal === undefined) return undefined;

        // Check if property is an array index or dictionary lookup
        const arrayMatch = prop.match(/^([^\[]+)\[(\d+)\]$/);
        if (arrayMatch) {
          const dictKey = arrayMatch[1];
          const index = parseInt(arrayMatch[2], 10);
          currentVal = currentVal[dictKey]?.[index];
        } else {
          currentVal = currentVal[prop];
        }
      }

      return currentVal;
    }
  }

  /**
   * Scrapes and interpolates string arguments containing $.{...} tokens
   */
  public interpolateString(text: string, nodeId?: string): string {
    if (typeof text !== 'string') return text;
    
    // Find all occurrences of $.xxxx.yyyy
    return text.replace(/\$\.[a-zA-Z0-9_\-\[\]\.]+/g, match => {
      const resolved = this.resolveValue(match, nodeId);
      return resolved !== undefined ? (typeof resolved === 'object' ? JSON.stringify(resolved) : String(resolved)) : match;
    });
  }

  /**
   * Returns complete history log list.
   */
  public getHistory() {
    return this.history;
  }

  /**
   * Returns current variables map state.
   */
  public getSnapshot(): Record<string, any> {
    const snapshot: Record<string, any> = {};
    this.slots.forEach((slot, key) => {
      snapshot[key] = slot.value;
    });
    return snapshot;
  }
}

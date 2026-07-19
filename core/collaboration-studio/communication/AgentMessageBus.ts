import { AgentMessage, MessageType } from '../types';

export interface ConflictCandidate {
  nodeId: string;
  value: any;
  reputation: number;
}

export class AgentMessageBus {
  private messages: AgentMessage[] = [];
  private listeners: Map<string, Array<(msg: AgentMessage) => void>> = new Map();

  /**
   * Broadcasts or routes a direct message from one node to other listeners.
   */
  public sendMessage(
    senderId: string,
    receiverId: string | undefined,
    type: MessageType,
    payload: Record<string, any>,
    channel?: string
  ): AgentMessage {
    const msg: AgentMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      senderId,
      receiverId,
      type,
      payload,
      channel
    };

    this.messages.push(msg);

    // Notify listeners matching channel or direct address
    if (channel) {
      const channelListeners = this.listeners.get(`chan_${channel}`) || [];
      channelListeners.forEach(listener => listener(msg));
    }

    if (receiverId) {
      const nodeListeners = this.listeners.get(`node_${receiverId}`) || [];
      nodeListeners.forEach(listener => listener(msg));
    }

    const wildcardListeners = this.listeners.get('*') || [];
    wildcardListeners.forEach(listener => listener(msg));

    return msg;
  }

  /**
   * Register receiver callback listeners.
   */
  public subscribe(
    topic: string,
    callback: (msg: AgentMessage) => void
  ): void {
    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, []);
    }
    this.listeners.get(topic)!.push(callback);
  }

  /**
   * Retrieve message histories.
   */
  public getMessages(): AgentMessage[] {
    return this.messages;
  }

  /**
   * Clears in-memory messages log.
   */
  public clear(): void {
    this.messages = [];
    this.listeners.clear();
  }

  /**
   * Resolves value discrepancies dynamically based on selected consensus method.
   */
  public resolveConflict(
    method: 'reputation' | 'consensus' | 'manual',
    candidates: ConflictCandidate[],
    onManualFallback?: () => Promise<any>
  ): Promise<any> {
    if (candidates.length === 0) {
      return Promise.resolve(undefined);
    }

    if (method === 'reputation') {
      // Find candidate with maximum reputation score
      const sorted = [...candidates].sort((a, b) => b.reputation - a.reputation);
      return Promise.resolve(sorted[0].value);
    }

    if (method === 'consensus') {
      // Count frequencies of values (stringified for comparison)
      const counts = new Map<string, { count: number; candidate: ConflictCandidate }>();
      candidates.forEach(cand => {
        const key = typeof cand.value === 'object' ? JSON.stringify(cand.value) : String(cand.value);
        const item = counts.get(key) || { count: 0, candidate: cand };
        item.count++;
        counts.set(key, item);
      });

      // Find the value with highest count. In case of tie, use reputation as tie breaker
      let maxCount = -1;
      let winner: ConflictCandidate | null = null;

      counts.forEach((entry) => {
        if (entry.count > maxCount) {
          maxCount = entry.count;
          winner = entry.candidate;
        } else if (entry.count === maxCount && winner) {
          if (entry.candidate.reputation > winner.reputation) {
            winner = entry.candidate;
          }
        }
      });

      return Promise.resolve(winner ? winner.value : candidates[0].value);
    }

    if (method === 'manual' && onManualFallback) {
      return onManualFallback();
    }

    // Default fallback
    return Promise.resolve(candidates[0].value);
  }
}
export const mockMessageBus = new AgentMessageBus();

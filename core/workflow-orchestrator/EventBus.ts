import { WorkflowEvent } from './types';

export type WorkflowEventCallback = (event: WorkflowEvent) => void | Promise<void>;

interface Subscriber {
  id: string;
  eventType: string;
  callback: WorkflowEventCallback;
  priority: number;
}

export class WorkflowEventBus {
  private static instance: WorkflowEventBus | null = null;
  private subscribers: Subscriber[] = [];

  private constructor() {}

  public static getInstance(): WorkflowEventBus {
    if (!this.instance) {
      this.instance = new WorkflowEventBus();
    }
    return this.instance;
  }

  public static resetInstance(): void {
    this.instance = null;
  }

  /**
   * Subscribe to a specific event type or wildcard '*'
   */
  public subscribe(
    id: string,
    eventType: string,
    callback: WorkflowEventCallback,
    priority = 0
  ): void {
    // Prevent duplicate subscriptions for the same subscriber id + eventType
    this.unsubscribe(id, eventType);

    this.subscribers.push({
      id,
      eventType,
      callback,
      priority,
    });

    // Keep subscribers sorted in descending order of priority
    this.subscribers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Unsubscribe from events
   */
  public unsubscribe(id: string, eventType: string): void {
    this.subscribers = this.subscribers.filter(
      (sub) => !(sub.id === id && sub.eventType === eventType)
    );
  }

  /**
   * Publish an event to subscribers
   */
  public publish(
    workflowId: string,
    type: string,
    payload: Record<string, unknown> = {},
    taskId?: string
  ): void {
    const event: WorkflowEvent = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      taskId,
      type,
      timestamp: Date.now(),
      payload,
    };

    // Find subscribers matching specific eventType or wildcard '*'
    const matched = this.subscribers.filter(
      (sub) => sub.eventType === type || sub.eventType === '*'
    );

    for (const sub of matched) {
      try {
        const result = sub.callback(event);
        if (result instanceof Promise) {
          result.catch((err) => {
            console.error(`Async event handler error in subscriber ${sub.id} for event ${type}:`, err);
          });
        }
      } catch (err) {
        console.error(`Event handler error in subscriber ${sub.id} for event ${type}:`, err);
      }
    }
  }

  /**
   * Clear all registered listeners (primarily for test cleanup)
   */
  public clearAllListeners(): void {
    this.subscribers = [];
  }
}

import { Workflow, ExecutionContext } from './types';
import { WorkflowPlanner } from './WorkflowPlanner';
import { ExecutionEngine } from './ExecutionEngine';
import { WorkflowRegistry } from './WorkflowRegistry';
import { WorkflowEventBus } from './EventBus';
import { WorkflowMonitor } from './WorkflowMonitor';

export class WorkflowOrchestrator {
  private static instance: WorkflowOrchestrator | null = null;
  private activeWorkflows = new Map<string, Workflow>();
  private engine = new ExecutionEngine();

  private constructor() {}

  public static getInstance(): WorkflowOrchestrator {
    if (!this.instance) {
      this.instance = new WorkflowOrchestrator();
    }
    return this.instance;
  }

  public static resetInstance(): void {
    this.instance = null;
  }

  /**
   * Translates a user-stated goal into a planned workflow.
   */
  public plan(goal: string, context?: Record<string, unknown>): Workflow {
    const wf = WorkflowPlanner.plan(goal, context);
    this.activeWorkflows.set(wf.id, wf);
    return wf;
  }

  /**
   * Executes a planned workflow.
   */
  public async execute(
    workflow: Workflow,
    systemInstances: ExecutionContext['systemInstances'] = {},
    maxConcurrency = Infinity
  ): Promise<void> {
    this.activeWorkflows.set(workflow.id, workflow);
    await this.engine.execute(workflow, systemInstances, maxConcurrency);
  }

  /**
   * Plans and executes a workflow in a single step.
   */
  public async planAndExecute(
    goal: string,
    context?: Record<string, unknown>,
    systemInstances?: ExecutionContext['systemInstances'],
    maxConcurrency?: number
  ): Promise<Workflow> {
    const wf = this.plan(goal, context);
    await this.execute(wf, systemInstances, maxConcurrency);
    return wf;
  }

  /**
   * Retrieves a workflow by its unique ID.
   */
  public getWorkflow(id: string): Workflow | undefined {
    return this.activeWorkflows.get(id);
  }

  /**
   * Retrieves a list of all active workflows.
   */
  public getActiveWorkflows(): Workflow[] {
    return Array.from(this.activeWorkflows.values());
  }

  /**
   * Gets the WorkflowRegistry instance.
   */
  public getRegistry(): WorkflowRegistry {
    return WorkflowRegistry.getInstance();
  }

  /**
   * Gets the EventBus instance.
   */
  public getEventBus(): WorkflowEventBus {
    return WorkflowEventBus.getInstance();
  }

  /**
   * Gets the WorkflowMonitor utility class.
   */
  public getMonitor(): typeof WorkflowMonitor {
    return WorkflowMonitor;
  }
}

import { Workflow, Task, TaskState, ExecutionContext, WorkflowState } from './types';
import { DependencyResolver } from './DependencyResolver';

export class RecoveryManager {
  /**
   * Executes compensating actions for all completed, failed, or running tasks
   * in the reverse topological order of dependencies.
   */
  public static async rollback(
    workflow: Workflow,
    contextBuilder: (taskId: string) => ExecutionContext
  ): Promise<void> {
    workflow.state = WorkflowState.ROLLBACK_IN_PROGRESS;
    
    // Import event bus dynamically
    const { WorkflowEventBus } = await import('./EventBus');
    const evtBus = WorkflowEventBus.getInstance();

    evtBus.publish(workflow.id, 'workflow.rollback.started', {
      workflowName: workflow.name,
      reason: workflow.error || 'Triggered failure recovery',
    });

    const tasks = Array.from(workflow.tasks.values());
    let sortedTasks: Task[] = [];

    try {
      sortedTasks = DependencyResolver.resolve(tasks);
    } catch (e) {
      // Fallback in case resolver fails
      sortedTasks = tasks;
    }

    // Execute compensating rollbacks in reverse topological order
    const reverseOrder = [...sortedTasks].reverse();

    for (const task of reverseOrder) {
      const eligibility = [TaskState.COMPLETED, TaskState.FAILED, TaskState.RUNNING];
      if (eligibility.includes(task.state)) {
        if (task.rollback) {
          const taskCtx = contextBuilder(task.id);
          
          evtBus.publish(
            workflow.id,
            'task.rollback.started',
            { taskId: task.id, taskName: task.name },
            task.id
          );

          try {
            await task.rollback(taskCtx);
            const originalState = task.state;
            task.state = TaskState.ROLLED_BACK;

            if ('addHistory' in workflow && typeof (workflow as any).addHistory === 'function') {
              (workflow as any).addHistory(
                originalState,
                TaskState.ROLLED_BACK,
                `Executed rollback compensating action for task: ${task.name}`,
                task.id,
                'task'
              );
            }

            evtBus.publish(
              workflow.id,
              'task.rollback.completed',
              { taskId: task.id, taskName: task.name },
              task.id
            );
          } catch (rollbackErr: any) {
            console.error(`Compensating rollback action failed for task ${task.id}:`, rollbackErr);
            evtBus.publish(
              workflow.id,
              'task.rollback.failed',
              {
                taskId: task.id,
                taskName: task.name,
                error: rollbackErr.message || String(rollbackErr),
              },
              task.id
            );
          }
        } else {
          // No rollback defined, transition directly to rolled back state
          task.state = TaskState.ROLLED_BACK;
        }
      }
    }

    workflow.state = WorkflowState.ROLLED_BACK;
    evtBus.publish(workflow.id, 'workflow.rollback.completed', {
      workflowName: workflow.name,
    });
  }
}

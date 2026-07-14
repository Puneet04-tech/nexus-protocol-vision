import { Workflow, Task, TaskState } from './types';

export class WorkflowScheduler {
  /**
   * Returns a list of tasks that are ready to run in the current workflow state.
   * A task is ready if its state is PENDING and all dependencies are COMPLETED or SKIPPED.
   * The list is capped by available slots under the maximum concurrency constraint.
   */
  public static getSchedulableTasks(
    workflow: Workflow,
    maxConcurrency = Infinity
  ): Task[] {
    const readyTasks: Task[] = [];

    // Calculate current concurrency count
    const runningCount = Array.from(workflow.tasks.values()).filter(
      (t) => t.state === TaskState.RUNNING
    ).length;

    const availableSlots = maxConcurrency - runningCount;
    if (availableSlots <= 0) {
      return [];
    }

    for (const task of workflow.tasks.values()) {
      if (task.state !== TaskState.PENDING) {
        continue;
      }

      // Check if all dependency tasks are completed or skipped
      let depsSatisfied = true;
      for (const depId of task.dependencies) {
        const depTask = workflow.tasks.get(depId);
        if (
          !depTask ||
          (depTask.state !== TaskState.COMPLETED && depTask.state !== TaskState.SKIPPED)
        ) {
          depsSatisfied = false;
          break;
        }
      }

      if (depsSatisfied) {
        readyTasks.push(task);
      }
    }

    return readyTasks.slice(0, availableSlots);
  }
}

import { Task } from './types';

export class DependencyResolver {
  /**
   * Sorts the tasks topologically. Throws an error if a cycle is detected.
   */
  public static resolve(tasks: Task[]): Task[] {
    const sorted: Task[] = [];
    const visited = new Map<string, 'VISITING' | 'VISITED'>();
    const taskMap = new Map<string, Task>(tasks.map((t) => [t.id, t]));

    const visit = (taskId: string) => {
      const state = visited.get(taskId);
      if (state === 'VISITING') {
        throw new Error(`Cyclic dependency detected at task: ${taskId}`);
      }
      if (state === 'VISITED') {
        return;
      }

      visited.set(taskId, 'VISITING');

      const task = taskMap.get(taskId);
      if (task) {
        for (const depId of task.dependencies) {
          if (!taskMap.has(depId)) {
            throw new Error(`Missing dependency task ID: ${depId} for task: ${taskId}`);
          }
          visit(depId);
        }
      }

      visited.set(taskId, 'VISITED');
      if (task) {
        sorted.push(task);
      }
    };

    for (const task of tasks) {
      visit(task.id);
    }

    return sorted;
  }

  /**
   * Groups tasks into parallelizable execution levels based on their dependency graphs.
   */
  public static groupIntoLevels(tasks: Task[]): Task[][] {
    // Validate dependencies and check for cycles
    const sorted = this.resolve(tasks);
    
    const taskMap = new Map<string, Task>(tasks.map((t) => [t.id, t]));
    const taskLevels = new Map<string, number>();
    
    // Assign levels iteratively in topological order
    for (const task of sorted) {
      let maxDepLevel = -1;
      for (const depId of task.dependencies) {
        const depLevel = taskLevels.get(depId);
        if (depLevel !== undefined && depLevel > maxDepLevel) {
          maxDepLevel = depLevel;
        }
      }
      taskLevels.set(task.id, maxDepLevel + 1);
    }

    // Bucket tasks into their respective levels
    const levels: Task[][] = [];
    for (const [taskId, level] of taskLevels.entries()) {
      const task = taskMap.get(taskId);
      if (task) {
        if (!levels[level]) {
          levels[level] = [];
        }
        levels[level].push(task);
      }
    }

    // Filter out empty arrays and return levels
    return levels.filter((lvl) => lvl && lvl.length > 0);
  }
}

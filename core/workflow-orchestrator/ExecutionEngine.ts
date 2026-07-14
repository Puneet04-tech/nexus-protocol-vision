import { Workflow, Task, TaskState, WorkflowState, ExecutionContext } from './types';
import { WorkflowScheduler } from './WorkflowScheduler';
import { RetryManager } from './RetryManager';
import { RecoveryManager } from './RecoveryManager';
import { WorkflowMonitor } from './WorkflowMonitor';
import { WorkflowEventBus } from './EventBus';
import { DependencyResolver } from './DependencyResolver';

export class ExecutionEngine {
  /**
   * Executes a workflow. Coordinates parallel task execution, parameter resolution,
   * retries, skip propagation, failure rollbacks, and monitors overall telemetry.
   */
  public async execute(
    workflow: Workflow,
    systemInstances: ExecutionContext['systemInstances'],
    maxConcurrency = Infinity
  ): Promise<void> {
    const evtBus = WorkflowEventBus.getInstance();
    
    // 1. Verify DAG validity (cycle check) before starting
    try {
      DependencyResolver.resolve(Array.from(workflow.tasks.values()));
    } catch (err: any) {
      workflow.state = WorkflowState.FAILED;
      workflow.error = `DAG validation failed: ${err.message}`;
      if ('addHistory' in workflow && typeof (workflow as any).addHistory === 'function') {
        (workflow as any).addHistory(
          WorkflowState.PENDING,
          WorkflowState.FAILED,
          workflow.error,
          workflow.id,
          'workflow'
        );
      }
      evtBus.publish(workflow.id, 'workflow.failed', { error: workflow.error });
      throw err;
    }

    workflow.state = WorkflowState.RUNNING;
    workflow.startedAt = Date.now();
    if ('addHistory' in workflow && typeof (workflow as any).addHistory === 'function') {
      (workflow as any).addHistory(
        WorkflowState.PENDING,
        WorkflowState.RUNNING,
        'Workflow execution started',
        workflow.id,
        'workflow'
      );
    }
    evtBus.publish(workflow.id, 'workflow.started', { name: workflow.name, goal: workflow.goal });

    // Store references to resolve task executions
    const taskPromises = new Map<string, Promise<Record<string, unknown>>>();

    // Build context helper functions
    const getTaskResults = (id: string) => {
      const t = workflow.tasks.get(id);
      return t ? t.outputResults : undefined;
    };

    const publishEvent = (type: string, payload: Record<string, unknown>) => {
      evtBus.publish(workflow.id, type, payload);
    };

    const createContext = (
      taskId: string,
      taskName: string,
      inputs: Record<string, unknown>
    ): ExecutionContext => {
      return {
        workflowId: workflow.id,
        taskId,
        taskName,
        workflowContext: workflow.context,
        taskInputs: inputs,
        getTaskResults,
        publishEvent,
        systemInstances,
      };
    };

    // Propagates SKIPPED state to child tasks whose dependencies fail
    const propagateSkips = () => {
      let changed = false;
      for (const t of workflow.tasks.values()) {
        if (t.state === TaskState.PENDING) {
          for (const depId of t.dependencies) {
            const depTask = workflow.tasks.get(depId);
            if (
              depTask &&
              (depTask.state === TaskState.FAILED ||
                depTask.state === TaskState.SKIPPED ||
                depTask.state === TaskState.ROLLED_BACK)
            ) {
              t.state = TaskState.SKIPPED;
              t.error = `Skipped due to dependency failure at task: ${depId}`;
              if ('addHistory' in workflow && typeof (workflow as any).addHistory === 'function') {
                (workflow as any).addHistory(
                  TaskState.PENDING,
                  TaskState.SKIPPED,
                  t.error,
                  t.id,
                  'task'
                );
              }
              evtBus.publish(
                workflow.id,
                'task.skipped',
                { taskId: t.id, taskName: t.name, reason: t.error },
                t.id
              );
              changed = true;
              break;
            }
          }
        }
      }
      if (changed) {
        propagateSkips(); // Recursive resolution
      }
    };

    // Main execution loop
    while (workflow.state === WorkflowState.RUNNING) {
      // Find ready tasks
      const schedulable = WorkflowScheduler.getSchedulableTasks(workflow, maxConcurrency);

      if (schedulable.length === 0) {
        // If no tasks are ready, check if anything is running
        const runningTasks = Array.from(workflow.tasks.values()).filter(
          (t) => t.state === TaskState.RUNNING
        );

        if (runningTasks.length === 0) {
          propagateSkips();
          const pendingTasks = Array.from(workflow.tasks.values()).filter(
            (t) => t.state === TaskState.PENDING
          );

          if (pendingTasks.length > 0) {
            // There's a deadlock or un-schedulable tasks, skip them all
            propagateSkips();
          }
          
          const failedCount = Array.from(workflow.tasks.values()).filter(
            (t) => t.state === TaskState.FAILED
          ).length;

          if (failedCount > 0) {
            workflow.state = WorkflowState.FAILED;
            workflow.error = 'One or more tasks failed';
          } else {
            workflow.state = WorkflowState.COMPLETED;
          }
          break;
        }

        // Wait for one of the running tasks to complete/fail
        await Promise.race(Array.from(taskPromises.values()).map((p) => p.catch(() => {})));
        continue;
      }

      // Spawn schedulable tasks in parallel
      for (const task of schedulable) {
        task.state = TaskState.RUNNING;
        task.startedAt = Date.now();
        if ('addHistory' in workflow && typeof (workflow as any).addHistory === 'function') {
          (workflow as any).addHistory(
            TaskState.PENDING,
            TaskState.RUNNING,
            `Task execution started: ${task.name}`,
            task.id,
            'task'
          );
        }
        evtBus.publish(workflow.id, 'task.started', { taskId: task.id, taskName: task.name }, task.id);

        const taskExecutionPromise = (async () => {
          try {
            // Resolve parameter interpolations (e.g. $.task_id.output_field)
            const resolvedInputs = { ...task.inputParameters };
            for (const key of Object.keys(resolvedInputs)) {
              const val = resolvedInputs[key];
              if (typeof val === 'string' && val.startsWith('$.')) {
                const parts = val.split('.');
                if (parts.length >= 3) {
                  const depTaskId = parts[1];
                  const depField = parts.slice(2).join('.');
                  const depResult = getTaskResults(depTaskId);
                  if (depResult && depField in depResult) {
                    resolvedInputs[key] = depResult[depField];
                  }
                }
              }
            }

            const ctx = createContext(task.id, task.name, resolvedInputs);

            const defaultRetry = {
              policy: 'CONSTANT' as any,
              maxRetries: 0,
              baseDelayMs: 0,
              maxDelayMs: 0,
              jitter: false,
            };

            const retryConfig = task.retryConfig || defaultRetry;

            try {
              const output = await RetryManager.executeWithRetry(
                async () => {
                  if (task.timeoutMs && task.timeoutMs > 0) {
                    return await Promise.race([
                      task.execute(ctx),
                      new Promise<never>((_, reject) =>
                        setTimeout(
                          () => reject(new Error(`Task timeout after ${task.timeoutMs}ms`)),
                          task.timeoutMs
                        )
                      ),
                    ]);
                  }
                  return await task.execute(ctx);
                },
                retryConfig,
                (err, attempt, delayMs) => {
                  task.retriesAttempted = attempt;
                  const retryMsg = `Attempt ${attempt} failed: ${err.message}. Retrying in ${delayMs}ms.`;
                  if ('addHistory' in workflow && typeof (workflow as any).addHistory === 'function') {
                    (workflow as any).addHistory(
                      TaskState.RUNNING,
                      TaskState.RUNNING,
                      retryMsg,
                      task.id,
                      'task'
                    );
                  }
                  evtBus.publish(
                    workflow.id,
                    'task.retry',
                    {
                      taskId: task.id,
                      taskName: task.name,
                      attempt,
                      delayMs,
                      error: err.message,
                    },
                    task.id
                  );
                }
              );

              task.state = TaskState.COMPLETED;
              task.completedAt = Date.now();
              task.outputResults = output;
              if ('addHistory' in workflow && typeof (workflow as any).addHistory === 'function') {
                (workflow as any).addHistory(
                  TaskState.RUNNING,
                  TaskState.COMPLETED,
                  `Task completed successfully: ${task.name}`,
                  task.id,
                  'task'
                );
              }
              evtBus.publish(
                workflow.id,
                'task.completed',
                { taskId: task.id, taskName: task.name, results: output },
                task.id
              );
              return output;
            } catch (err: any) {
              task.state = TaskState.FAILED;
              task.completedAt = Date.now();
              task.error = err.message || String(err);
              if ('addHistory' in workflow && typeof (workflow as any).addHistory === 'function') {
                (workflow as any).addHistory(
                  TaskState.RUNNING,
                  TaskState.FAILED,
                  `Task failed: ${task.error}`,
                  task.id,
                  'task'
                );
              }
              evtBus.publish(
                workflow.id,
                'task.failed',
                { taskId: task.id, taskName: task.name, error: task.error },
                task.id
              );

              // Trigger failure propagation to halt execution loop
              workflow.state = WorkflowState.FAILED;
              workflow.error = `Task ${task.name} failed: ${task.error}`;
              throw err;
            }
          } finally {
            taskPromises.delete(task.id);
          }
        })();

        taskPromises.set(task.id, taskExecutionPromise);
      }
    }

    workflow.completedAt = Date.now();
    const totalDuration = workflow.completedAt - (workflow.startedAt || 0);

    if (workflow.state === WorkflowState.FAILED) {
      if ('addHistory' in workflow && typeof (workflow as any).addHistory === 'function') {
        (workflow as any).addHistory(
          WorkflowState.RUNNING,
          WorkflowState.FAILED,
          `Workflow execution failed: ${workflow.error}`,
          workflow.id,
          'workflow'
        );
      }
      evtBus.publish(workflow.id, 'workflow.failed', {
        error: workflow.error,
        durationMs: totalDuration,
      });

      // Trigger rollback recovery
      const contextBuilder = (tid: string) => {
        const t = workflow.tasks.get(tid)!;
        return createContext(t.id, t.name, t.inputParameters);
      };
      await RecoveryManager.rollback(workflow, contextBuilder);
    } else {
      if ('addHistory' in workflow && typeof (workflow as any).addHistory === 'function') {
        (workflow as any).addHistory(
          WorkflowState.RUNNING,
          WorkflowState.COMPLETED,
          'Workflow execution completed successfully',
          workflow.id,
          'workflow'
        );
      }
      evtBus.publish(workflow.id, 'workflow.completed', { durationMs: totalDuration });
    }

    // Capture telemetry metrics in monitoring singleton
    WorkflowMonitor.recordMetrics(workflow, totalDuration);
  }
}

/** `taskman update-task <id> <status>` adapter. */

import { updateTask } from '../../app/tasks.js';
import { getAppContext } from '../runtime.js';
import { emit } from '../format.js';

export async function updateTaskCommand(
  taskId: string,
  status: string,
  opts: { plan?: string; notes?: string; json?: boolean },
): Promise<void> {
  const result = await updateTask(getAppContext(), { ...opts, taskId, status });
  emit(
    Boolean(opts.json),
    {
      plan_name: result.planName,
      task_id: result.taskId,
      status: result.status,
      finalizable: result.finalizable,
    },
    `${result.taskId} → ${result.status} in ${result.planName}` +
      (result.finalizable ? ' (plan now finalizable)' : ''),
  );
}

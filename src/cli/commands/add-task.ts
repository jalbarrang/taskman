/** `taskman add-task <description>` adapter. */

import { addDeferredTask } from '../../app/tasks.js';
import { getAppContext } from '../runtime.js';
import { emit } from '../format.js';

export async function addTaskCommand(
  description: string,
  opts: { plan?: string; reason?: string; details?: string; json?: boolean },
): Promise<void> {
  const result = await addDeferredTask(getAppContext(), { ...opts, description });
  emit(
    Boolean(opts.json),
    {
      plan_name: result.planName,
      task_id: result.taskId,
      description: result.description,
      status: result.status,
    },
    `Captured follow-up ${result.taskId}: ${result.description} (deferred) in ${result.planName}.`,
  );
}

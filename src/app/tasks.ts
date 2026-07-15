import { appendDeferredTask, setTaskStatus } from "../engine.js";
import type { TaskStatus } from "../types.js";
import type { AppContext } from "./context.js";
import { AppError } from "./errors.js";
import { requirePlan } from "./resolve-plan.js";

const TASK_STATUSES: TaskStatus[] = ["done", "skipped", "blocked", "pending"];

export interface UpdateTaskInput {
  plan?: string;
  taskId: string;
  status: string;
  notes?: string;
}

export interface UpdateTaskResult {
  planName: string;
  taskId: string;
  status: TaskStatus;
  finalizable: boolean;
}

export interface AddTaskInput {
  plan?: string;
  description: string;
  reason?: string;
  details?: string;
  depends_on?: string[];
}

export interface AddTaskResult {
  planName: string;
  taskId: string;
  description: string;
  status: "deferred";
}

function taskStatus(status: string): TaskStatus {
  if (TASK_STATUSES.includes(status as TaskStatus)) return status as TaskStatus;
  throw new AppError(
    "INVALID_INPUT",
    `Invalid status "${status}". Use one of: ${TASK_STATUSES.join(", ")}.`,
    {
      status,
      valid: TASK_STATUSES,
    },
  );
}

export async function updateTask(
  context: AppContext,
  input: UpdateTaskInput,
): Promise<UpdateTaskResult> {
  const status = taskStatus(input.status);
  const { planName, planDir } = await requirePlan(context, input.plan);
  const result = await context.run(setTaskStatus(planDir, input.taskId, status, input.notes));
  return {
    planName,
    taskId: result.task.id,
    status: result.task.status,
    finalizable: result.finalizable,
  };
}

export async function addDeferredTask(
  context: AppContext,
  input: AddTaskInput,
): Promise<AddTaskResult> {
  const reason = input.reason;
  if (!reason)
    throw new AppError("INVALID_INPUT", "--reason is required (why the follow-up matters).");
  const { planName, planDir } = await requirePlan(context, input.plan);
  const task = await context.run(
    appendDeferredTask(planDir, {
      description: input.description,
      reason,
      details: input.details,
      depends_on: input.depends_on,
    }),
  );
  return { planName, taskId: task.id, description: task.description, status: "deferred" };
}

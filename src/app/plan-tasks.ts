import { nextTaskId } from "../ids.js";
import type { TaskRecord } from "../types.js";

export interface CreateTaskInput {
  id?: string;
  description: string;
  details?: string;
  depends_on?: string[];
}

export interface ReviseTaskInput {
  id: string;
  description: string;
  details?: string;
  depends_on?: string[];
}

/** Assign explicit IDs where given, generating sequential IDs for the remainder. */
export function createTaskRecords(inputs: CreateTaskInput[], now: string): TaskRecord[] {
  const ids = inputs.map((task) => task.id).filter((id): id is string => Boolean(id));
  return inputs.map((input) => {
    const id = input.id ?? nextTaskId(ids);
    if (!input.id) ids.push(id);
    return {
      _type: "task",
      id,
      description: input.description.slice(0, 60),
      details: input.details ?? "",
      status: "pending",
      depends_on: input.depends_on,
      created_at: now,
      updated_at: now,
    };
  });
}

/** Merge replacement task inputs while retaining progress for matching task IDs. */
export function mergeRevisedTasks(
  previous: readonly TaskRecord[],
  inputs: ReviseTaskInput[],
  now: string,
): TaskRecord[] {
  const prior = new Map(previous.map((task) => [task.id, task]));
  return inputs.map((input) => {
    const existing = prior.get(input.id);
    return {
      _type: "task",
      id: input.id,
      description: input.description.slice(0, 60),
      details: input.details ?? "",
      status: existing?.status ?? "pending",
      origin: existing?.origin ?? "plan",
      depends_on: input.depends_on,
      notes: existing?.notes,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
  });
}

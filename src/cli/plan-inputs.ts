import type { CreateTaskInput, ReviseTaskInput } from "../app/plan-tasks.js";
import { toKebabCase } from "../ids.js";
import { CliError } from "./runtime.js";

type ParsedTask = Record<string, unknown>;

function taskArray(raw: string, message: string): ParsedTask[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CliError(message);
  }
  if (!Array.isArray(parsed) || parsed.length === 0)
    throw new CliError("--tasks must be a non-empty JSON array.");
  return parsed.map((entry, index) => {
    if (typeof entry !== "object" || entry === null)
      throw new CliError(`Task at index ${index} is not an object.`);
    return entry as ParsedTask;
  });
}

function description(task: ParsedTask, index: number): string {
  if (typeof task.description !== "string" || task.description.trim() === "") {
    throw new CliError(`Task at index ${index} is missing a "description".`);
  }
  return task.description;
}

export function parseCreateTasks(raw: string): CreateTaskInput[] {
  return taskArray(raw, "--tasks must be a JSON array of { description, ... } objects.").map(
    (task, index) => ({
      id: task.id as string | undefined,
      description: description(task, index),
      details: task.details as string | undefined,
      depends_on: task.depends_on as string[] | undefined,
    }),
  );
}

export function parseReviseTasks(raw: string): ReviseTaskInput[] {
  return taskArray(raw, "--tasks must be a JSON array of { id, description, ... } objects.").map(
    (task, index) => {
      if (typeof task.id !== "string" || !task.id.trim())
        throw new CliError(`Task at index ${index} is missing an "id".`);
      return {
        id: task.id,
        description: description(task, index),
        details: typeof task.details === "string" ? task.details : undefined,
        depends_on: Array.isArray(task.depends_on) ? (task.depends_on as string[]) : undefined,
      };
    },
  );
}

export function parseDependsOn(raw: string | undefined): string[] | undefined {
  if (raw === undefined) return undefined;
  return raw
    .split(",")
    .map((value) => toKebabCase(value.trim()))
    .filter(Boolean);
}

/**
 * Shared revise-plan helpers: optional content resolution and task-set merge
 * that preserves status/notes/origin/created_at for unchanged task ids.
 */

import type { TaskRecord } from '../types.js';
import { toKebabCase } from '../ids.js';
import { CliError } from './runtime.js';
import { resolveContent } from './input.js';

export interface ReviseTaskInput {
  id: string;
  description: string;
  details?: string;
  depends_on?: string[];
}

/** Resolve optional inline/file/stdin content; returns undefined when both omitted. */
export async function resolveOptionalContent(
  inline: string | undefined,
  file: string | undefined,
  label: string,
): Promise<string | undefined> {
  if (inline === undefined && file === undefined) return undefined;
  return resolveContent(inline, file, label);
}

/** Parse `--tasks` JSON into a non-empty array of { id, description, ... }. */
export function parseReviseTasks(raw: string): ReviseTaskInput[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CliError('--tasks must be a JSON array of { id, description, ... } objects.');
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new CliError('--tasks must be a non-empty JSON array.');
  }
  return parsed.map((entry, i) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new CliError(`Task at index ${i} is not an object.`);
    }
    const t = entry as Record<string, unknown>;
    if (typeof t.id !== 'string' || !t.id.trim()) {
      throw new CliError(`Task at index ${i} is missing an "id".`);
    }
    if (typeof t.description !== 'string' || !t.description.trim()) {
      throw new CliError(`Task at index ${i} is missing a "description".`);
    }
    return {
      id: t.id,
      description: t.description,
      details: typeof t.details === 'string' ? t.details : undefined,
      depends_on: Array.isArray(t.depends_on) ? (t.depends_on as string[]) : undefined,
    };
  });
}

/** Merge new task inputs over previous tasks, preserving progress for matching ids. */
export function mergeRevisedTasks(
  previous: readonly TaskRecord[],
  inputs: ReviseTaskInput[],
  now: string,
): TaskRecord[] {
  const prior = new Map(previous.map((task) => [task.id, task]));
  return inputs.map((task): TaskRecord => {
    const existing = prior.get(task.id);
    return {
      _type: 'task',
      id: task.id,
      description: task.description.slice(0, 60),
      details: task.details ?? '',
      status: existing?.status ?? 'pending',
      origin: existing?.origin ?? 'plan',
      depends_on: task.depends_on,
      notes: existing?.notes,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
  });
}

/** Parse comma-separated `--depends-on` into kebab plan names (or undefined). */
export function parseDependsOn(raw: string | undefined): string[] | undefined {
  if (raw === undefined) return undefined;
  return raw
    .split(',')
    .map((s) => toKebabCase(s.trim()))
    .filter(Boolean);
}

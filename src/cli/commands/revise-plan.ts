/**
 * `taskman revise-plan` — rewrite an existing plan in place.
 *
 * CLI sibling of plan-mode's `revise_plan`: every content field is optional;
 * omitted title/handoff/tasks are preserved. When `--tasks` is passed the new
 * array fully replaces the task set, but status/notes survive for unchanged ids.
 */

import { toKebabCase } from '../../ids.js';
import { loadPlanData } from '../../resolve.js';
import { runPlanIO, resolvePlanDir, displayPath, CliError } from '../runtime.js';
import { emit } from '../format.js';
import { persistRevisedPlan } from '../persist-revise.js';
import {
  mergeRevisedTasks,
  parseDependsOn,
  parseReviseTasks,
  resolveOptionalContent,
} from '../revise-tasks.js';

export async function revisePlanCommand(opts: {
  plan?: string;
  title?: string;
  handoff?: string;
  handoffFile?: string;
  tasks?: string;
  tasksFile?: string;
  initiative?: string;
  dependsOn?: string;
  json?: boolean;
}): Promise<void> {
  if (!opts.plan?.trim()) {
    throw new CliError('--plan is required so the rewrite never targets an unrelated plan.');
  }

  const { planName, planDir } = await resolvePlanDir(opts.plan);
  const plan = await runPlanIO(loadPlanData(planDir));
  if (!plan) throw new CliError(`No tasks.jsonl found in ${displayPath(planName)}.`);

  const newTitle = opts.title ?? plan.title;
  const newHandoff =
    (await resolveOptionalContent(opts.handoff, opts.handoffFile, 'handoff')) ?? plan.handoff;
  const tasksRaw = await resolveOptionalContent(opts.tasks, opts.tasksFile, 'tasks');
  const now = new Date().toISOString();
  const tasks = tasksRaw
    ? mergeRevisedTasks(plan.tasks, parseReviseTasks(tasksRaw), now)
    : plan.tasks;

  await runPlanIO(
    persistRevisedPlan({
      planDir,
      plan,
      title: newTitle,
      handoff: newHandoff,
      tasks,
      initiative: opts.initiative ? toKebabCase(opts.initiative) : undefined,
      dependsOn: parseDependsOn(opts.dependsOn),
      now,
    }),
  );

  const changed = [
    opts.title !== undefined ? 'title' : undefined,
    opts.handoff !== undefined || opts.handoffFile !== undefined ? 'handoff' : undefined,
    tasksRaw !== undefined ? 'tasks' : undefined,
  ].filter(Boolean);

  emit(
    Boolean(opts.json),
    {
      plan_name: planName,
      plan_dir: displayPath(planName),
      title: newTitle,
      task_count: tasks.length,
      task_ids: tasks.map((t) => t.id),
      changed,
    },
    `Plan "${newTitle}" revised (${changed.join(', ') || 'no changes'}) in ${displayPath(planName)}.`,
  );
}

/** Rewrite an existing plan from CLI-resolved optional content. */

import { revisePlan } from "../../app/revise-plan.js";
import { displayPath, getAppContext, CliError } from "../runtime.js";
import { emit } from "../format.js";
import { resolveOptionalContent } from "../input.js";
import { parseDependsOn, parseReviseTasks } from "../plan-inputs.js";

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
    throw new CliError("--plan is required so the rewrite never targets an unrelated plan.");
  }
  const handoff = await resolveOptionalContent(opts.handoff, opts.handoffFile, "handoff");
  const tasksRaw = await resolveOptionalContent(opts.tasks, opts.tasksFile, "tasks");
  const result = await revisePlan(getAppContext(), {
    plan: opts.plan,
    title: opts.title,
    handoff,
    tasks: tasksRaw === undefined ? undefined : parseReviseTasks(tasksRaw),
    initiative: opts.initiative,
    dependsOnPlans: parseDependsOn(opts.dependsOn),
  });
  emit(
    Boolean(opts.json),
    {
      plan_name: result.planName,
      plan_dir: displayPath(result.planDir),
      title: result.title,
      task_count: result.tasks.length,
      task_ids: result.tasks.map((task) => task.id),
      changed: result.changed,
    },
    `Plan "${result.title}" revised (${result.changed.join(", ") || "no changes"}) in ${displayPath(result.planDir)}.`,
  );
}

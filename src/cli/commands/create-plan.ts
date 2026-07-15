/** Create a plan from CLI-resolved content and structured task input. */

import { createPlan } from "../../app/create-plan.js";
import { displayPath, getAppContext, CliError } from "../runtime.js";
import { resolveContent } from "../input.js";
import { parseCreateTasks, parseDependsOn } from "../plan-inputs.js";
import { emit } from "../format.js";

export async function createPlanCommand(opts: {
  name?: string;
  title?: string;
  handoff?: string;
  handoffFile?: string;
  tasks?: string;
  tasksFile?: string;
  initiative?: string;
  dependsOn?: string;
  json?: boolean;
}): Promise<void> {
  if (!opts.name) throw new CliError("--name is required.");
  if (!opts.title) throw new CliError("--title is required.");
  const handoff = await resolveContent(opts.handoff, opts.handoffFile, "handoff");
  const tasksRaw = await resolveContent(opts.tasks, opts.tasksFile, "tasks");
  const result = await createPlan(getAppContext(), {
    name: opts.name,
    title: opts.title,
    handoff,
    tasks: parseCreateTasks(tasksRaw),
    initiative: opts.initiative,
    dependsOnPlans: opts.dependsOn ? parseDependsOn(opts.dependsOn) : undefined,
  });
  const linkSuffix = result.initiative
    ? ` Linked to initiative "${result.initiative}"${
        result.unknownInitiative
          ? " (no initiatives.jsonl entry yet — create it with submit_initiative)"
          : ""
      }.`
    : "";
  emit(
    Boolean(opts.json),
    {
      plan_name: result.planName,
      plan_dir: displayPath(result.planDir),
      task_count: result.taskIds.length,
      task_ids: result.taskIds,
      initiative: result.initiative ?? null,
      depends_on: result.dependsOnPlans ?? null,
      unknown_initiative: result.unknownInitiative,
    },
    `Plan "${opts.title}" saved with ${result.taskIds.length} tasks in ${displayPath(result.planDir)}.${linkSuffix}`,
  );
}

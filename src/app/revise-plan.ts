import { join } from "node:path";
import { toKebabCase } from "../ids.js";
import { loadPlanData } from "../resolve.js";
import type { TaskRecord } from "../types.js";
import type { AppContext } from "./context.js";
import { AppError } from "./errors.js";
import { mergeRevisedTasks, type ReviseTaskInput } from "./plan-tasks.js";
import { persistRevisedPlan } from "./persist-revise.js";
import { requirePlan } from "./resolve-plan.js";

export interface RevisePlanInput {
  plan: string;
  title?: string;
  handoff?: string;
  tasks?: ReviseTaskInput[];
  initiative?: string;
  dependsOnPlans?: string[];
}

export interface RevisePlanResult {
  planName: string;
  planDir: string;
  title: string;
  tasks: TaskRecord[];
  changed: string[];
}

export async function revisePlan(
  context: AppContext,
  input: RevisePlanInput,
): Promise<RevisePlanResult> {
  const { planName, planDir } = await requirePlan(context, input.plan);
  const plan = await context.run(loadPlanData(planDir));
  if (!plan) {
    throw new AppError(
      "PLAN_NOT_FOUND",
      `No tasks.jsonl found in ${join(context.displayRoot, planName)}.`,
    );
  }
  const now = new Date().toISOString();
  const tasks = input.tasks ? mergeRevisedTasks(plan.tasks, input.tasks, now) : plan.tasks;
  const title = input.title ?? plan.title;
  await context.run(
    persistRevisedPlan({
      planDir,
      plan,
      title,
      handoff: input.handoff ?? plan.handoff,
      tasks,
      initiative: input.initiative ? toKebabCase(input.initiative) : undefined,
      dependsOnPlans: input.dependsOnPlans?.map(toKebabCase).filter(Boolean),
      now,
    }),
  );
  const changed = [
    input.title !== undefined ? "title" : undefined,
    input.handoff !== undefined ? "handoff" : undefined,
    input.tasks !== undefined ? "tasks" : undefined,
  ].filter((value): value is string => value !== undefined);
  return { planName, planDir, title, tasks, changed };
}

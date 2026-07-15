import { join } from "node:path";
import { loadPlanData } from "../resolve.js";
import { isPlanFinalizable } from "../task-status.js";
import type { TaskRecord, TaskStatus } from "../types.js";
import { AppError } from "./errors.js";
import type { AppContext } from "./context.js";
import { requirePlan } from "./resolve-plan.js";

export interface PlanStatusView {
  planName: string;
  title: string;
  tasks: TaskRecord[];
  counts: Record<TaskStatus, number>;
  finalizable: boolean;
  baseCommit?: string;
  handoff?: string;
}

export async function getPlanStatus(
  context: AppContext,
  input: { plan?: string; includeHandoff?: boolean },
): Promise<PlanStatusView> {
  const { planName, planDir } = await requirePlan(context, input.plan);
  const plan = await context.run(loadPlanData(planDir));
  if (!plan) {
    throw new AppError(
      "PLAN_NOT_FOUND",
      `No tasks.jsonl found in ${join(context.displayRoot, planName)}.`,
    );
  }
  const counts: Record<TaskStatus, number> = {
    done: 0,
    skipped: 0,
    blocked: 0,
    pending: 0,
    deferred: 0,
  };
  for (const task of plan.tasks) counts[task.status] += 1;
  return {
    planName: plan.planName,
    title: plan.title,
    tasks: plan.tasks,
    counts,
    finalizable: isPlanFinalizable(plan.tasks),
    baseCommit: plan.base_commit,
    ...(input.includeHandoff ? { handoff: plan.handoff } : {}),
  };
}

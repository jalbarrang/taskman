import { Effect } from "effect";
import { toKebabCase } from "../ids.js";
import { reconcileInitiativeForPlan } from "../initiative.js";
import { readInitiativesManifest } from "../storage/initiatives-manifest.js";
import { saveHandoff } from "../storage/plan-storage.js";
import { upsertPlanEntry } from "../storage/plans-manifest.js";
import { writeTasksJsonl } from "../storage/task-storage.js";
import type { TaskMeta } from "../types.js";
import type { AppContext } from "./context.js";
import { createTaskRecords, type CreateTaskInput } from "./plan-tasks.js";

export interface CreatePlanInput {
  name: string;
  title: string;
  handoff: string;
  tasks: CreateTaskInput[];
  initiative?: string;
  dependsOnPlans?: string[];
}

export interface CreatePlanResult {
  planName: string;
  planDir: string;
  taskIds: string[];
  initiative?: string;
  dependsOnPlans?: string[];
  unknownInitiative: boolean;
}

export async function createPlan(
  context: AppContext,
  input: CreatePlanInput,
): Promise<CreatePlanResult> {
  const planName = toKebabCase(input.name);
  const initiative = input.initiative ? toKebabCase(input.initiative) : undefined;
  const dependsOnPlans = input.dependsOnPlans?.map(toKebabCase).filter(Boolean);
  const now = new Date().toISOString();
  const tasks = createTaskRecords(input.tasks, now);
  const meta: TaskMeta = {
    _type: "meta",
    title: input.title,
    plan_name: planName,
    created_at: now,
  };
  const unknownInitiative = await context.run(
    Effect.gen(function* () {
      yield* writeTasksJsonl(planName, meta, tasks);
      yield* saveHandoff(planName, input.handoff);
      yield* upsertPlanEntry(planName, {
        status: "in-progress",
        title: input.title,
        initiative,
        depends_on: dependsOnPlans,
      });
      yield* reconcileInitiativeForPlan(planName);
      if (!initiative) return false;
      return !(yield* readInitiativesManifest()).some((entry) => entry.name === initiative);
    }),
  );
  return {
    planName,
    planDir: planName,
    taskIds: tasks.map((task) => task.id),
    initiative,
    dependsOnPlans,
    unknownInitiative,
  };
}

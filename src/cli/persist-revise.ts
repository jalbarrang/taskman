/**
 * Persist a revised plan: tasks.jsonl, HANDOFF.md, registry upsert, reconcile.
 */

import { Effect } from 'effect';
import { writeTasksJsonl } from '../storage/task-storage.js';
import { saveHandoff } from '../storage/plan-storage.js';
import {
  readPlansManifest,
  reconcilePlanStatus,
  upsertPlanEntry,
} from '../storage/plans-manifest.js';
import { reconcileInitiativeForPlan, reconcileInitiativeStatus } from '../initiative.js';
import { isPlanFinalizable } from '../task-status.js';
import type { PlanData, TaskMeta, TaskRecord } from '../types.js';
import type { FileSystem } from '../effects/filesystem.js';

export function persistRevisedPlan(args: {
  planDir: string;
  plan: PlanData;
  title: string;
  handoff: string;
  tasks: TaskRecord[];
  initiative?: string;
  dependsOn?: string[];
  now: string;
}): Effect.Effect<void, unknown, FileSystem> {
  const { planDir, plan, title, handoff, tasks, initiative, dependsOn, now } = args;
  const meta: TaskMeta = {
    _type: 'meta',
    title,
    plan_name: plan.planName,
    created_at: plan.tasks[0]?.created_at ?? now,
    base_commit: plan.base_commit,
  };
  return Effect.gen(function* () {
    yield* writeTasksJsonl(planDir, meta, tasks);
    yield* saveHandoff(planDir, handoff);
    const manifest = yield* readPlansManifest();
    const current = manifest.find((entry) => entry.name === plan.planName);
    const oldInitiative = current?.initiative;
    yield* upsertPlanEntry(plan.planName, {
      status: current?.status ?? 'in-progress',
      title,
      initiative,
      depends_on: dependsOn,
    });
    yield* reconcilePlanStatus(plan.planName, isPlanFinalizable(tasks), title);
    yield* reconcileInitiativeForPlan(plan.planName);
    if (initiative && oldInitiative && oldInitiative !== initiative) {
      yield* reconcileInitiativeStatus(oldInitiative);
    }
  });
}

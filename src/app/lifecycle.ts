import { Effect } from 'effect';
import { reconcileInitiativeForPlan } from '../initiative.js';
import { upsertPlanEntry } from '../storage/plans-manifest.js';
import type { PlanStatus } from '../types.js';
import type { AppContext } from './context.js';
import { AppError } from './errors.js';
import { requirePlan } from './resolve-plan.js';

const PLAN_STATUSES: PlanStatus[] = ['done', 'superseded', 'abandoned', 'in-progress'];

export interface ClosePlanInput {
  plan?: string;
  status: string;
  reason?: string;
}

export interface ClosePlanResult {
  planName: string;
  status: PlanStatus;
  reason?: string;
}

function planStatus(status: string): PlanStatus {
  if (PLAN_STATUSES.includes(status as PlanStatus)) return status as PlanStatus;
  throw new AppError('INVALID_INPUT', `Invalid status "${status}". Use one of: ${PLAN_STATUSES.join(', ')}.`, {
    status,
    valid: PLAN_STATUSES,
  });
}

export async function closePlan(
  context: AppContext,
  input: ClosePlanInput,
): Promise<ClosePlanResult> {
  const status = planStatus(input.status);
  const { planName } = await requirePlan(context, input.plan);
  await context.run(
    upsertPlanEntry(planName, { status, reason: input.reason }).pipe(
      Effect.andThen(reconcileInitiativeForPlan(planName)),
    ),
  );
  return { planName, status, reason: input.reason };
}

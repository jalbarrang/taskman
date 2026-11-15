import { Effect } from "effect";
import { reconcileInitiativeForPlan } from "../initiative.js";
import { PLAN_STATES } from "../lifecycle/transitions.js";
import { transitionPlanStatus } from "../storage/plans-manifest.js";
import type { PlanStatus } from "../types.js";
import type { AppContext } from "./context.js";
import { AppError } from "./errors.js";
import { requirePlan } from "./resolve-plan.js";

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
  if ((PLAN_STATES as readonly string[]).includes(status)) return status as PlanStatus;
  throw new AppError(
    "INVALID_INPUT",
    `Invalid status "${status}". Use one of: ${PLAN_STATES.join(", ")}.`,
    {
      status,
      valid: PLAN_STATES,
    },
  );
}

export async function closePlan(
  context: AppContext,
  input: ClosePlanInput,
): Promise<ClosePlanResult> {
  const status = planStatus(input.status);
  const { planName } = await requirePlan(context, input.plan);
  const outcome = await context.run(
    transitionPlanStatus(planName, status, "manual", { reason: input.reason }).pipe(
      Effect.tap(() => reconcileInitiativeForPlan(planName)),
    ),
  );
  if (outcome.kind === "missing") {
    throw new AppError("PLAN_NOT_FOUND", `Plan "${planName}" is not registered.`);
  }
  if (outcome.kind === "rejected") {
    throw new AppError(
      "INVALID_INPUT",
      `Cannot move ${planName} from ${outcome.from} to ${status}. Allowed: ${outcome.allowed.join(", ") || "none"}.`,
      { from: outcome.from, to: status, allowed: outcome.allowed },
    );
  }
  return { planName, status, reason: input.reason };
}

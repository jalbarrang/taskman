import { Effect } from "effect";
import {
  applyInitiativeReconcile,
  applyReconcile,
  collectInitiativeDrift,
  collectPlanDrift,
  type InitiativeDriftRow,
  type PlanDriftRow,
} from "../reconcile.js";
import type { AppContext } from "./context.js";

export interface ReconcileResult {
  planDrift: PlanDriftRow[];
  initiativeDrift: InitiativeDriftRow[];
  applied: { plans: string[]; initiatives: string[] } | null;
}

export async function reconcileLedger(
  context: AppContext,
  input: { apply?: boolean },
): Promise<ReconcileResult> {
  const planRows = await context.run(collectPlanDrift());
  const initiativeRows = await context.run(collectInitiativeDrift());
  const planDrift = planRows.filter((row) => row.drift);
  const initiativeDrift = initiativeRows.filter((row) => row.drift);
  if (!input.apply) return { planDrift, initiativeDrift, applied: null };

  const repairedPlans = await context.run(applyReconcile(planRows).pipe(Effect.orDie));
  const repairedInitiatives = await context.run(
    applyInitiativeReconcile(initiativeRows).pipe(Effect.orDie),
  );
  return {
    planDrift,
    initiativeDrift,
    applied: {
      plans: repairedPlans.map((row) => row.name),
      initiatives: repairedInitiatives.map((row) => row.name),
    },
  };
}

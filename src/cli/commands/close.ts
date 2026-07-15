/**
 * `taskman close <status>` and `taskman close-initiative <status> [name]`.
 *
 * Sets a plan/initiative lifecycle status directly in the registry. Closing a
 * plan re-projects its parent initiative.
 */

import { closePlan } from "../../app/lifecycle.js";
import { upsertInitiativeEntry } from "../../storage/initiatives-manifest.js";
import type { PlanStatus } from "../../types.js";
import { getAppContext, runPlanIO, CliError } from "../runtime.js";
import { emit } from "../format.js";

const VALID: PlanStatus[] = ["done", "superseded", "abandoned", "in-progress"];

function assertStatus(status: string): PlanStatus {
  if (!VALID.includes(status as PlanStatus)) {
    throw new CliError(`Invalid status "${status}". Use one of: ${VALID.join(", ")}.`);
  }
  return status as PlanStatus;
}

export async function closePlanCommand(
  status: string,
  opts: { plan?: string; reason?: string; json?: boolean },
): Promise<void> {
  const result = await closePlan(getAppContext(), { ...opts, status });
  emit(
    Boolean(opts.json),
    { plan_name: result.planName, status: result.status, reason: opts.reason ?? null },
    `Plan ${result.planName} → ${result.status}${opts.reason ? ` (${opts.reason})` : ""}.`,
  );
}

export async function closeInitiativeCommand(
  status: string,
  name: string,
  opts: { reason?: string; json?: boolean },
): Promise<void> {
  const s = assertStatus(status);
  if (!name) throw new CliError("Initiative name is required.");
  await runPlanIO(upsertInitiativeEntry(name, { status: s, reason: opts.reason }));
  emit(
    Boolean(opts.json),
    { initiative: name, status: s, reason: opts.reason ?? null },
    `Initiative ${name} → ${s}${opts.reason ? ` (${opts.reason})` : ""}.`,
  );
}

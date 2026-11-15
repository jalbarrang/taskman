/**
 * `taskman close <status>` and `taskman close-initiative <status> [name]`.
 *
 * Sets a plan/initiative lifecycle status directly in the registry. Closing a
 * plan re-projects its parent initiative.
 */

import { closePlan } from "../../app/lifecycle.js";
import { INITIATIVE_STATES } from "../../lifecycle/transitions.js";
import { transitionInitiativeStatus } from "../../storage/initiatives-manifest.js";
import type { InitiativeStatus } from "../../types.js";
import { getAppContext, runPlanIO, CliError } from "../runtime.js";
import { emit } from "../format.js";

function parseInitiativeStatus(status: string): InitiativeStatus {
  if ((INITIATIVE_STATES as readonly string[]).includes(status)) return status as InitiativeStatus;
  throw new CliError(`Invalid status "${status}". Use one of: ${INITIATIVE_STATES.join(", ")}.`);
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
  const s = parseInitiativeStatus(status);
  if (!name) throw new CliError("Initiative name is required.");
  const outcome = await runPlanIO(
    transitionInitiativeStatus(name, s, "manual", { reason: opts.reason }),
  );
  if (outcome.kind === "missing") {
    throw new CliError(`Initiative "${name}" is not registered.`);
  }
  if (outcome.kind === "rejected") {
    throw new CliError(
      `Cannot move ${name} from ${outcome.from} to ${s}. Allowed: ${outcome.allowed.join(", ") || "none"}.`,
    );
  }
  emit(
    Boolean(opts.json),
    { initiative: name, status: s, reason: opts.reason ?? null },
    `Initiative ${name} → ${s}${opts.reason ? ` (${opts.reason})` : ""}.`,
  );
}

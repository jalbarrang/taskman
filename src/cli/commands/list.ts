/** `taskman list` and `taskman initiatives` adapters. */

import { listLedger } from "../../app/list.js";
import { formatInitiativeList } from "../../listing/initiatives.js";
import { formatPlanList } from "../../listing/plans.js";
import { getAppContext } from "../runtime.js";
import { emit } from "../format.js";

export async function listPlansCommand(opts: {
  status?: string;
  sort?: string;
  json?: boolean;
}): Promise<void> {
  const result = await listLedger(getAppContext(), { kind: "plans", ...opts });
  if (result.kind !== "plans") return;
  emit(Boolean(opts.json), result.items, formatPlanList(result.items, result.filter, result.sort));
}

export async function listInitiativesCommand(opts: {
  status?: string;
  json?: boolean;
}): Promise<void> {
  const result = await listLedger(getAppContext(), { kind: "initiatives", ...opts });
  if (result.kind !== "initiatives") return;
  emit(Boolean(opts.json), result.items, formatInitiativeList(result.items, result.filter));
}

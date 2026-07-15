import {
  filterInitiatives,
  loadInitiativeListItems,
  type InitiativeListItem,
  type StatusFilter as InitiativeFilter,
} from "../listing/initiatives.js";
import {
  filterPlans,
  loadPlanListItems,
  sortPlans,
  type PlanListItem,
  type SortField,
  type StatusFilter as PlanFilter,
} from "../listing/plans.js";
import type { AppContext } from "./context.js";

const STATUSES = ["all", "in-progress", "done", "superseded", "abandoned"];
const SORTS: SortField[] = ["name", "date-asc", "date-desc", "tasks"];
export type ListLedgerInput = { kind: "plans" | "initiatives"; status?: string; sort?: string };
export type PlanListResult = {
  kind: "plans";
  items: PlanListItem[];
  filter: PlanFilter;
  sort: SortField;
};
export type InitiativeListResult = {
  kind: "initiatives";
  items: InitiativeListItem[];
  filter: InitiativeFilter;
};

export async function listLedger(
  context: AppContext,
  input: ListLedgerInput,
): Promise<PlanListResult | InitiativeListResult> {
  const filter = (STATUSES.includes(input.status ?? "") ? input.status : "all") as PlanFilter;
  if (input.kind === "initiatives") {
    const items = await context.run(loadInitiativeListItems());
    return { kind: "initiatives", items: filterInitiatives(items, filter), filter };
  }
  const sort = SORTS.includes(input.sort as SortField) ? (input.sort as SortField) : "date-desc";
  const items = await context.run(loadPlanListItems());
  return { kind: "plans", items: sortPlans(filterPlans(items, filter), sort), filter, sort };
}

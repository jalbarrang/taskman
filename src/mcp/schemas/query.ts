import { z } from "zod";
import { bareName, planStatus, taskRecord } from "./common.js";

export const statusInput = z.object({
  plan: bareName.optional(),
  include_handoff: z.boolean().optional(),
});
export const statusOutput = z.object({
  resolved: z.boolean(),
  ledger: z.object({ root: z.string(), source: z.enum(["default", "taskmanrc"]) }),
  candidates: z.array(z.string()),
  plan: z
    .object({
      name: z.string(),
      title: z.string(),
      base_commit: z.string().optional(),
      handoff: z.string().optional(),
      tasks: z.array(taskRecord),
      counts: z.object({
        done: z.number(),
        skipped: z.number(),
        blocked: z.number(),
        pending: z.number(),
        deferred: z.number(),
      }),
      finalizable: z.boolean(),
    })
    .optional(),
});
export const listInput = z.object({
  kind: z.enum(["plans", "initiatives"]).optional(),
  status: z.union([z.literal("all"), planStatus]).optional(),
  sort: z.enum(["name", "date-asc", "date-desc", "tasks"]).optional(),
});
const planListItem = z.object({
  name: z.string(),
  title: z.string(),
  status: planStatus,
  created_at: z.string(),
  completed_at: z.string().nullable(),
  totalTasks: z.number(),
  doneTasks: z.number(),
  pendingTasks: z.number(),
});

const initiativeListItem = z.object({
  name: z.string(),
  title: z.string(),
  status: planStatus,
  created_at: z.string(),
  totalPlans: z.number(),
  donePlans: z.number(),
  ready: z.number(),
  blocked: z.number(),
});

export const listOutput = z.object({
  kind: z.enum(["plans", "initiatives"]),
  items: z.array(z.union([planListItem, initiativeListItem])),
});

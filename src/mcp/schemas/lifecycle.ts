import { z } from "zod";
import { bareName, planStatus } from "./common.js";

export const closeInput = z.object({
  plan: bareName.optional(),
  status: planStatus,
  reason: z.string().optional(),
});
export const closeOutput = z.object({
  plan_name: z.string(),
  status: planStatus,
  reason: z.string().optional(),
});
export const reconcileInput = z.object({ apply: z.boolean().optional() });

const planDrift = z.object({
  name: z.string(),
  registryStatus: planStatus.optional(),
  title: z.string().optional(),
  derivedStatus: z.enum(["in-progress", "done"]).optional(),
  resolved: z.number().optional(),
  total: z.number().optional(),
  hasTasks: z.boolean(),
  drift: z.enum(["status", "registry-only", "orphan"]).optional(),
  direction: z.enum(["upgrade", "downgrade"]).optional(),
});

const initiativeDrift = z.object({
  name: z.string(),
  registryStatus: planStatus,
  title: z.string(),
  derivedStatus: z.enum(["in-progress", "done"]),
  members: z.number(),
  drift: z.literal("status").optional(),
});

export const reconcileOutput = z.object({
  plan_drift: z.array(planDrift),
  initiative_drift: z.array(initiativeDrift),
  applied: z.object({ plans: z.array(z.string()), initiatives: z.array(z.string()) }).nullable(),
});

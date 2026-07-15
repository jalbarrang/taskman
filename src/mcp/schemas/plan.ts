import { z } from "zod";
import { bareName, reviseTaskInput, taskInput } from "./common.js";

export const createPlanInput = z.object({
  name: bareName,
  title: z.string().min(1),
  handoff: z.string(),
  tasks: z.array(taskInput).min(1),
  initiative: bareName.optional(),
  depends_on_plans: z.array(bareName).optional(),
});
export const createPlanOutput = z.object({
  plan_name: z.string(),
  plan_dir: z.string(),
  task_count: z.number(),
  task_ids: z.array(z.string()),
  initiative: z.string().optional(),
  depends_on: z.array(z.string()).optional(),
  unknown_initiative: z.boolean(),
});
export const revisePlanInput = z.object({
  plan: bareName,
  title: z.string().min(1).optional(),
  handoff: z.string().optional(),
  tasks: z.array(reviseTaskInput).min(1).optional(),
  initiative: bareName.optional(),
  depends_on_plans: z.array(bareName).optional(),
});
export const revisePlanOutput = z.object({
  plan_name: z.string(),
  plan_dir: z.string(),
  title: z.string(),
  task_count: z.number(),
  task_ids: z.array(z.string()),
  changed: z.array(z.string()),
});

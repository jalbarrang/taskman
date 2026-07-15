import { z } from "zod";
import { bareName, description, taskId } from "./common.js";

export const updateTaskInput = z.object({
  plan: bareName.optional(),
  task_id: taskId,
  status: z.enum(["done", "skipped", "blocked", "pending"]),
  notes: z.string().optional(),
});
export const updateTaskOutput = z.object({
  plan_name: z.string(),
  task_id: z.string(),
  status: z.string(),
  finalizable: z.boolean(),
});
export const addTaskInput = z.object({
  plan: bareName.optional(),
  description,
  reason: z.string().min(1),
  details: z.string().optional(),
  depends_on: z.array(taskId).optional(),
});
export const addTaskOutput = z.object({
  plan_name: z.string(),
  task_id: z.string(),
  description: z.string(),
  status: z.literal("deferred"),
});

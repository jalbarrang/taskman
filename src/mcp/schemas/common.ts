import { z } from "zod";

export const bareName = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(60);
export const taskId = z.string().regex(/^t-\d+$/);
export const description = z.string().min(1).max(60);
export const taskInput = z.object({
  id: taskId.optional(),
  description,
  details: z.string().optional(),
  depends_on: z.array(taskId).optional(),
});
export const reviseTaskInput = taskInput.extend({ id: taskId });
export const taskStatus = z.enum(["pending", "done", "skipped", "blocked", "deferred"]);
export const taskRecord = z.object({
  _type: z.literal("task"),
  id: z.string(),
  description: z.string(),
  details: z.string().optional(),
  status: taskStatus,
  origin: z.enum(["plan", "discovered"]).optional(),
  depends_on: z.array(z.string()).optional(),
  notes: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export const planStatus = z.enum(["in-progress", "done", "superseded", "abandoned"]);

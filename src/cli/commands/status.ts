/** `taskman status` adapter. */

import { getPlanStatus } from "../../app/status.js";
import type { TaskStatus } from "../../types.js";
import { getAppContext } from "../runtime.js";
import { STATUS_GLYPH, emit } from "../format.js";

export async function statusCommand(opts: { plan?: string; json?: boolean }): Promise<void> {
  const plan = await getPlanStatus(getAppContext(), { plan: opts.plan });
  const resolved = plan.counts.done + plan.counts.skipped;
  const parts = [
    `done ${plan.counts.done}`,
    `skipped ${plan.counts.skipped}`,
    `pending ${plan.counts.pending}`,
  ];
  if (plan.counts.blocked) parts.push(`blocked ${plan.counts.blocked}`);
  if (plan.counts.deferred) parts.push(`follow-up ${plan.counts.deferred}`);
  const lines = plan.tasks.map(
    (task) => `  ${STATUS_GLYPH[task.status]} ${task.id} [${task.status}] ${task.description}`,
  );
  const human =
    `Plan: ${plan.title} (${plan.planName})\n` +
    `Progress: ${resolved}/${plan.tasks.length} resolved — ${parts.join(", ")}\n` +
    `Tasks:\n${lines.join("\n")}`;
  emit(
    Boolean(opts.json),
    {
      active: true,
      plan_name: plan.planName,
      title: plan.title,
      total: plan.tasks.length,
      counts: plan.counts as Record<TaskStatus, number>,
      task_ids: plan.tasks.map((task) => task.id),
    },
    human,
  );
}

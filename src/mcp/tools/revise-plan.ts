import { revisePlan } from "../../app/revise-plan.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "../context.js";
import { respond } from "../result.js";
import { revisePlanInput, revisePlanOutput } from "../schemas/plan.js";

export function registerRevisePlan(server: McpServer, context: McpContext): void {
  server.registerTool(
    "taskman_revise_plan",
    {
      description: "Revise an existing plan in the bound Taskman ledger.",
      inputSchema: revisePlanInput,
      outputSchema: revisePlanOutput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    (input) =>
      respond(() =>
        context.mutations.run(async () => {
          const result = await revisePlan(context.app, {
            plan: input.plan,
            title: input.title,
            handoff: input.handoff,
            tasks: input.tasks,
            initiative: input.initiative,
            dependsOnPlans: input.depends_on_plans,
          });
          return {
            plan_name: result.planName,
            plan_dir: result.planDir,
            title: result.title,
            task_count: result.tasks.length,
            task_ids: result.tasks.map((task) => task.id),
            changed: result.changed,
          };
        }),
      ),
  );
}

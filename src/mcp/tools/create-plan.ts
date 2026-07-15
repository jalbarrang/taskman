import { createPlan } from "../../app/create-plan.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "../context.js";
import { respond } from "../result.js";
import { createPlanInput, createPlanOutput } from "../schemas/plan.js";

export function registerCreatePlan(server: McpServer, context: McpContext): void {
  server.registerTool(
    "taskman_create_plan",
    {
      description: "Create or replace a plan in the bound Taskman ledger.",
      inputSchema: createPlanInput,
      outputSchema: createPlanOutput,
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
          const result = await createPlan(context.app, {
            name: input.name,
            title: input.title,
            handoff: input.handoff,
            tasks: input.tasks,
            initiative: input.initiative,
            dependsOnPlans: input.depends_on_plans,
          });
          return {
            plan_name: result.planName,
            plan_dir: result.planDir,
            task_count: result.taskIds.length,
            task_ids: result.taskIds,
            initiative: result.initiative,
            depends_on: result.dependsOnPlans,
            unknown_initiative: result.unknownInitiative,
          };
        }),
      ),
  );
}

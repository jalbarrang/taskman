import { addDeferredTask } from "../../app/tasks.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "../context.js";
import { respond } from "../result.js";
import { addTaskInput, addTaskOutput } from "../schemas/task.js";

export function registerAddTask(server: McpServer, context: McpContext): void {
  server.registerTool(
    "taskman_add_task",
    {
      description: "Add a deferred follow-up task to a resolved plan.",
      inputSchema: addTaskInput,
      outputSchema: addTaskOutput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    (input) =>
      respond(() =>
        context.mutations.run(async () => {
          const result = await addDeferredTask(context.app, {
            plan: input.plan,
            description: input.description,
            reason: input.reason,
            details: input.details,
            depends_on: input.depends_on,
          });
          return {
            plan_name: result.planName,
            task_id: result.taskId,
            description: result.description,
            status: result.status,
          };
        }),
      ),
  );
}

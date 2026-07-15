import { updateTask } from "../../app/tasks.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "../context.js";
import { respond } from "../result.js";
import { updateTaskInput, updateTaskOutput } from "../schemas/task.js";

export function registerUpdateTask(server: McpServer, context: McpContext): void {
  server.registerTool(
    "taskman_update_task",
    {
      description: "Update one task in a resolved plan.",
      inputSchema: updateTaskInput,
      outputSchema: updateTaskOutput,
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
          const result = await updateTask(context.app, {
            plan: input.plan,
            taskId: input.task_id,
            status: input.status,
            notes: input.notes,
          });
          return {
            plan_name: result.planName,
            task_id: result.taskId,
            status: result.status,
            finalizable: result.finalizable,
          };
        }),
      ),
  );
}

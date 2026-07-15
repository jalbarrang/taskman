import { closePlan } from "../../app/lifecycle.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "../context.js";
import { respond } from "../result.js";
import { closeInput, closeOutput } from "../schemas/lifecycle.js";

export function registerClose(server: McpServer, context: McpContext): void {
  server.registerTool(
    "taskman_close",
    {
      description: "Set a plan lifecycle status in the bound Taskman ledger.",
      inputSchema: closeInput,
      outputSchema: closeOutput,
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
          const result = await closePlan(context.app, {
            plan: input.plan,
            status: input.status,
            reason: input.reason,
          });
          return { plan_name: result.planName, status: result.status, reason: result.reason };
        }),
      ),
  );
}

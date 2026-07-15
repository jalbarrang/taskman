import { reconcileLedger } from "../../app/reconcile.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "../context.js";
import { respond } from "../result.js";
import { reconcileInput, reconcileOutput } from "../schemas/lifecycle.js";

export function registerReconcile(server: McpServer, context: McpContext): void {
  server.registerTool(
    "taskman_reconcile",
    {
      description: "Inspect or safely apply ledger status projection repairs.",
      inputSchema: reconcileInput,
      outputSchema: reconcileOutput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (input) =>
      respond(() =>
        context.mutations.run(async () => {
          const result = await reconcileLedger(context.app, { apply: input.apply });
          return {
            plan_drift: result.planDrift,
            initiative_drift: result.initiativeDrift,
            applied: result.applied,
          };
        }),
      ),
  );
}
